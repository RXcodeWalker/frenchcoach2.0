// ── Learner model: readers (learner-model §5) ──────────────────────────────────
//
// Pure functions from the model (+ a time) to the shapes the existing readers
// already consume, so coachBrain, deriveAbility and Progress need no new maths:
//   weakestSkills        — the coach's thresholds (mastery < 0.60, confidence > 0.20), top 5
//   coachSkillsView      — CoachInput.skills / weakestSkillIds
//   demandBeliefsView    — EvidenceBeliefSnapshot.demands (deriveAbility reads it)
//   examAreaStanding     — the three 0520 areas, counted attempts only
//   focusStructures      — skill ids → question structures (registry)

import type { DemandBelief, EvidenceDerivedSkillBelief, BeliefTrend } from '../../types/beliefs';
import {
  EXAM_AREAS,
  examAreaNodeId,
  isLanguageSkill,
  isSelectableSkill,
  registryStructuresForSkills,
  skillEntry,
  type ExamAreaKey,
} from './skills';
import { decayFactor } from './update';
import type { LearnerModelState, SkillReading, SkillStat, SyncedSkillModel } from './types';
import type { LearnStructure } from '../learn/demand/types';

/** The reducer's confidence slope: confidence = 1 − 1/(1 + 0.30·W). */
export const CONFIDENCE_SLOPE = 0.3;
/** The coach's weak-skill rule (beliefReducer projectEvidenceBeliefSnapshot). */
export const WEAK_MASTERY = 0.6;
export const WEAK_CONFIDENCE = 0.2;
export const STRONG_MASTERY = 0.8;
export const STRONG_CONFIDENCE = 0.35;
/** Below this decayed weight a skill is "not enough evidence yet" (the reducer's MIN_EVIDENCE_WEIGHT). */
export const MIN_SKILL_WEIGHT = 0.5;
/**
 * An exam area needs this much decayed weight before it steers anything. One
 * counted attempt (weight 1.2) falls below it after ≈ 35 days — the same
 * freshness the coach used for "the latest Exam Sim" (EXAM_RESULT_FRESH_DAYS).
 */
export const EXAM_AREA_MIN_WEIGHT = 0.2;

const round2 = (x: number): number => Math.round(x * 100) / 100;

function allBuckets(model: SyncedSkillModel): Array<Record<string, SkillStat>> {
  const out = Object.values(model.devices ?? {}).map((d) => d.skills);
  if (model.legacy) out.push(model.legacy.skills);
  return out;
}

/** Pure: one skill summed across every bucket and rescaled to `now`. Null when no bucket holds it. */
export function readSkill(model: SyncedSkillModel, skillId: string, now: number): SkillReading | null {
  let s = 0, f = 0, w = 0, a = 0, n = 0, last = 0;
  let recent = '';
  let recentAt = -1;
  let lastMark: number | undefined;
  let lastMax: number | undefined;
  let markAt = -1;
  let found = false;
  for (const skills of allBuckets(model)) {
    const st = skills[skillId];
    if (!st) continue;
    found = true;
    const k = decayFactor(st.t, now);
    s += st.s * k;
    f += st.f * k;
    w += st.w * k;
    a += st.a * k;
    n += st.n;
    last = Math.max(last, st.last);
    // Trend: the bucket that saw this skill most recently (learner-model §4.3).
    if (st.r && st.last > recentAt) {
      recent = st.r;
      recentAt = st.last;
    }
    if (st.lm !== undefined && st.lx !== undefined && st.last > markAt) {
      lastMark = st.lm;
      lastMax = st.lx;
      markAt = st.last;
    }
  }
  if (!found) return null;
  return {
    skillId,
    mastery: (1 + s) / (2 + s + f),
    confidence: 1 - 1 / (1 + w * CONFIDENCE_SLOPE),
    weight: w,
    successWeight: s,
    failureWeight: f,
    avoidanceWeight: a,
    evidenceCount: n,
    lastObservedAt: last > 0 ? last : null,
    recent,
    ...(lastMark !== undefined ? { lastMark, lastMax } : {}),
  };
}

/** Every skill id any bucket holds. */
export function knownSkillIds(model: SyncedSkillModel): string[] {
  const ids = new Set<string>();
  for (const skills of allBuckets(model)) for (const id of Object.keys(skills)) ids.add(id);
  return [...ids].sort();
}

/** Same rule as the reducer's trendFromObservations, over the stored outcome string. */
export function trendOf(recent: string): BeliefTrend {
  if (recent.length < 4) return 'unknown';
  const mid = Math.floor(recent.length / 2);
  const rate = (x: string) => [...x].filter((c) => c === '1').length / x.length;
  const delta = rate(recent.slice(mid)) - rate(recent.slice(0, mid));
  if (delta > 0.2) return 'improving';
  if (delta < -0.2) return 'declining';
  return 'stable';
}

export interface WeakestOptions {
  /** Drop skills no question can be chosen for (pronunciation, fluency). */
  selectableOnly?: boolean;
  limit?: number;
  /** Override the coach's thresholds (Progress uses the same ones; tests may not). */
  masteryBelow?: number;
  confidenceAbove?: number;
}

/**
 * The weakest language skills: rounded mastery < 0.60 and rounded confidence >
 * 0.20, weakest first, top 5 — the coach's rule, on the model's numbers.
 */
export function weakestSkills(model: SyncedSkillModel, now: number, opts: WeakestOptions = {}): string[] {
  const masteryBelow = opts.masteryBelow ?? WEAK_MASTERY;
  const confidenceAbove = opts.confidenceAbove ?? WEAK_CONFIDENCE;
  const rows: { id: string; mastery: number }[] = [];
  for (const id of knownSkillIds(model)) {
    if (!isLanguageSkill(id)) continue;
    if (opts.selectableOnly && !isSelectableSkill(id)) continue;
    const r = readSkill(model, id, now);
    if (!r || r.weight < MIN_SKILL_WEIGHT) continue;
    const mastery = round2(r.mastery);
    if (mastery < masteryBelow && round2(r.confidence) > confidenceAbove) rows.push({ id, mastery });
  }
  return rows
    .sort((x, y) => x.mastery - y.mastery || (x.id < y.id ? -1 : 1))
    .slice(0, opts.limit ?? 5)
    .map((r) => r.id);
}

export interface CoachSkillsView {
  skills: Record<string, EvidenceDerivedSkillBelief>;
  weakestSkillIds: string[];
  strongestSkillIds: string[];
}

/**
 * The CoachInput.skills shape, so decideCoachBrief stays pure and unchanged.
 * No diagnosticEngine fallback entries: a skill with too little evidence is
 * simply absent (the topic-mastery prior has replaced the fallback).
 */
export function coachSkillsView(
  model: SyncedSkillModel,
  now: number,
  labelOf: (id: string) => { label: string; category: string },
): CoachSkillsView {
  const skills: Record<string, EvidenceDerivedSkillBelief> = {};
  for (const id of knownSkillIds(model)) {
    if (!isLanguageSkill(id)) continue;
    const r = readSkill(model, id, now);
    if (!r || r.weight < MIN_SKILL_WEIGHT) continue;
    const { label, category } = labelOf(id);
    const balance = r.weight > 0 ? Math.abs(r.successWeight - r.failureWeight) / r.weight : 0;
    const total = r.avoidanceWeight + r.successWeight + r.failureWeight;
    skills[id] = {
      nodeId: id,
      label,
      category,
      mastery: round2(r.mastery),
      confidence: round2(r.confidence),
      uncertainty: round2(Math.max(0, (1 - r.confidence) * (1 - balance * 0.5))),
      trend: trendOf(r.recent),
      // Share of decayed observations that were avoidance (learner-model §5).
      avoidanceScore: total > 0 ? round2(r.avoidanceWeight / total) : 0,
      evidenceCount: r.evidenceCount,
      weightedEvidence: round2(r.weight),
      reliabilityMean: 0,
      lastObservedAt: r.lastObservedAt !== null ? new Date(r.lastObservedAt).toISOString() : null,
      recurringIssueIds: [],
      sourceBreakdown: {},
    };
  }
  const list = Object.values(skills);
  return {
    skills,
    weakestSkillIds: weakestSkills(model, now),
    strongestSkillIds: list
      .filter((b) => b.mastery >= STRONG_MASTERY && b.confidence > STRONG_CONFIDENCE)
      .sort((x, y) => y.mastery - x.mastery || (x.nodeId < y.nodeId ? -1 : 1))
      .slice(0, 5)
      .map((b) => b.nodeId),
  };
}

/** Same shape as EvidenceBeliefSnapshot.demands — deriveAbility reads it unchanged. */
export function demandBeliefsView(model: SyncedSkillModel, now: number): Record<string, DemandBelief> {
  const out: Record<string, DemandBelief> = {};
  for (const id of knownSkillIds(model)) {
    if (skillEntry(id)?.kind !== 'demand') continue;
    const r = readSkill(model, id, now);
    if (!r || r.evidenceCount === 0) continue;
    out[id] = {
      nodeId: id,
      mastery: round2(r.mastery),
      confidence: round2(r.confidence),
      rawEvidenceCount: r.evidenceCount,
      lastObservedAt: r.lastObservedAt !== null ? new Date(r.lastObservedAt).toISOString() : null,
    };
  }
  return out;
}

export interface ExamAreaReading {
  key: ExamAreaKey;
  /** Decayed share of the marks across counted attempts (0–1). */
  mastery: number;
  confidence: number;
  weight: number;
  /** The latest counted attempt's mark and max for this area. */
  lastMark: number;
  lastMax: number;
  lastAt: number;
}

/** The three 0520 areas, from counted Exam Sim attempts only. An area with too little weight is absent. */
export function examAreaStanding(model: SyncedSkillModel, now: number): ExamAreaReading[] {
  const out: ExamAreaReading[] = [];
  for (const key of EXAM_AREAS) {
    const r = readSkill(model, examAreaNodeId(key), now);
    if (!r || r.weight < EXAM_AREA_MIN_WEIGHT || r.lastMark === undefined || r.lastMax === undefined) continue;
    // Share of marks: the success fraction of the decayed weight (no Beta prior —
    // an area mark is a measured fraction, not a pass/fail count).
    const mastery = r.weight > 0 ? r.successWeight / r.weight : 0;
    out.push({
      key,
      mastery: round2(mastery),
      confidence: round2(r.confidence),
      weight: r.weight,
      lastMark: r.lastMark,
      lastMax: r.lastMax,
      lastAt: r.lastObservedAt ?? 0,
    });
  }
  return out;
}

/** Skill ids → the question structures that practise them (registry view). */
export function focusStructures(skillIds: readonly string[]): LearnStructure[] {
  return registryStructuresForSkills(skillIds);
}

/** The weakest exam area below `ratio`, or null. */
export function weakestExamArea(standing: readonly ExamAreaReading[], ratio: number): ExamAreaReading | null {
  let weakest: ExamAreaReading | null = null;
  for (const a of standing) {
    if (!weakest || a.mastery < weakest.mastery) weakest = a;
  }
  return weakest && weakest.mastery < ratio ? weakest : null;
}

/** Narrow a slice to its synced part (for readers that take either). */
export function asSynced(model: LearnerModelState | SyncedSkillModel): SyncedSkillModel {
  return { version: model.version, devices: model.devices, legacy: model.legacy };
}
