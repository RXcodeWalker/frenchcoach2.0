// ── My Plan: the one honest path to the exam (pure) ─────────────────────────────
//
// My Plan replaces three coming-soon stubs (French Roadmap, Mastery Journey,
// Fluency Heatmap). It decides nothing new: every part is read from a module
// that already decides it, so the plan can never disagree with Home.
//
//   today        coachBrain's move (the same one Home and Progress show)
//   this week    weekPlan's seven days (the same strip Home shows)
//   the road     the coach's own exam phases (PHASE_STARTS_DAYS_BEFORE, PHASE_FOCUS)
//                laid out as dates, with the Exam Sims the 7-day window leaves
//                room for, on weekPlan's cadence (SIM_DAYS_BEFORE_EXAM)
//   standing     the learner model: the three 0520 areas from counted Exam Sims
//                only (ADR-0007), and each language skill's decayed mastery
//   worked       the coach outcome log: followed advice whose metric was measured
//                again, as the two numbers the log read
//   calendar     the days practised, from stored sessions
//
// Honesty rules, each pinned by a test:
//   • never a predicted grade, score or readiness figure — Cambridge sets grade
//     thresholds each series and this app does not have them;
//   • no trend word under MIN_TREND_SAMPLES on each side of the comparison
//     (the parent view's rule), for exam totals and for skills alike;
//   • Coached / typed / resumed / early-start exams never enter a figure;
//   • every number shown is copied from a stored mark, count or model reading.
//
// Pure: no storage, network, clock or React. It writes nothing and emits no mark.

import { localDay, localDayOf } from '../../lib/localDay';
import {
  PHASE_FOCUS,
  PHASE_STARTS_DAYS_BEFORE,
  bestTopicForSkill,
  daysUntil,
  examLocalDay,
  examPhase,
  type CoachBrief,
  type CoachInput,
  type ExamPhase,
} from '../../services/coach/coachBrain';
import { SIM_DAYS_BEFORE_EXAM, type WeekPlan } from '../../services/coach/weekPlan';
import { EXAM_WINDOW_DAYS, examSummary, learnTopicPath } from '../progress/progressSummary';
import type { StoredSession } from '../../services/analytics/analyticsService';
import {
  MIN_SKILL_WEIGHT,
  STRONG_CONFIDENCE,
  STRONG_MASTERY,
  WEAK_CONFIDENCE,
  WEAK_MASTERY,
  examAreaStanding,
  knownSkillIds,
  readSkill,
  trendOf,
} from '../../domain/learnerModel/read';
import { isLanguageSkill } from '../../domain/learnerModel/skills';
import type { SyncedSkillModel } from '../../domain/learnerModel/types';
import { measuredChange, plannedTitle, type ReviewChange, type ReviewLabels } from '../../domain/coachOutcomes/weeklyReview';
import type { CoachOutcomeLog } from '../../domain/coachOutcomes/outcomeLog';

const DAY_MS = 86_400_000;

/**
 * Fewer values than this on either side of a comparison and no trend is
 * claimed — the same number as the parent view's MIN_TREND_SAMPLES (a test
 * holds them equal; it is not imported because that module loads the bank).
 */
export const MIN_TREND_SAMPLES = 3;
/** A change in the mean Exam Sim total smaller than this (out of 40) is "about the same" — trackRecord's IMPROVED_BY.exam_total. */
export const EXAM_TREND_STEADY_MARKS = 2;
/** Counted Exam Sims shown in the marks row. */
export const MAX_EXAM_ROW = 8;
/** Followed-and-measured advice listed under "What has worked". */
export const MAX_WORKED = 5;
/** Weeks in the practice calendar. */
export const CALENDAR_WEEKS = 12;
/** The last Exam Sim must leave this many days before the exam to act on its marks (weekPlan's fallback slot). */
const LAST_SIM_DAYS_BEFORE_EXAM = 2;

// ── Calendar arithmetic (local YYYY-MM-DD) ──────────────────────────────────────

function dayNumber(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n, 12));
}

// ── The countdown and the road ──────────────────────────────────────────────────

export type StageKey = 'build' | 'sharpen' | 'exam_month' | 'final_week' | 'exam_day';

export interface RoadStage {
  key: StageKey;
  title: string;
  /** What the stage is for, in the coach's words. */
  focus: string;
  /** First and last local day of the stage as it applies from today. */
  from: string;
  to: string;
  current: boolean;
  /** The Exam Sims the plan places inside this stage. */
  simDates: string[];
}

export type Countdown =
  | { kind: 'no_exam' }
  | { kind: 'no_date' }
  | { kind: 'after_exam'; examDay: string }
  | { kind: 'countdown'; examDay: string; daysLeft: number; stage: StageKey };

export interface Road {
  examDay: string;
  daysLeft: number;
  stages: RoadStage[];
  /** Every Exam Sim the plan has room for before the exam, oldest first. Empty while exam practice is locked. */
  simDates: string[];
  examLocked: boolean;
}

const STAGE_TITLE: Record<StageKey, string> = {
  build: 'Build',
  sharpen: 'Sharpen',
  exam_month: 'Exam month',
  final_week: 'Final week',
  exam_day: 'Exam day',
};

function sentence(fragment: string): string {
  return `${fragment.charAt(0).toUpperCase()}${fragment.slice(1)}.`;
}

const STAGE_FOCUS: Record<StageKey, string> = {
  build: sentence(PHASE_FOCUS.build),
  sharpen: sentence(PHASE_FOCUS.sharpen),
  exam_month: sentence(PHASE_FOCUS.exam_month),
  final_week: sentence(PHASE_FOCUS.final_week),
  exam_day: 'Warm up gently, speak slowly and develop every answer.',
};

function stageFor(phase: ExamPhase, daysLeft: number): StageKey {
  if (daysLeft === 0) return 'exam_day';
  if (phase === 'final_week' || phase === 'exam_month' || phase === 'sharpen' || phase === 'build') return phase;
  return 'build';
}

export function countdownFor(input: Pick<CoachInput, 'goalType' | 'examDate' | 'now'>): Countdown {
  const days = daysUntil(input.examDate, input.now);
  const phase = examPhase(input.goalType, days);
  if (phase === 'no_exam') return { kind: 'no_exam' };
  if (phase === 'no_date' || days === null) return { kind: 'no_date' };
  const examDay = examLocalDay(input.examDate);
  if (phase === 'after_exam') return { kind: 'after_exam', examDay };
  return { kind: 'countdown', examDay, daysLeft: days, stage: stageFor(phase, days) };
}

/**
 * The Exam Sims the plan has room for: on weekPlan's cadence — three days
 * before the exam and every seven days back from it — never before the weekly
 * window reopens, never within two days of the exam. This week's slot is the
 * week plan's own (it may sit off the cadence when the window opens late).
 */
export function plannedSimDates(a: {
  today: string;
  examDay: string;
  /** Local day the 7-day window reopens; today when a sim is available now. */
  firstOpenDay: string;
  week: WeekPlan | null;
}): string[] {
  const first = dayNumber(a.firstOpenDay) > dayNumber(a.today) ? a.firstOpenDay : a.today;
  const lastAllowed = addDays(a.examDay, -LAST_SIM_DAYS_BEFORE_EXAM);
  const weekEnd = a.week?.days.length ? a.week.days[a.week.days.length - 1].date : a.today;
  const out: string[] = [];
  const weekSim = a.week && a.week.examSimIndex !== null ? a.week.days[a.week.examSimIndex]?.date ?? null : null;
  if (weekSim && weekSim <= lastAllowed) out.push(weekSim);
  // Beyond this week: the exam-anchored cadence, a full window after the previous sim.
  for (let k = 0; ; k++) {
    const d = addDays(a.examDay, -(SIM_DAYS_BEFORE_EXAM + EXAM_WINDOW_DAYS * k));
    if (dayNumber(d) < dayNumber(first) || dayNumber(d) <= dayNumber(weekEnd)) break;
    out.push(d);
  }
  // A sim this week and the cadence's first one closer than a window apart: keep the week's.
  const sorted = [...new Set(out)].sort();
  const spaced: string[] = [];
  for (const d of sorted) {
    const prev = spaced[spaced.length - 1];
    if (!prev || dayNumber(d) - dayNumber(prev) >= EXAM_WINDOW_DAYS) spaced.push(d);
  }
  return spaced;
}

/** The stages left between today and the exam, with dates and the Exam Sims inside each. Null without a future exam date. */
export function buildRoad(input: CoachInput, brief: CoachBrief, week: WeekPlan | null): Road | null {
  const countdown = countdownFor(input);
  if (countdown.kind !== 'countdown') return null;
  const today = localDay(new Date(input.now));
  const { examDay, daysLeft } = countdown;
  const examLocked = input.examUnlocked === false;

  const firstOpenDay = brief.examAvailable || !brief.nextExamAt ? today : localDayOf(brief.nextExamAt) || today;
  const simDates = examLocked ? [] : plannedSimDates({ today, examDay, firstOpenDay, week });

  // Each phase covers [exam − start, exam − next phase's start − 1] days before the exam.
  const { sharpen, exam_month: month, final_week: finalWeek } = PHASE_STARTS_DAYS_BEFORE;
  const spans: Array<{ key: StageKey; fromBefore: number | null; toBefore: number }> = [
    { key: 'build', fromBefore: null, toBefore: sharpen + 1 },
    { key: 'sharpen', fromBefore: sharpen, toBefore: month + 1 },
    { key: 'exam_month', fromBefore: month, toBefore: finalWeek + 1 },
    { key: 'final_week', fromBefore: finalWeek, toBefore: 1 },
    { key: 'exam_day', fromBefore: 0, toBefore: 0 },
  ];
  const stages: RoadStage[] = [];
  for (const s of spans) {
    if (s.toBefore > daysLeft) continue; // the stage ended before today
    const from = s.fromBefore === null || s.fromBefore >= daysLeft ? today : addDays(examDay, -s.fromBefore);
    const to = addDays(examDay, -s.toBefore);
    stages.push({
      key: s.key,
      title: STAGE_TITLE[s.key],
      focus: STAGE_FOCUS[s.key],
      from,
      to,
      current: s.key === countdown.stage,
      simDates: simDates.filter(d => d >= from && d <= to),
    });
  }
  return { examDay, daysLeft, stages, simDates, examLocked };
}

// ── Where you stand ─────────────────────────────────────────────────────────────

export type Direction = 'up' | 'down' | 'same';

export interface ExamTotalPoint {
  id: string;
  date: string;
  total: number;
}

export interface AreaStanding {
  key: 'rolePlay' | 'communication' | 'qualityOfLanguage';
  label: string;
  /** The latest counted attempt's mark for this area. */
  mark: number;
  max: number;
  /** Decayed share of the area's marks across recent counted Exam Sims (0–100), when the learner model still holds them. */
  recentSharePct: number | null;
}

export interface ExamStanding {
  /** Counted Exam Sims with a mark, oldest first (the newest MAX_EXAM_ROW). */
  totals: ExamTotalPoint[];
  areas: AreaStanding[];
  /** Mean of the earlier counted attempts vs the most recent ones; null below MIN_TREND_SAMPLES a side. */
  trend: { from: number; to: number; direction: Direction; perSide: number } | null;
  /** Counted Exam Sims still needed before a trend is claimed (0 once it is). */
  moreForTrend: number;
  /** Exams on record that are left out because they don't count (Coached, typed, resumed, early start). */
  practiceExcluded: number;
}

const AREA_LABEL: Record<AreaStanding['key'], string> = {
  rolePlay: 'Role play',
  communication: 'Communication',
  qualityOfLanguage: 'Quality of language',
};

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (x: number): number => Math.round(x * 10) / 10;

/**
 * The exam trend, honestly: the newest half of the counted attempts against the
 * half before it, and only when each half has MIN_TREND_SAMPLES attempts.
 */
export function examTrend(totalsOldestFirst: number[]): ExamStanding['trend'] {
  const perSide = Math.min(Math.floor(totalsOldestFirst.length / 2), MIN_TREND_SAMPLES * 2);
  if (perSide < MIN_TREND_SAMPLES) return null;
  const recent = totalsOldestFirst.slice(-perSide);
  const earlier = totalsOldestFirst.slice(-perSide * 2, -perSide);
  const from = mean(earlier);
  const to = mean(recent);
  const direction: Direction = Math.abs(to - from) < EXAM_TREND_STEADY_MARKS ? 'same' : to > from ? 'up' : 'down';
  return { from: round1(from), to: round1(to), direction, perSide };
}

export function examStanding(sessions: StoredSession[], model: SyncedSkillModel, now: number): ExamStanding {
  const exam = examSummary(sessions);
  const oldestFirst = [...exam.counted].reverse();
  const allTotals = oldestFirst.map(a => a.total);
  const trend = examTrend(allTotals);

  // Area marks: the latest counted attempt's, with the learner model's decayed share beside them.
  const recent = new Map(examAreaStanding(model, now).map(a => [a.key, a]));
  const areas: AreaStanding[] = exam.areas.map(a => {
    const r = recent.get(a.key);
    return {
      key: a.key,
      label: AREA_LABEL[a.key],
      mark: a.mark,
      max: a.max,
      recentSharePct: r ? Math.round(r.mastery * 100) : null,
    };
  });

  return {
    totals: oldestFirst.slice(-MAX_EXAM_ROW).map(a => ({ id: a.id, date: a.date, total: a.total })),
    areas,
    trend,
    moreForTrend: trend ? 0 : Math.max(0, MIN_TREND_SAMPLES * 2 - allTotals.length),
    practiceExcluded: exam.practiceExcludedCount,
  };
}

export type SkillGroup = 'work_on' | 'building' | 'secure';

export interface SkillRow {
  id: string;
  label: string;
  /** Decayed mastery, 0–100. */
  masteryPct: number;
  /** Observations the reading rests on ("from 12 answers"). */
  answers: number;
  group: SkillGroup;
  /** Only with MIN_TREND_SAMPLES outcomes on each side of the comparison. */
  trend: 'improving' | 'declining' | 'steady' | null;
  /** Where to practise it, or null when no question practises it. */
  to: string | null;
}

export interface SkillStanding {
  workOn: SkillRow[];
  building: SkillRow[];
  secure: SkillRow[];
  /** Skills seen but with too little evidence to place. */
  tooEarly: number;
}

/** A trend word only with MIN_TREND_SAMPLES outcomes on each side (the learner model keeps the last 20); the ±0.2 band is trendOf's. */
export function skillTrend(recent: string): SkillRow['trend'] {
  if (recent.length < MIN_TREND_SAMPLES * 2) return null;
  const t = trendOf(recent);
  if (t === 'improving') return 'improving';
  if (t === 'declining') return 'declining';
  if (t === 'stable') return 'steady';
  return null;
}

const round2 = (x: number): number => Math.round(x * 100) / 100;

/**
 * Every language skill the learner model holds, grouped by the coach's own
 * thresholds (WEAK_* / STRONG_*), so "work on" here is exactly what the coach
 * would target.
 */
export function skillStanding(a: {
  model: SyncedSkillModel;
  now: number;
  label: (id: string) => string;
  topics: CoachInput['topics'];
  topicStats: CoachInput['topicStats'];
  hasDrill: (id: string) => boolean;
}): SkillStanding {
  const out: SkillStanding = { workOn: [], building: [], secure: [], tooEarly: 0 };
  for (const id of knownSkillIds(a.model)) {
    if (!isLanguageSkill(id)) continue;
    const r = readSkill(a.model, id, a.now);
    if (!r || r.evidenceCount === 0) continue;
    const mastery = round2(r.mastery);
    const confidence = round2(r.confidence);
    if (r.weight < MIN_SKILL_WEIGHT || confidence <= WEAK_CONFIDENCE) {
      out.tooEarly++;
      continue;
    }
    const group: SkillGroup =
      mastery < WEAK_MASTERY ? 'work_on' : mastery >= STRONG_MASTERY && confidence > STRONG_CONFIDENCE ? 'secure' : 'building';
    const topic = bestTopicForSkill(id, a.topics, a.topicStats);
    const row: SkillRow = {
      id,
      label: a.label(id),
      masteryPct: Math.round(mastery * 100),
      answers: r.evidenceCount,
      group,
      trend: skillTrend(r.recent),
      to: a.hasDrill(id) ? `/fix/${id}` : topic ? learnTopicPath(topic.key) : null,
    };
    if (group === 'work_on') out.workOn.push(row);
    else if (group === 'secure') out.secure.push(row);
    else out.building.push(row);
  }
  const byLabel = (x: SkillRow, y: SkillRow) => (x.label < y.label ? -1 : x.label > y.label ? 1 : 0);
  out.workOn.sort((x, y) => x.masteryPct - y.masteryPct || byLabel(x, y));
  out.building.sort((x, y) => x.masteryPct - y.masteryPct || byLabel(x, y));
  out.secure.sort((x, y) => y.masteryPct - x.masteryPct || byLabel(x, y));
  return out;
}

// ── What has worked ─────────────────────────────────────────────────────────────

export interface WorkedItem {
  /** What the coach advised and the learner did: "Strengthen Past tense". */
  title: string;
  change: ReviewChange;
  measuredAt: string;
}

/**
 * Advice the learner followed whose metric the outcome log read again — up and
 * down alike, newest first, one per piece of advice. Two numbers, never a verdict.
 */
export function whatHasWorked(log: CoachOutcomeLog | undefined, labels: ReviewLabels): WorkedItem[] {
  if (!log) return [];
  const items: WorkedItem[] = [];
  for (const e of log.entries) {
    if (e.follow.status !== 'followed' || e.outcome.status !== 'measured') continue;
    const change = measuredChange(e, labels);
    if (!change) continue;
    items.push({ title: plannedTitle(e, labels), change, measuredAt: e.outcome.measuredAt });
  }
  items.sort((a, b) => (a.measuredAt < b.measuredAt ? 1 : a.measuredAt > b.measuredAt ? -1 : 0));
  const seen = new Set<string>();
  return items.filter(i => (seen.has(i.title) ? false : (seen.add(i.title), true))).slice(0, MAX_WORKED);
}

// ── Practice calendar ───────────────────────────────────────────────────────────

export interface CalendarCell {
  /** Local YYYY-MM-DD. */
  key: string;
  /** Learn answers, exams and role-play answers recorded that day. */
  count: number;
  /** 0 none · 1 one · 2 two or three · 3 four or more. */
  level: 0 | 1 | 2 | 3;
  today: boolean;
  /** After today (the current week's remaining days): drawn empty, never counted. */
  future: boolean;
}

export interface PracticeCalendar {
  /** CALENDAR_WEEKS columns, oldest first; each is Monday → Sunday. */
  weeks: CalendarCell[][];
  daysPractised: number;
  /** Sessions in the window. */
  sessions: number;
  /** Longest run of consecutive practised days in the window. */
  longestRun: number;
}

const CALENDAR_MODES: ReadonlySet<string> = new Set(['practice', 'exam', 'story']);

function levelFor(count: number): CalendarCell['level'] {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

export function practiceCalendar(sessions: Pick<StoredSession, 'date' | 'mode'>[], now: number, weeks = CALENDAR_WEEKS): PracticeCalendar {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (!CALENDAR_MODES.has(s.mode)) continue;
    const day = localDayOf(s.date);
    if (day) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const todayDate = new Date(now);
  const today = localDay(todayDate);
  const monday = addDays(today, -((todayDate.getDay() + 6) % 7));
  const start = addDays(monday, -7 * (weeks - 1));

  const cols: CalendarCell[][] = [];
  let daysPractised = 0;
  let total = 0;
  let run = 0;
  let longestRun = 0;
  for (let w = 0; w < weeks; w++) {
    const col: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(start, w * 7 + d);
      const future = key > today;
      const count = future ? 0 : counts.get(key) ?? 0;
      if (!future) {
        if (count > 0) {
          daysPractised++;
          total += count;
          run++;
          longestRun = Math.max(longestRun, run);
        } else if (key !== today) {
          run = 0; // today isn't over yet: an empty today doesn't break a run
        }
      }
      col.push({ key, count, level: levelFor(count), today: key === today, future });
    }
    cols.push(col);
  }
  return { weeks: cols, daysPractised, sessions: total, longestRun };
}

// ── The whole plan ──────────────────────────────────────────────────────────────

export interface MyPlan {
  countdown: Countdown;
  /** The coach's move for today — Home's mission. */
  today: CoachBrief['move'];
  week: WeekPlan;
  road: Road | null;
  exam: ExamStanding;
  skills: SkillStanding;
  worked: WorkedItem[];
  calendar: PracticeCalendar;
  /** False until the learner has any Learn answer or exam on record. */
  hasHistory: boolean;
}

export function buildMyPlan(a: {
  input: CoachInput;
  brief: CoachBrief;
  week: WeekPlan;
  model: SyncedSkillModel;
  hasDrill: (skillId: string) => boolean;
  topicLabel: (key: string) => string;
}): MyPlan {
  const { input, brief, week, model } = a;
  const labels: ReviewLabels = { skill: input.skillLabel, topic: a.topicLabel };
  return {
    countdown: countdownFor(input),
    today: brief.move,
    week,
    road: buildRoad(input, brief, week),
    exam: examStanding(input.sessions, model, input.now),
    skills: skillStanding({
      model,
      now: input.now,
      label: input.skillLabel,
      topics: input.topics,
      topicStats: input.topicStats,
      hasDrill: a.hasDrill,
    }),
    worked: whatHasWorked(input.outcomeLog, labels),
    calendar: practiceCalendar(input.sessions, input.now),
    hasHistory: input.sessions.some(s => s.mode === 'practice' || s.mode === 'exam'),
  };
}
