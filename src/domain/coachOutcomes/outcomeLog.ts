// ── Coach recommendation outcome log (pure) ──────────────────────────────────────
//
// Did the coach's advice get taken, and did it help? Each time Home shows a coach
// move, the log keeps one *episode*: the move, its target, the evidence it cited
// (the baseline), when it was shown; then whether the learner followed it (did
// the suggested activity within FOLLOW_WINDOW_MS of first seeing it) and the
// outcome (the same metric read again once there is enough new evidence).
//
//   move kind          target       metric (baseline → outcome)
//   fix_mistake        skill        skill mastery, after 3 more observations of the skill
//   weak_skill         skill        skill mastery, after 3 more observations of the skill
//   develop_answers    exam area    Communication mark, at the next counted Exam Sim
//   role_play (weak)   exam area    Role-play mark, at the next counted Exam Sim
//   two_part_answers,
//   coached_exam       exam area    that area's mark, at the next counted Exam Sim
//   exam_sim           exam         total /40, at the next counted Exam Sim
//   review / new_topic topic        topic average /10, after 3 more sessions in the topic
//   keep_going         topic        topic average /10, after 3 more sessions in the topic
//   first_steps,
//   role_play (other)  none         no metric (follow-through only)
//
// The outcome is measured for ignored moves too (the comparison group), but
// only a followed episode keeps absorbing later shows of the same move.
//
// Pure: no storage, no clock, no React. Reads marks the learner has already
// seen; never produces or changes one. Holds ids and numbers only — never a
// transcript, question text or the coach's sentence.

import type { CoachExamAreaKey, CoachMoveEvidence, CoachMoveKind } from './types';

export const COACH_OUTCOME_LOG_VERSION = 1;
/** The learner "followed" a move if they did its activity within this long of first seeing it. */
export const FOLLOW_WINDOW_MS = 48 * 3_600_000;
/** New observations (skill) or sessions (topic) needed before the metric is read again. */
export const OUTCOME_AFTER_ANSWERS = 3;
/** An outcome not measurable within this long of the show is given up as `unmeasured`. */
export const OUTCOME_HORIZON_MS = 28 * 86_400_000;
/** Re-renders closer together than this are one show, not several. */
export const SHOW_DEBOUNCE_MS = 30 * 60_000;
/** Oldest episodes are dropped past this many. */
export const MAX_OUTCOME_ENTRIES = 200;

// ── Types ─────────────────────────────────────────────────────────────────────

/** What a move is aimed at. */
export type MoveTarget =
  | { type: 'skill'; skillId: string }
  | { type: 'exam_area'; area: CoachExamAreaKey }
  | { type: 'exam' }
  | { type: 'topic'; topicKey: string }
  | { type: 'none' };

/** What doing the move means: an answer in Learn (in `topicKey`, or anywhere when null), a counted Exam Sim, a Coached (non-counting) exam, or a role-play drill answer. */
export type MoveActivity =
  | { type: 'learn'; topicKey: string | null }
  | { type: 'exam_sim' }
  | { type: 'coached_exam' }
  | { type: 'role_play' };

/** The metric at the time of the show. */
export type OutcomeBaseline =
  | { type: 'skill_mastery'; skillId: string; value: number; evidenceCount: number }
  | { type: 'exam_area'; area: CoachExamAreaKey; mark: number; max: number }
  | { type: 'exam_total'; value: number | null }
  | { type: 'topic_average'; topicKey: string; value: number | null; sessions: number };

export type FollowState =
  | { status: 'pending' }
  | { status: 'followed'; at: string; sessionId: string }
  | { status: 'not_followed' };

export type OutcomeState =
  | { status: 'pending' }
  | { status: 'no_metric' }
  | { status: 'unmeasured' }
  | {
      status: 'measured';
      measuredAt: string;
      value: number | null;
      /** value − baseline (marks for an exam area of the same max; share 0–1 for mastery; /10 for a topic). Null without a baseline. */
      delta: number | null;
      /** Observations (skill) or sessions (topic) since the show when it was read; 1 for an exam. */
      answersSince: number;
      /** The exam attempt the outcome was read from. */
      sessionId?: string;
    };

export interface CoachOutcomeEntry {
  id: string;
  kind: CoachMoveKind;
  target: MoveTarget;
  activity: MoveActivity;
  evidence: CoachMoveEvidence;
  baseline: OutcomeBaseline | null;
  /** First show of this episode (ISO). */
  shownAt: string;
  /** Latest counted show (ISO). */
  lastShownAt: string;
  shows: number;
  follow: FollowState;
  outcome: OutcomeState;
}

export interface CoachOutcomeLog {
  v: typeof COACH_OUTCOME_LOG_VERSION;
  entries: CoachOutcomeEntry[];
}

/** The parts of a coach move the log needs (services/coach/coachBrain.ts CoachMove satisfies it). */
export interface ShownMove {
  kind: CoachMoveKind;
  topicKey: string | null;
  skillIds: string[];
  evidence: CoachMoveEvidence;
}

/** One stored session, reduced to what follow/outcome detection reads. */
export interface OutcomeSession {
  id: string;
  date: string;
  mode: string;
  topicKey: string | null;
  practiceOnly?: boolean;
  /** Out of 40 for an exam attempt with a real mark, else null. */
  examTotal: number | null;
  examMarks?: { rolePlay: number; rolePlayMax: number; communication: number; qualityOfLanguage: number };
}

/** Everything the log reads to settle follows and outcomes, at one moment. */
export interface OutcomeObservation {
  now: number;
  sessions: OutcomeSession[];
  skills: Record<string, { mastery: number; evidenceCount: number }>;
  topicStats: Record<string, { sessionsCompleted: number; averageScore: number | null }>;
}

export function emptyOutcomeLog(): CoachOutcomeLog {
  return { v: COACH_OUTCOME_LOG_VERSION, entries: [] };
}

// ── Classifying a move ────────────────────────────────────────────────────────

export function moveTarget(move: ShownMove): MoveTarget {
  switch (move.kind) {
    case 'fix_mistake':
    case 'weak_skill':
      return move.skillIds[0] ? { type: 'skill', skillId: move.skillIds[0] } : { type: 'none' };
    case 'develop_answers':
    case 'role_play':
    case 'two_part_answers':
    case 'coached_exam':
      return move.evidence.examArea ? { type: 'exam_area', area: move.evidence.examArea.key } : { type: 'none' };
    case 'exam_sim':
      return { type: 'exam' };
    case 'review':
    case 'new_topic':
    case 'keep_going':
      return move.topicKey ? { type: 'topic', topicKey: move.topicKey } : { type: 'none' };
    case 'first_steps':
      return { type: 'none' };
  }
}

const ACTIVITY: Record<CoachMoveKind, 'learn' | 'exam_sim' | 'coached_exam' | 'role_play'> = {
  first_steps: 'learn',
  fix_mistake: 'learn',
  exam_sim: 'exam_sim',
  role_play: 'role_play',
  two_part_answers: 'learn',
  coached_exam: 'coached_exam',
  develop_answers: 'learn',
  weak_skill: 'learn',
  review: 'learn',
  new_topic: 'learn',
  keep_going: 'learn',
};

export function moveActivity(move: ShownMove): MoveActivity {
  const a = ACTIVITY[move.kind];
  return a === 'learn' ? { type: 'learn', topicKey: move.topicKey } : { type: a };
}

function targetKey(t: MoveTarget): string {
  switch (t.type) {
    case 'skill': return `skill:${t.skillId}`;
    case 'exam_area': return `area:${t.area}`;
    case 'topic': return `topic:${t.topicKey}`;
    default: return t.type;
  }
}

/** The metric's value at the show, from the evidence the move cited. Null = nothing to measure. */
export function moveBaseline(move: ShownMove, target: MoveTarget = moveTarget(move)): OutcomeBaseline | null {
  const ev = move.evidence;
  switch (target.type) {
    case 'skill':
      return ev.skill && ev.skill.mastery !== null && ev.skill.evidenceCount !== null
        ? { type: 'skill_mastery', skillId: target.skillId, value: ev.skill.mastery, evidenceCount: ev.skill.evidenceCount }
        : null;
    case 'exam_area':
      return ev.examArea ? { type: 'exam_area', area: target.area, mark: ev.examArea.mark, max: ev.examArea.max } : null;
    case 'exam':
      return { type: 'exam_total', value: ev.examTotal ?? null };
    case 'topic':
      return ev.topic
        ? { type: 'topic_average', topicKey: target.topicKey, value: ev.topic.averageScore, sessions: ev.topic.sessionsCompleted }
        : null;
    default:
      return null;
  }
}

// ── Settling follows and outcomes ─────────────────────────────────────────────

function time(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function isCountedExam(s: OutcomeSession): boolean {
  return s.mode === 'exam' && !s.practiceOnly;
}

/** Does this session count as doing the activity? */
export function sessionMatchesActivity(s: OutcomeSession, a: MoveActivity): boolean {
  switch (a.type) {
    case 'learn':
      return s.mode === 'practice' && (a.topicKey === null || s.topicKey === a.topicKey);
    case 'exam_sim':
      return isCountedExam(s);
    case 'coached_exam':
      return s.mode === 'exam' && s.practiceOnly === true;
    case 'role_play':
      return s.mode === 'story';
  }
}

/** Sessions strictly after `fromMs`, oldest first. */
function sessionsAfter(sessions: OutcomeSession[], fromMs: number): OutcomeSession[] {
  return sessions
    .filter(s => time(s.date) > fromMs)
    .sort((a, b) => time(a.date) - time(b.date));
}

function settleFollow(e: CoachOutcomeEntry, obs: OutcomeObservation): FollowState {
  if (e.follow.status !== 'pending') return e.follow;
  const shown = time(e.shownAt);
  const deadline = shown + FOLLOW_WINDOW_MS;
  const hit = sessionsAfter(obs.sessions, shown).find(s => time(s.date) <= deadline && sessionMatchesActivity(s, e.activity));
  if (hit) return { status: 'followed', at: hit.date, sessionId: hit.id };
  return obs.now > deadline ? { status: 'not_followed' } : e.follow;
}

function areaMark(m: NonNullable<OutcomeSession['examMarks']>, area: CoachExamAreaKey): { mark: number; max: number } {
  if (area === 'rolePlay') return { mark: m.rolePlay, max: m.rolePlayMax };
  return { mark: area === 'communication' ? m.communication : m.qualityOfLanguage, max: 15 };
}

const round3 = (x: number): number => Math.round(x * 1000) / 1000;

function measure(e: CoachOutcomeEntry, obs: OutcomeObservation): OutcomeState | null {
  const b = e.baseline;
  if (!b) return null;
  const nowIso = new Date(obs.now).toISOString();
  switch (b.type) {
    case 'skill_mastery': {
      const cur = obs.skills[b.skillId];
      if (!cur) return null;
      const since = cur.evidenceCount - b.evidenceCount;
      if (since < OUTCOME_AFTER_ANSWERS) return null;
      return { status: 'measured', measuredAt: nowIso, value: round3(cur.mastery), delta: round3(cur.mastery - b.value), answersSince: since };
    }
    case 'topic_average': {
      const cur = obs.topicStats[b.topicKey];
      if (!cur) return null;
      const since = cur.sessionsCompleted - b.sessions;
      if (since < OUTCOME_AFTER_ANSWERS) return null;
      const value = cur.averageScore;
      return {
        status: 'measured', measuredAt: nowIso, value: value === null ? null : round3(value),
        delta: value === null || b.value === null ? null : round3(value - b.value), answersSince: since,
      };
    }
    case 'exam_area': {
      const next = sessionsAfter(obs.sessions, time(e.shownAt)).find(s => isCountedExam(s) && s.examMarks);
      if (!next?.examMarks) return null;
      const { mark, max } = areaMark(next.examMarks, b.area);
      return {
        status: 'measured', measuredAt: nowIso, value: mark,
        delta: max === b.max ? mark - b.mark : null, answersSince: 1, sessionId: next.id,
      };
    }
    case 'exam_total': {
      const next = sessionsAfter(obs.sessions, time(e.shownAt)).find(s => isCountedExam(s) && s.examTotal !== null);
      if (!next || next.examTotal === null) return null;
      return {
        status: 'measured', measuredAt: nowIso, value: next.examTotal,
        delta: b.value === null ? null : next.examTotal - b.value, answersSince: 1, sessionId: next.id,
      };
    }
  }
}

function settleOutcome(e: CoachOutcomeEntry, obs: OutcomeObservation): OutcomeState {
  if (e.outcome.status !== 'pending') return e.outcome;
  if (!e.baseline) return { status: 'no_metric' };
  const m = measure(e, obs);
  if (m) return m;
  return obs.now - time(e.shownAt) > OUTCOME_HORIZON_MS ? { status: 'unmeasured' } : e.outcome;
}

/** Settle every pending follow and outcome against what is on record now. */
export function updateOutcomes(log: CoachOutcomeLog, obs: OutcomeObservation): CoachOutcomeLog {
  let changed = false;
  const entries = log.entries.map(e => {
    const follow = settleFollow(e, obs);
    const outcome = settleOutcome(e, obs);
    if (follow === e.follow && outcome === e.outcome) return e;
    changed = true;
    return { ...e, follow, outcome };
  });
  return changed ? { ...log, entries } : log;
}

// ── Recording a show ──────────────────────────────────────────────────────────

/** An episode still taking shows: awaiting its follow, or followed and awaiting its outcome. */
function isOpen(e: CoachOutcomeEntry): boolean {
  return e.follow.status === 'pending' || (e.follow.status === 'followed' && e.outcome.status === 'pending');
}

/**
 * Note that `move` is on Home now. A show of the same kind and target as an
 * open episode is that episode again (counted once per SHOW_DEBOUNCE_MS);
 * otherwise a new episode starts with this show's evidence as its baseline.
 */
export function recordShown(log: CoachOutcomeLog, move: ShownMove, now: number): CoachOutcomeLog {
  const target = moveTarget(move);
  const key = `${move.kind}|${targetKey(target)}`;
  const nowIso = new Date(now).toISOString();
  const openIdx = log.entries.findIndex(e => isOpen(e) && `${e.kind}|${targetKey(e.target)}` === key);
  if (openIdx >= 0) {
    const e = log.entries[openIdx];
    if (now - time(e.lastShownAt) < SHOW_DEBOUNCE_MS) return log;
    const entries = log.entries.slice();
    entries[openIdx] = { ...e, lastShownAt: nowIso, shows: e.shows + 1 };
    return { ...log, entries };
  }
  const baseline = moveBaseline(move, target);
  const entry: CoachOutcomeEntry = {
    id: `${nowIso}|${key}`,
    kind: move.kind,
    target,
    activity: moveActivity(move),
    evidence: move.evidence,
    baseline,
    shownAt: nowIso,
    lastShownAt: nowIso,
    shows: 1,
    follow: { status: 'pending' },
    outcome: baseline ? { status: 'pending' } : { status: 'no_metric' },
  };
  const entries = [...log.entries, entry];
  return { ...log, entries: entries.length > MAX_OUTCOME_ENTRIES ? entries.slice(-MAX_OUTCOME_ENTRIES) : entries };
}

/** One Home show: settle what is on record first, then note the move (so a just-followed episode is closed before it could absorb this show). */
export function stepOutcomeLog(log: CoachOutcomeLog, move: ShownMove | null, obs: OutcomeObservation): CoachOutcomeLog {
  const settled = updateOutcomes(log, obs);
  return move ? recordShown(settled, move, obs.now) : settled;
}

// ── Reading a stored log ──────────────────────────────────────────────────────

function isEntry(x: unknown): x is CoachOutcomeEntry {
  if (!x || typeof x !== 'object') return false;
  const e = x as Partial<CoachOutcomeEntry>;
  return typeof e.id === 'string' && typeof e.kind === 'string' && typeof e.shownAt === 'string'
    && typeof e.lastShownAt === 'string' && typeof e.shows === 'number'
    && !!e.target && !!e.activity && !!e.follow && !!e.outcome && typeof e.evidence === 'object';
}

/** A stored value back into a log; anything unreadable or of another version is an empty log. */
export function parseOutcomeLog(raw: unknown): CoachOutcomeLog {
  if (!raw || typeof raw !== 'object') return emptyOutcomeLog();
  const r = raw as { v?: unknown; entries?: unknown };
  if (r.v !== COACH_OUTCOME_LOG_VERSION || !Array.isArray(r.entries)) return emptyOutcomeLog();
  return { v: COACH_OUTCOME_LOG_VERSION, entries: r.entries.filter(isEntry).slice(-MAX_OUTCOME_ENTRIES) };
}
