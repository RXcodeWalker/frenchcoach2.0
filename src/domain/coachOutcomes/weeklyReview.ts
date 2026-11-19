// ── The weekly review (pure) ─────────────────────────────────────────────────────
//
// Once per local week, Home looks back at the week that just ended (Monday to
// Sunday, the learner's own days — lib/localDay.ts) and says four things:
//
//   planned   what the coach put on Home that week (its outcome-log episodes) and
//             whether each was followed
//   done      what the learner actually did (counts of stored sessions)
//   changed   what measurably moved: only outcomes the log MEASURED that week,
//             shown as the baseline and the new value it read — real numbers only
//   next      next week's focus, from the coach's week plan (never a new opinion)
//
// There is no prediction here and no invented number: every figure is copied from
// a session count, an outcome-log baseline or an outcome the log measured. Never a
// grade, never a trend claim (a "change" is two numbers, not a verdict), never a
// mark. Pure: no storage, no clock, no React. Holds labels and numbers only — no
// transcript, question text or coach sentence.

import { localDayBefore, localDayOf } from '../../lib/localDay';
import type { CoachExamAreaKey, CoachMoveKind } from './types';
import type { CoachOutcomeEntry, CoachOutcomeLog, OutcomeSession } from './outcomeLog';

export const WEEKLY_REVIEW_VERSION = 2;
/** Most planned items and changes the review lists. */
export const MAX_REVIEW_ITEMS = 5;

// ── Weeks ─────────────────────────────────────────────────────────────────────

/** The Monday (local YYYY-MM-DD) of the local week that contains `date`. */
export function localWeekStart(date: Date = new Date()): string {
  const back = (date.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  return localDayBefore(back, date);
}

/** The week just ended: Monday to Sunday before the week that contains `date`. */
export function previousWeek(date: Date = new Date()): { start: string; end: string } {
  const thisMonday = localWeekStart(date);
  const [y, m, d] = thisMonday.split('-').map(Number);
  const monday = new Date(y, m - 1, d, 12);
  return { start: localDayBefore(7, monday), end: localDayBefore(1, monday) };
}

// ── Shape ─────────────────────────────────────────────────────────────────────

export type PlannedStatus = 'followed' | 'not_followed' | 'open';

export interface ReviewPlannedItem {
  title: string;
  status: PlannedStatus;
}

export interface ReviewDone {
  /** Learn answers (practice sessions). */
  learnAnswers: number;
  /** Counted Exam Sims. */
  examSims: number;
  /** Coached Practice exams (they do not count towards progress). */
  coachedExams: number;
  /** Role-play drill answers. */
  rolePlayAnswers: number;
  /** Distinct local days with any session. */
  activeDays: number;
}

export interface ReviewChange {
  /** What moved: "Past tense", "Role play", "School". */
  label: string;
  /** The baseline and the value read, as shown to the learner: "40%" → "55%", "9/15" → "11/15". */
  from: string;
  to: string;
  /** Sign of the move only; 'same' when it did not. */
  direction: 'up' | 'down' | 'same';
  /** How the number was read: "after 4 more answers", "at your next Exam Sim". */
  basis: string;
}

export interface WeeklyReview {
  v: typeof WEEKLY_REVIEW_VERSION;
  /** The local week this review was generated in (its Monday): once per value. */
  generatedWeek: string;
  generatedAt: string;
  /** The week reviewed, local days, inclusive. */
  weekStart: string;
  weekEnd: string;
  planned: ReviewPlannedItem[];
  done: ReviewDone;
  changed: ReviewChange[];
  /** Next week's focus, plain phrases from the coach's week plan. */
  nextFocus: string[];
}

export interface ReviewLabels {
  skill: (id: string) => string;
  topic: (key: string) => string;
}

export interface BuildReviewInput {
  now: Date;
  log: CoachOutcomeLog;
  sessions: OutcomeSession[];
  labels: ReviewLabels;
  /** Next week's focus phrases (from the coach's week plan), already in order. */
  nextFocus: string[];
}

// ── Pieces ────────────────────────────────────────────────────────────────────

const AREA_LABEL: Record<CoachExamAreaKey, string> = {
  rolePlay: 'Role play',
  communication: 'Communication',
  qualityOfLanguage: 'Quality of language',
};

function inWeek(day: string, start: string, end: string): boolean {
  return day !== '' && day >= start && day <= end;
}

/** What the coach advised, in the learner's words, from the kind and what it targeted. */
export function plannedTitle(e: Pick<CoachOutcomeEntry, 'kind' | 'target'>, labels: ReviewLabels): string {
  const t = e.target;
  const topic = t.type === 'topic' ? labels.topic(t.topicKey) : null;
  const skill = t.type === 'skill' ? labels.skill(t.skillId) : null;
  const kind: CoachMoveKind = e.kind;
  switch (kind) {
    case 'first_steps': return 'Your first answers';
    case 'fix_mistake': return skill ? `Fix a repeated mistake: ${skill}` : 'Fix a repeated mistake';
    case 'weak_skill': return skill ? `Strengthen ${skill}` : 'Strengthen a weak skill';
    case 'exam_sim': return 'The weekly Exam Sim';
    case 'role_play': return 'Role-play drill';
    case 'two_part_answers': return 'Answers with an opinion and a reason';
    case 'coached_exam': return 'A Coached Practice exam';
    case 'develop_answers': return 'Develop your answers';
    case 'review': return topic ? `Review: ${topic}` : 'Review what is due';
    case 'new_topic': return topic ? `Try a new topic: ${topic}` : 'Try a new topic';
    case 'keep_going': return topic ? `Keep going: ${topic}` : 'Keep going';
  }
}

function plannedStatus(e: CoachOutcomeEntry): PlannedStatus {
  if (e.follow.status === 'followed') return 'followed';
  if (e.follow.status === 'not_followed') return 'not_followed';
  return 'open';
}

export function summariseDone(sessions: OutcomeSession[], start: string, end: string): ReviewDone {
  const days = new Set<string>();
  const done: ReviewDone = { learnAnswers: 0, examSims: 0, coachedExams: 0, rolePlayAnswers: 0, activeDays: 0 };
  for (const s of sessions) {
    const day = localDayOf(s.date);
    if (!inWeek(day, start, end)) continue;
    days.add(day);
    if (s.mode === 'practice') done.learnAnswers++;
    else if (s.mode === 'exam') {
      if (s.practiceOnly) done.coachedExams++;
      else done.examSims++;
    } else if (s.mode === 'story') done.rolePlayAnswers++;
  }
  done.activeDays = days.size;
  return done;
}

const pct = (x: number): string => `${Math.round(x * 100)}%`;
const num = (x: number): string => String(Math.round(x * 10) / 10);

function direction(delta: number): ReviewChange['direction'] {
  return delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
}

/** One measured outcome as two numbers the learner has already seen, or null when there are not two. */
export function measuredChange(e: CoachOutcomeEntry, labels: ReviewLabels): ReviewChange | null {
  const b = e.baseline;
  const o = e.outcome;
  if (!b || o.status !== 'measured' || o.value === null) return null;
  switch (b.type) {
    case 'skill_mastery':
      return {
        label: labels.skill(b.skillId),
        from: pct(b.value), to: pct(o.value), direction: direction(Math.round(o.value * 100) - Math.round(b.value * 100)),
        basis: `after ${o.answersSince} more answer${o.answersSince === 1 ? '' : 's'}`,
      };
    case 'topic_average':
      if (b.value === null) return null;
      return {
        label: labels.topic(b.topicKey),
        from: `${num(b.value)}/10`, to: `${num(o.value)}/10`, direction: direction(Math.round(o.value * 10) - Math.round(b.value * 10)),
        basis: `average over ${o.answersSince} more session${o.answersSince === 1 ? '' : 's'}`,
      };
    case 'exam_area':
      if (o.delta === null) return null;
      return {
        label: AREA_LABEL[b.area],
        from: `${b.mark}/${b.max}`, to: `${o.value}/${b.max}`, direction: direction(o.delta),
        basis: 'at your next Exam Sim',
      };
    case 'exam_total':
      if (b.value === null) return null;
      return {
        label: 'Exam Sim total',
        from: `${b.value}/40`, to: `${o.value}/40`, direction: direction(o.value - b.value),
        basis: 'at your next Exam Sim',
      };
  }
}

// ── The review ────────────────────────────────────────────────────────────────

/** The review of the week that just ended. Everything in it is read, nothing is estimated. */
export function buildWeeklyReview(input: BuildReviewInput): WeeklyReview {
  const { start, end } = previousWeek(input.now);
  const { log, labels } = input;

  // Planned: episodes first shown that week, de-duplicated by what they advised.
  const planned: ReviewPlannedItem[] = [];
  const seen = new Set<string>();
  for (const e of log.entries) {
    if (!inWeek(localDayOf(e.shownAt), start, end)) continue;
    const title = plannedTitle(e, labels);
    if (seen.has(title)) continue;
    seen.add(title);
    planned.push({ title, status: plannedStatus(e) });
  }

  // Changed: outcomes the log measured that week (the first reads of the metric after the advice).
  const changed: ReviewChange[] = [];
  for (const e of log.entries) {
    if (e.outcome.status !== 'measured' || !inWeek(localDayOf(e.outcome.measuredAt), start, end)) continue;
    const c = measuredChange(e, labels);
    if (c) changed.push(c);
  }

  return {
    v: WEEKLY_REVIEW_VERSION,
    generatedWeek: localWeekStart(input.now),
    generatedAt: input.now.toISOString(),
    weekStart: start,
    weekEnd: end,
    planned: planned.slice(0, MAX_REVIEW_ITEMS),
    done: summariseDone(input.sessions, start, end),
    changed: changed.slice(0, MAX_REVIEW_ITEMS),
    nextFocus: input.nextFocus,
  };
}

/** Did anything happen that week worth a card? An empty week shows nothing rather than a blank report. */
export function hasContent(r: WeeklyReview): boolean {
  const d = r.done;
  return r.planned.length > 0 || r.changed.length > 0 || d.learnAnswers + d.examSims + d.coachedExams + d.rolePlayAnswers > 0;
}

/** A stored value back into a review; anything unreadable or of another version is null. */
export function parseWeeklyReview(raw: unknown): WeeklyReview | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<WeeklyReview>;
  if (r.v !== WEEKLY_REVIEW_VERSION) return null;
  if (typeof r.generatedWeek !== 'string' || typeof r.weekStart !== 'string' || typeof r.weekEnd !== 'string') return null;
  if (!Array.isArray(r.planned) || !Array.isArray(r.changed) || !Array.isArray(r.nextFocus) || !r.done) return null;
  return r as WeeklyReview;
}

/** Next week's focus phrases from a week plan's days: the distinct learn targets, then the Exam Sim day. */
export function focusFromPlan(days: { kind: string; label: string; weekday: string }[]): string[] {
  const out: string[] = [];
  for (const d of days) {
    if ((d.kind === 'learn' || d.kind === 'follow_up' || d.kind === 'review') && !out.includes(d.label)) out.push(d.label);
  }
  const focus = out.slice(0, 3);
  const sim = days.find(d => d.kind === 'exam_sim');
  if (sim) focus.push(`Exam Sim (${sim.weekday})`);
  return focus;
}
