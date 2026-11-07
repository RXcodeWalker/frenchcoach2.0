// ── Learner model: the update (learner-model §2, §3) ───────────────────────────
//
// Decayed Beta–Bernoulli per skill, kept as sufficient statistics. One
// observation adds its base weight (already gated) to the skill's success /
// failure / evidence / avoidance sums, expressed at the stat's reference time.
// Order does not matter: an observation older than the reference time is
// added pre-decayed, a newer one first moves the reference time forward.
//
// Pure: no storage, no Date.now() (callers pass times), no React.

import type { ExamAreaMarks } from '../../types';
import { EXAM_AREAS, examAreaNodeId, isRegisteredSkill, type ExamAreaKey } from './skills';
import {
  LEARNER_MODEL_VERSION,
  type DeviceBucket,
  type LearnerModelState,
  type SkillObservation,
  type SkillStat,
  type SkillStats,
} from './types';

export const DAY_MS = 86_400_000;
/** Same half-life as the evidence reducer (beliefReducer.ts HALF_LIFE_DAYS). */
export const HALF_LIFE_DAYS = 14;
export const LAMBDA = Math.log(2) / HALF_LIFE_DAYS;
/** Trend window, same as the reducer's RECENT_OBS_WINDOW. */
export const RECENT_WINDOW = 20;
/** Bounded idempotency set (local only). Comfortably above the 150-event log so a replay can never double count. */
export const MAX_SEEN_IDS = 600;
/**
 * learner-model §3: a counted Exam Sim attempt counts as an effective n of 2
 * answers per area, times the reducer's exam source weight (0.6). UNVALIDATED.
 */
export const EXAM_EFFECTIVE_N = 2;
export const EXAM_SOURCE_WEIGHT = 0.6;
export const EXAM_OBSERVATION_WEIGHT = EXAM_EFFECTIVE_N * EXAM_SOURCE_WEIGHT;

/** exp(-λ · days), never above 1 (a time in the future counts at full weight, as the reducer does). */
export function decayFactor(fromMs: number, toMs: number): number {
  const days = (toMs - fromMs) / DAY_MS;
  return Math.exp(-LAMBDA * Math.max(0, days));
}

export function emptyStat(t: number): SkillStat {
  return { s: 0, f: 0, w: 0, a: 0, n: 0, t, last: 0, r: '' };
}

/** The stat rescaled to a later reference time (an earlier `t` is left as is). */
export function decayStat(stat: SkillStat, toMs: number): SkillStat {
  if (toMs <= stat.t) return stat;
  const k = decayFactor(stat.t, toMs);
  return { ...stat, s: stat.s * k, f: stat.f * k, w: stat.w * k, a: stat.a * k, t: toMs };
}

/** Pure: one observation folded into one skill's stat. */
export function applyToStat(stat: SkillStat | undefined, obs: SkillObservation): SkillStat {
  const base = stat ?? emptyStat(obs.at);
  // Bring the reference time forward when the observation is newer; otherwise
  // add the observation already decayed to the existing reference time.
  const moved = obs.at > base.t ? decayStat(base, obs.at) : base;
  const k = decayFactor(obs.at, moved.t);
  const w = obs.weight * k;
  const next: SkillStat = { ...moved, last: Math.max(moved.last, obs.at) };
  if (obs.kind === 'avoidance') {
    next.a += w;
    return next;
  }
  next.n += 1;
  next.w += w;
  if (obs.success !== undefined) {
    const p = Math.min(1, Math.max(0, obs.success));
    next.s += w * p;
    next.f += w * (1 - p);
    // Trend keeps chronological order only for in-order observations (the
    // normal case); an out-of-order one is appended, which only blurs a trend.
    next.r = `${next.r}${p >= 0.5 ? '1' : '0'}`.slice(-RECENT_WINDOW);
  }
  if (obs.mark !== undefined && obs.max !== undefined && obs.at >= (stat?.last ?? 0)) {
    next.lm = obs.mark;
    next.lx = obs.max;
  }
  return next;
}

/** Pure: fold observations into a set of stats (unregistered skill ids are ignored). */
export function applyToStats(stats: SkillStats, observations: readonly SkillObservation[]): SkillStats {
  const out: SkillStats = { ...stats };
  for (const obs of [...observations].sort((x, y) => x.at - y.at)) {
    for (const id of new Set(obs.skillIds)) {
      if (!isRegisteredSkill(id)) continue;
      out[id] = applyToStat(out[id], obs);
    }
  }
  return out;
}

export function emptyModel(deviceId: string): LearnerModelState {
  return { version: LEARNER_MODEL_VERSION, deviceId, devices: {}, legacy: null, seen: [] };
}

/**
 * RECORD_SKILL_OBSERVATIONS: fold new observations into THIS device's bucket.
 * Idempotent by observation id (bounded seen-set). Returns the same object when
 * nothing new arrived, so the reducer can skip a storage write.
 */
export function applyObservations(
  model: LearnerModelState,
  observations: readonly SkillObservation[],
  now: number,
): LearnerModelState {
  const seen = new Set(model.seen);
  const fresh: SkillObservation[] = [];
  for (const obs of observations) {
    if (seen.has(obs.id)) continue;
    if (!(obs.weight > 0) || !Number.isFinite(obs.weight) || !Number.isFinite(obs.at)) continue;
    seen.add(obs.id);
    fresh.push(obs);
  }
  if (fresh.length === 0) return model;
  const own: DeviceBucket = model.devices[model.deviceId] ?? { updatedAt: 0, skills: {} };
  const skills = applyToStats(own.skills, fresh);
  return {
    ...model,
    devices: { ...model.devices, [model.deviceId]: { updatedAt: Math.max(now, own.updatedAt + 1), skills } },
    seen: [...model.seen, ...fresh.map((o) => o.id)].slice(-MAX_SEEN_IDS),
  };
}

// ── Exam ingest (learner-model §3, §6) ──────────────────────────────────────

export interface CountedExamInput {
  sessionId: string;
  /** ISO time of the attempt. */
  date: string;
  mode: string;
  practiceOnly?: boolean;
  marks?: Readonly<ExamAreaMarks>;
}

const AREA_MAX: Record<ExamAreaKey, (m: Readonly<ExamAreaMarks>) => number> = {
  rolePlay: (m) => m.rolePlayMax,
  communication: () => 15,
  qualityOfLanguage: () => 15,
};

const AREA_MARK: Record<ExamAreaKey, (m: Readonly<ExamAreaMarks>) => number> = {
  rolePlay: (m) => m.rolePlay,
  communication: (m) => m.communication,
  qualityOfLanguage: (m) => m.qualityOfLanguage,
};

/**
 * Pure: the exam-area observations one session gives. Only a counted Exam Sim
 * attempt with area marks (ADR 0007: `mode === 'exam' && !practiceOnly &&
 * examMarks`) gives any; Coached, typed, resumed and early-start attempts give
 * none. The marks are read, never written: the input is Readonly and the
 * output is model observations only.
 */
export function examObservations(session: CountedExamInput): SkillObservation[] {
  // Same rule as progressSummary.examSummary: only an explicit practiceOnly drops it.
  if (session.mode !== 'exam' || session.practiceOnly === true) return [];
  const marks = session.marks;
  if (!marks) return [];
  const at = Date.parse(session.date);
  if (!Number.isFinite(at)) return [];
  const out: SkillObservation[] = [];
  for (const area of EXAM_AREAS) {
    const max = AREA_MAX[area](marks);
    const mark = AREA_MARK[area](marks);
    if (!(max > 0) || !Number.isFinite(mark)) continue;
    out.push({
      id: `exam:${session.sessionId}:${area}`,
      skillIds: [examAreaNodeId(area)],
      at,
      kind: 'outcome',
      success: Math.min(1, Math.max(0, mark / max)),
      weight: EXAM_OBSERVATION_WEIGHT,
      mark,
      max,
    });
  }
  return out;
}
