/**
 * Builds the parent dashboard from the rows `get_parent_report` returns. Pure:
 * same rows + same `now` = same report, so every rule below is unit-tested.
 *
 * It answers the four things a parent actually asks, in order:
 *   1. Are they practising?            → status, this week vs last, 4-week calendar
 *   2. Are they getting better?        → Learn score trend, speaking-flow trend
 *   3. How would the exam go today?    → latest sample exam /40 and its three areas
 *   4. What can I do this week?        → 2–4 concrete, rule-based suggestions
 *
 * Honesty rules: a trend is only claimed with enough answers on both sides
 * (`MIN_TREND_SAMPLES`), exam marks are labelled practice estimates (never a
 * grade — 0520 grade thresholds change every series and are not in this app),
 * and nothing here computes a mark; it only reads stored ones. Day boundaries
 * are the viewer's local time.
 */
import { TOPICS } from '../../data/questions';
import { examAreas, weakestExamArea, type ExamArea } from '../progress/progressSummary';
export { EXAM_TOTAL_MAX } from '../progress/progressSummary';
import type { ExamAreaMarks } from '../../types';
import type { RawParentReport, RawSession, RawSpeaking } from './rawReport';

const DAY_MS = 86_400_000;

/** Product rule, not a Cambridge figure: the "little and often" rhythm the app recommends. */
export const WEEKLY_DAYS_TARGET = 4;
/** No practice for this many days reads as "stopped", not "a light week". */
export const INACTIVE_AFTER_DAYS = 7;
export const CALENDAR_DAYS = 28;
export const TREND_WEEKS = 8;
/** Recent window vs the earlier window a trend compares. */
export const RECENT_DAYS = 14;
export const EARLIER_DAYS = 56;
/** Fewer answers than this on either side and no trend is claimed. */
export const MIN_TREND_SAMPLES = 3;
/** A Learn-score change smaller than this (out of 10) is "about the same". */
export const SCORE_STEADY_BAND = 0.3;
/** "Needs the most work" only when the weakest topic trails the strongest by at least this (out of 10). */
export const TOPIC_GAP = 0.5;
/** Suggest a sample exam when the last one was longer ago than this. */
export const EXAM_NUDGE_DAYS = 14;
/** The eight priority topics (the ones the Learn bank covers most deeply). */
export const PRIORITY_TOPICS = ['school', 'hobbies', 'family', 'holidays', 'home', 'future', 'food', 'environment'] as const;

export type StatusKind = 'new' | 'inactive' | 'light' | 'steady';
export type ExamCondition = 'sim' | 'practice' | 'unknown';
export type Direction = 'up' | 'down' | 'same';

export interface WeekStats {
  daysPractised: number;
  minutes: number;
  sessions: number;
  answers: number;
}

export interface CalendarDay {
  key: string;
  minutes: number;
  sessions: number;
  today: boolean;
}

export interface WeekScore {
  /** Local day key of the week's first day. */
  startKey: string;
  avg: number | null;
  count: number;
}

export interface Change {
  from: number;
  to: number;
  direction: Direction;
}

export interface ExamItem {
  at: string;
  total: number;
  condition: ExamCondition;
  marks: ExamAreaMarks | null;
}

export interface TopicStat {
  key: string;
  label: string;
  sessions: number;
  avg: number | null;
  lastAt: string;
}

export interface Suggestion {
  id: 'first-session' | 'restart' | 'rhythm' | 'sample-exam' | 'praise-progress' | 'praise-streak' | 'topic-talk' | 'try-topic' | 'say-it-to-me' | 'ask-what';
  title: string;
  detail: string;
  quote?: string;
}

export interface ParentReport {
  learnerName: string;
  status: { kind: StatusKind; headline: string; detail: string };
  lastActiveAt: string | null;
  daysSinceActive: number | null;
  streakDays: number;
  week: WeekStats;
  prevWeek: WeekStats;
  calendar: CalendarDay[];
  learn: { weeks: WeekScore[]; change: Change | null; recentCount: number; earlierCount: number };
  fluency: { pace: Change | null; longPauses: Change | null; answers: number };
  exam: { latest: ExamItem | null; areas: ExamArea[]; weakestArea: ExamArea | null; attempts: ExamItem[]; daysSinceLast: number | null };
  topics: { practised: TopicStat[]; strongest: TopicStat | null; needsWork: TopicStat | null; notTried: { key: string; label: string }[] };
  coachNotes: { nextSteps: string[]; highlight: string | null };
  suggestions: Suggestion[];
}

// ── Day helpers (viewer's local time) ────────────────────────────────────────

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole local days between `iso` and `now` (0 = today). */
function daysAgo(iso: string, now: Date): number {
  const a = startOfDay(new Date(iso)).getTime();
  const b = startOfDay(now).getTime();
  return Math.round((b - a) / DAY_MS);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

export function topicLabel(key: string): string {
  return TOPICS.find(t => t.key === key)?.labelEn ?? key.charAt(0).toUpperCase() + key.slice(1);
}

// ── Pieces ───────────────────────────────────────────────────────────────────

const isLearn = (s: RawSession) => s.mode === 'practice';
const isExam = (s: RawSession) => s.mode === 'exam';

function weekStats(sessions: RawSession[], speaking: RawSpeaking[], now: Date, fromAgo: number, toAgo: number): WeekStats {
  const inRange = (iso: string) => {
    const d = daysAgo(iso, now);
    return d >= fromAgo && d <= toAgo;
  };
  const rows = sessions.filter(s => inRange(s.at));
  const days = new Set(rows.map(s => dayKey(new Date(s.at))));
  return {
    daysPractised: days.size,
    minutes: Math.round(rows.reduce((sum, s) => sum + s.durationSec, 0) / 60),
    sessions: rows.length,
    answers: speaking.filter(s => inRange(s.at)).length,
  };
}

function streak(sessions: RawSession[], now: Date): number {
  const days = new Set(sessions.map(s => dayKey(new Date(s.at))));
  // A streak is still alive if today hasn't been practised yet but yesterday was.
  let cursor = days.has(dayKey(now)) ? startOfDay(now) : addDays(now, -1);
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function calendar(sessions: RawSession[], now: Date): CalendarDay[] {
  const out: CalendarDay[] = [];
  for (let i = CALENDAR_DAYS - 1; i >= 0; i--) {
    const key = dayKey(addDays(now, -i));
    const rows = sessions.filter(s => dayKey(new Date(s.at)) === key);
    out.push({ key, minutes: Math.round(rows.reduce((sum, s) => sum + s.durationSec, 0) / 60), sessions: rows.length, today: i === 0 });
  }
  return out;
}

function direction(from: number, to: number, steadyBand: number): Direction {
  if (Math.abs(to - from) < steadyBand) return 'same';
  return to > from ? 'up' : 'down';
}

/** Compares the recent window with the earlier one; null unless both have MIN_TREND_SAMPLES values. */
function compareWindows<T extends { at: string }>(rows: T[], value: (r: T) => number | null, now: Date, steadyBand: number): { change: Change | null; recent: number; earlier: number } {
  const recent: number[] = [];
  const earlier: number[] = [];
  for (const r of rows) {
    const v = value(r);
    if (v === null) continue;
    const d = daysAgo(r.at, now);
    if (d < RECENT_DAYS) recent.push(v);
    else if (d < EARLIER_DAYS) earlier.push(v);
  }
  const a = mean(earlier);
  const b = mean(recent);
  if (a === null || b === null || recent.length < MIN_TREND_SAMPLES || earlier.length < MIN_TREND_SAMPLES) {
    return { change: null, recent: recent.length, earlier: earlier.length };
  }
  return { change: { from: round1(a), to: round1(b), direction: direction(a, b, steadyBand) }, recent: recent.length, earlier: earlier.length };
}

function learnWeeks(sessions: RawSession[], now: Date): WeekScore[] {
  const weeks: WeekScore[] = [];
  for (let w = TREND_WEEKS - 1; w >= 0; w--) {
    const fromAgo = w * 7;
    const toAgo = fromAgo + 6;
    const scores = sessions
      .filter(s => isLearn(s) && s.score !== null)
      .filter(s => {
        const d = daysAgo(s.at, now);
        return d >= fromAgo && d <= toAgo;
      })
      .map(s => s.score as number);
    const avg = mean(scores);
    weeks.push({ startKey: dayKey(addDays(now, -toAgo)), avg: avg === null ? null : round1(avg), count: scores.length });
  }
  return weeks;
}

function examItems(sessions: RawSession[]): ExamItem[] {
  const items: ExamItem[] = [];
  for (const s of sessions) {
    if (!isExam(s)) continue;
    const total = s.exam?.marks?.total ?? (s.score === null ? null : Math.round(s.score * 4));
    if (total === null) continue;
    const condition: ExamCondition = s.exam === null ? 'unknown' : s.exam.practiceOnly ? 'practice' : 'sim';
    items.push({ at: s.at, total, condition, marks: s.exam?.marks ?? null });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

function topicStats(sessions: RawSession[]): TopicStat[] {
  const by = new Map<string, RawSession[]>();
  for (const s of sessions) {
    if (!isLearn(s) || !s.topic) continue;
    by.set(s.topic, [...(by.get(s.topic) ?? []), s]);
  }
  return [...by.entries()]
    .map(([key, rows]) => {
      const scores = rows.map(r => r.score).filter((x): x is number => x !== null);
      const avg = mean(scores);
      return {
        key,
        label: topicLabel(key),
        sessions: rows.length,
        avg: avg === null ? null : round1(avg),
        lastAt: rows.map(r => r.at).sort()[rows.length - 1],
      };
    })
    .sort((a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label));
}

function recentDistinct(values: (string | null)[], limit: number): string[] {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    const t = v.trim();
    if (!out.includes(t)) out.push(t);
    if (out.length === limit) break;
  }
  return out;
}

// ── Status + suggestions ────────────────────────────────────────────────────

function status(name: string, week: WeekStats, daysSinceActive: number | null): ParentReport['status'] {
  if (daysSinceActive === null) {
    return { kind: 'new', headline: `${name} hasn't practised yet`, detail: 'Their first session will show up here as soon as they finish it.' };
  }
  if (daysSinceActive >= INACTIVE_AFTER_DAYS) {
    return { kind: 'inactive', headline: `No practice for ${daysSinceActive} days`, detail: 'Speaking skills fade quickly without practice. A short session this week is enough to restart.' };
  }
  const days = `${week.daysPractised} of the last 7 days`;
  if (week.daysPractised >= WEEKLY_DAYS_TARGET) {
    return { kind: 'steady', headline: 'On track this week', detail: `${name} practised on ${days}, ${week.minutes} min in total.` };
  }
  return { kind: 'light', headline: 'A light week', detail: `${name} practised on ${days}. The aim is ${WEEKLY_DAYS_TARGET} short days a week.` };
}

function suggestions(r: Omit<ParentReport, 'suggestions'>): Suggestion[] {
  const out: Suggestion[] = [];
  const name = r.learnerName;
  const push = (s: Suggestion) => { if (out.length < 4 && !out.some(o => o.id === s.id)) out.push(s); };

  if (r.status.kind === 'new') {
    push({ id: 'first-session', title: 'Sit with them for their first session', detail: 'Ten minutes is enough. Open Learn, choose a topic such as School, and let them answer three questions out loud. You don’t need to speak French.' });
  } else if (r.status.kind === 'inactive') {
    push({ id: 'restart', title: 'Help them restart with one short session', detail: 'Ask when they could do 10 minutes this week and agree a time. Restarting is the hard part; the second session is easier.' });
  } else if (r.status.kind === 'light') {
    push({ id: 'rhythm', title: 'Agree two fixed 10-minute slots', detail: 'For example after dinner on Tuesday and Thursday. Short, regular practice does more for speaking than one long session.' });
  }

  if (r.learn.change?.direction === 'up') {
    push({ id: 'praise-progress', title: 'Tell them you noticed their progress', detail: `Their average Learn score went from ${r.learn.change.from.toFixed(1)} to ${r.learn.change.to.toFixed(1)} out of 10. Praising the effort behind a specific result keeps them going.` });
  } else if (r.streakDays >= 3) {
    push({ id: 'praise-streak', title: `Notice the ${r.streakDays}-day streak`, detail: 'A quick “I saw you’ve practised every day” is worth more than a reward.' });
  }

  const hasPractice = r.week.sessions + r.prevWeek.sessions >= 3;
  if (hasPractice && (r.exam.daysSinceLast === null || r.exam.daysSinceLast > EXAM_NUDGE_DAYS)) {
    push({
      id: 'sample-exam',
      title: 'Suggest a full sample exam this weekend',
      detail: r.exam.daysSinceLast === null
        ? 'They haven’t tried one yet. It is a full speaking exam marked out of 40: 10 minutes to prepare, then about 10 minutes of speaking. It needs a quiet room.'
        : `The last one was ${r.exam.daysSinceLast} days ago. It needs 20 quiet minutes, and one is available every 7 days.`,
    });
  }

  if (r.coachNotes.highlight) {
    push({ id: 'say-it-to-me', title: 'Ask them to say their best line to you', detail: 'This is what their coach picked out recently. Hearing them say it out loud builds confidence:', quote: r.coachNotes.highlight });
  }

  const topic = r.topics.needsWork ?? null;
  if (topic) {
    push({ id: 'topic-talk', title: `Talk about “${topic.label}” at dinner`, detail: `It is their weakest topic so far. Ask them a question about it in English, then ask for two sentences in French. Listen for full sentences, not single words.` });
  } else if (r.topics.notTried.length > 0 && r.status.kind !== 'new') {
    const t = r.topics.notTried[0];
    push({ id: 'try-topic', title: `Suggest a new topic: ${t.label}`, detail: `It is a common exam topic that ${name} hasn’t practised yet.` });
  }

  if (out.length === 0) {
    push({ id: 'ask-what', title: 'Ask what they practised this week', detail: 'Ask them to teach you one French sentence they learned. Explaining it to you helps them remember it.' });
  }
  return out;
}

// ── Entry point ─────────────────────────────────────────────────────────────

export function buildParentReport(raw: RawParentReport, now: Date = new Date()): ParentReport {
  const learnerName = raw.learnerName?.trim() || 'Your child';
  const sessions = [...raw.sessions].sort((a, b) => a.at.localeCompare(b.at));
  const speaking = [...raw.speaking].sort((a, b) => a.at.localeCompare(b.at));

  const lastActiveAt = sessions.length > 0 ? sessions[sessions.length - 1].at : null;
  const daysSinceActive = lastActiveAt === null ? null : Math.max(0, daysAgo(lastActiveAt, now));
  const week = weekStats(sessions, speaking, now, 0, 6);
  const prevWeek = weekStats(sessions, speaking, now, 7, 13);

  const learnCompare = compareWindows(sessions.filter(isLearn), s => s.score, now, SCORE_STEADY_BAND);
  const paceRaw = compareWindows(speaking, s => s.wpm, now, 5).change;
  const pace = paceRaw && { ...paceRaw, from: Math.round(paceRaw.from), to: Math.round(paceRaw.to) };
  const longPauses = compareWindows(speaking, s => s.pausesOver2s, now, 0.3).change;

  const attempts = examItems(sessions);
  const latest = attempts.find(a => a.condition !== 'practice') ?? null;
  const latestWithMarks = attempts.find(a => a.condition !== 'practice' && a.marks) ?? null;
  const areas = latestWithMarks?.marks ? examAreas(latestWithMarks.marks) : [];
  const lastAny = attempts[0] ?? null;

  const practised = topicStats(sessions);
  const scored = practised.filter(t => t.avg !== null && t.sessions >= 2);
  const strongest = scored.length >= 2 ? [...scored].sort((a, b) => (b.avg as number) - (a.avg as number))[0] : null;
  const weakest = scored.length >= 2 ? [...scored].sort((a, b) => (a.avg as number) - (b.avg as number))[0] : null;
  const needsWork = weakest && strongest && weakest.key !== strongest.key && (strongest.avg as number) - (weakest.avg as number) >= TOPIC_GAP ? weakest : null;
  const practisedKeys = new Set(practised.map(t => t.key));
  const notTried = PRIORITY_TOPICS.filter(k => !practisedKeys.has(k)).map(key => ({ key, label: topicLabel(key) }));

  const newestFirst = [...sessions].reverse().filter(isLearn);

  const base: Omit<ParentReport, 'suggestions'> = {
    learnerName,
    status: status(learnerName, week, daysSinceActive),
    lastActiveAt,
    daysSinceActive,
    streakDays: streak(sessions, now),
    week,
    prevWeek,
    calendar: calendar(sessions, now),
    learn: { weeks: learnWeeks(sessions, now), change: learnCompare.change, recentCount: learnCompare.recent, earlierCount: learnCompare.earlier },
    fluency: { pace, longPauses, answers: speaking.length },
    exam: {
      latest,
      areas,
      weakestArea: weakestExamArea(areas),
      attempts,
      daysSinceLast: lastAny === null ? null : Math.max(0, daysAgo(lastAny.at, now)),
    },
    topics: { practised, strongest, needsWork, notTried },
    coachNotes: {
      nextSteps: recentDistinct(newestFirst.map(s => s.nextStep), 3),
      highlight: recentDistinct(newestFirst.filter(s => daysAgo(s.at, now) < RECENT_DAYS).map(s => s.highlight), 1)[0] ?? null,
    },
  };
  return { ...base, suggestions: suggestions(base) };
}
