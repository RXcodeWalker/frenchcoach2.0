import { describe, expect, it } from 'vitest';
import { decideCoachBrief, PHASE_STARTS_DAYS_BEFORE, type CoachInput, type CoachTopic } from '../../../services/coach/coachBrain';
import { buildWeekPlan } from '../../../services/coach/weekPlan';
import type { StoredSession } from '../../../services/analytics/analyticsService';
import { localDay } from '../../../lib/localDay';
import { LEARNER_MODEL_VERSION, type SkillStat, type SyncedSkillModel } from '../../../domain/learnerModel/types';
import type { CoachOutcomeEntry, CoachOutcomeLog } from '../../../domain/coachOutcomes/outcomeLog';
import { MIN_TREND_SAMPLES as PARENT_MIN_TREND_SAMPLES } from '../../parentView/buildReport';
import {
  MIN_TREND_SAMPLES,
  buildMyPlan,
  buildRoad,
  countdownFor,
  examStanding,
  examTrend,
  plannedSimDates,
  practiceCalendar,
  skillStanding,
  skillTrend,
  whatHasWorked,
} from '../planModel';

// Local noon on a Wednesday, so a day is the same day in every timezone the suite runs in.
const NOW = new Date(2026, 10, 4, 12, 0, 0).getTime();
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const ymdIn = (days: number) => localDay(new Date(2026, 10, 4 + days, 12));

const TOPICS: CoachTopic[] = [
  { key: 'school', labelEn: 'School', isAdvanced: false, questionsCount: 69, skillCoverage: { tense_past: 4 } },
  { key: 'holidays', labelEn: 'Holidays', isAdvanced: false, questionsCount: 66, skillCoverage: { tense_past: 21 } },
];
const LABELS: Record<string, string> = { tense_past: 'Past tense', comparative: 'Comparatives', opinion: 'Opinions', negation: 'Negation' };

function learn(daysAgo: number, mode: StoredSession['mode'] = 'practice'): StoredSession {
  return { id: `p${daysAgo}-${mode}`, date: iso(daysAgo), mode, topicKey: 'school', questionText: '', transcript: '', wordCount: 30, score: 6, durationSec: 60 };
}

function exam(daysAgo: number, total: number, extra: Partial<StoredSession> = {}): StoredSession {
  const rp = Math.min(10, Math.round(total / 4));
  const rest = total - rp;
  const marks = { rolePlay: rp, rolePlayMax: 10, communication: Math.ceil(rest / 2), qualityOfLanguage: Math.floor(rest / 2), total };
  return {
    id: `e${daysAgo}`, date: iso(daysAgo), mode: 'exam', topicKey: null, questionText: '', transcript: '', wordCount: 300,
    score: total / 4, durationSec: 900, examMarks: marks, ...extra,
  };
}

function input(over: Partial<CoachInput> = {}): CoachInput {
  return {
    now: NOW, goalType: 'igcse', examDate: null, sessions: [learn(1), learn(2), learn(3), learn(4)],
    skills: {}, weakestSkillIds: [], skillLabel: id => LABELS[id] ?? id, activeProblemNodeId: null,
    focusSkillId: null, dueCounts: {}, topics: TOPICS, topicStats: {}, learnAnswersLeft: 3, ...over,
  };
}

function stat(over: Partial<SkillStat>): SkillStat {
  return { s: 0, f: 0, w: 0, a: 0, n: 0, t: NOW, last: NOW - DAY, r: '', ...over };
}

function model(skills: Record<string, SkillStat>): SyncedSkillModel {
  return { version: LEARNER_MODEL_VERSION, devices: { d1: { updatedAt: NOW, skills } }, legacy: null };
}

const EMPTY = model({});

function whole(over: Partial<CoachInput> = {}, m: SyncedSkillModel = EMPTY) {
  const i = input(over);
  const brief = decideCoachBrief(i);
  const week = buildWeekPlan(i, brief);
  return { i, brief, week, plan: buildMyPlan({ input: i, brief, week, model: m, hasDrill: () => false, topicLabel: k => k }) };
}

describe('countdown', () => {
  it('counts local calendar days to a bare exam date, and asks for a date it does not have', () => {
    expect(countdownFor(input({ examDate: ymdIn(30) }))).toMatchObject({ kind: 'countdown', daysLeft: 30, stage: 'sharpen' });
    expect(countdownFor(input({ examDate: ymdIn(0) }))).toMatchObject({ kind: 'countdown', daysLeft: 0, stage: 'exam_day' });
    expect(countdownFor(input({ examDate: null }))).toEqual({ kind: 'no_date' });
    expect(countdownFor(input({ examDate: ymdIn(-2) }))).toMatchObject({ kind: 'after_exam' });
    expect(countdownFor(input({ goalType: 'travel', examDate: ymdIn(30) }))).toEqual({ kind: 'no_exam' });
  });

  it('puts the learner in the same phase the coach is acting on', () => {
    for (const days of [1, 7, 8, 28, 29, 84, 85, 200]) {
      const { brief, plan } = whole({ examDate: ymdIn(days) });
      const stage = plan.countdown.kind === 'countdown' ? plan.countdown.stage : null;
      expect(stage, `${days} days`).toBe(brief.phase);
      expect(brief.daysToExam).toBe(days);
    }
  });
});

describe('the road', () => {
  it('lists only the stages left, back to back, ending on exam day', () => {
    const { i, brief, week } = whole({ examDate: ymdIn(100) });
    const road = buildRoad(i, brief, week)!;
    expect(road.stages.map(s => s.key)).toEqual(['build', 'sharpen', 'exam_month', 'final_week', 'exam_day']);
    expect(road.stages[0]).toMatchObject({ from: ymdIn(0), to: ymdIn(100 - PHASE_STARTS_DAYS_BEFORE.sharpen - 1), current: true });
    expect(road.stages[1]).toMatchObject({ from: ymdIn(100 - 84), to: ymdIn(100 - 29) });
    expect(road.stages[3]).toMatchObject({ from: ymdIn(93), to: ymdIn(99) });
    expect(road.stages[4]).toMatchObject({ from: ymdIn(100), to: ymdIn(100) });
    // Back to back: each stage starts the day after the last one ends.
    for (let k = 1; k < road.stages.length; k++) {
      const prevEnd = new Date(`${road.stages[k - 1].to}T12:00:00`);
      prevEnd.setDate(prevEnd.getDate() + 1);
      expect(road.stages[k].from).toBe(localDay(prevEnd));
    }
    expect(road.stages.filter(s => s.current)).toHaveLength(1);
  });

  it('starts at today inside the current stage and drops the ones already over', () => {
    const { i, brief, week } = whole({ examDate: ymdIn(20) });
    const road = buildRoad(i, brief, week)!;
    expect(road.stages.map(s => s.key)).toEqual(['exam_month', 'final_week', 'exam_day']);
    expect(road.stages[0]).toMatchObject({ from: ymdIn(0), current: true });
  });

  it('has no road without a future exam date', () => {
    for (const examDate of [null, ymdIn(-3)]) {
      const { i, brief, week } = whole({ examDate });
      expect(buildRoad(i, brief, week)).toBeNull();
    }
  });

  it('places Exam Sims at most one per 7 days, never within two days of the exam, and none while exam practice is locked', () => {
    for (const days of [5, 12, 20, 45, 120]) {
      const { i, brief, week } = whole({ examDate: ymdIn(days) });
      const road = buildRoad(i, brief, week)!;
      const nums = road.simDates.map(d => Math.round(new Date(`${d}T12:00:00`).getTime() / DAY));
      for (let k = 1; k < nums.length; k++) expect(nums[k] - nums[k - 1], `${days}`).toBeGreaterThanOrEqual(7);
      for (const d of road.simDates) expect(d <= ymdIn(days - 2), `${days}: ${d}`).toBe(true);
      // Every sim falls inside one listed stage.
      expect(road.stages.flatMap(s => s.simDates)).toEqual(road.simDates);
      const locked = buildRoad(input({ examDate: ymdIn(days), examUnlocked: false }), brief, week)!;
      expect(locked.simDates).toEqual([]);
      expect(locked.examLocked).toBe(true);
    }
  });

  it("agrees with the week plan about this week's Exam Sim", () => {
    const { i, brief, week } = whole({ examDate: ymdIn(40) });
    const road = buildRoad(i, brief, week)!;
    if (week.examSimIndex !== null) expect(road.simDates[0]).toBe(week.days[week.examSimIndex].date);
    const weekEnd = week.days[week.days.length - 1].date;
    expect(road.simDates.filter(d => d <= weekEnd).length).toBeLessThanOrEqual(1);
  });

  it('never schedules a sim before the weekly window reopens', () => {
    const dates = plannedSimDates({ today: ymdIn(0), examDay: ymdIn(30), firstOpenDay: ymdIn(5), week: null });
    expect(dates.every(d => d >= ymdIn(5))).toBe(true);
    expect(dates).toEqual([ymdIn(6), ymdIn(13), ymdIn(20), ymdIn(27)]);
  });
});

describe('exam standing', () => {
  it('uses counted Exam Sims only — Coached and other practice exams never enter a figure', () => {
    const sessions = [exam(1, 30, { practiceOnly: true }), exam(8, 20), exam(15, 18)];
    const s = examStanding(sessions, EMPTY, NOW);
    expect(s.totals.map(t => t.total)).toEqual([18, 20]);
    expect(s.practiceExcluded).toBe(1);
    expect(s.areas.map(a => a.key)).toEqual(['rolePlay', 'communication', 'qualityOfLanguage']);
  });

  it('claims no trend under MIN_TREND_SAMPLES counted Exam Sims on each side', () => {
    expect(MIN_TREND_SAMPLES).toBe(PARENT_MIN_TREND_SAMPLES);
    for (let n = 0; n < MIN_TREND_SAMPLES * 2; n++) {
      expect(examTrend(Array.from({ length: n }, (_, k) => 10 + k * 5)), `${n}`).toBeNull();
    }
    const sessions = Array.from({ length: 5 }, (_, k) => exam(7 * (5 - k), 10 + k * 5));
    expect(examStanding(sessions, EMPTY, NOW)).toMatchObject({ trend: null, moreForTrend: 1 });
  });

  it('compares the newest half with the half before once each side is big enough', () => {
    expect(examTrend([10, 12, 14, 20, 22, 24])).toEqual({ from: 12, to: 22, direction: 'up', perSide: 3 });
    expect(examTrend([20, 21, 20, 21, 20, 21])).toMatchObject({ direction: 'same' });
    expect(examTrend([30, 30, 30, 20, 20, 20])).toMatchObject({ direction: 'down' });
  });
});

describe('skill standing', () => {
  const topics = TOPICS;
  it("groups skills by the coach's own thresholds and links each to its practice", () => {
    const m = model({
      tense_past: stat({ s: 2, f: 8, w: 10, n: 12, r: '0001000100' }),
      comparative: stat({ s: 6, f: 3, w: 9, n: 9, r: '101' }),
      opinion: stat({ s: 14, f: 1, w: 15, n: 16, r: '111111111111' }),
      negation: stat({ s: 0.1, f: 0.1, w: 0.2, n: 1, r: '1' }),
      'demand:describe': stat({ s: 1, f: 9, w: 10, n: 10 }),
    });
    const s = skillStanding({ model: m, now: NOW, label: id => LABELS[id] ?? id, topics, topicStats: {}, hasDrill: id => id === 'tense_past' });
    expect(s.workOn.map(r => r.id)).toEqual(['tense_past']);
    expect(s.workOn[0]).toMatchObject({ to: '/fix/tense_past', answers: 12, label: 'Past tense' });
    expect(s.building.map(r => r.id)).toEqual(['comparative']);
    expect(s.secure.map(r => r.id)).toEqual(['opinion']);
    expect(s.tooEarly).toBe(1); // negation; a demand is not a language skill
  });

  it('says a trend only with MIN_TREND_SAMPLES outcomes on each side', () => {
    expect(skillTrend('')).toBeNull();
    expect(skillTrend('0011')).toBeNull(); // the model's own trendOf would say "improving" here
    expect(skillTrend('000111')).toBe('improving');
    expect(skillTrend('111000')).toBe('declining');
    expect(skillTrend('110011')).toBe('steady');
  });
});

describe('what has worked', () => {
  const base: Omit<CoachOutcomeEntry, 'id' | 'follow' | 'outcome'> = {
    kind: 'weak_skill', target: { type: 'skill', skillId: 'tense_past' }, activity: { type: 'learn', topicKey: 'holidays' },
    evidence: {}, baseline: { type: 'skill_mastery', skillId: 'tense_past', value: 0.4, evidenceCount: 5 },
    shownAt: iso(10), lastShownAt: iso(10), shows: 1,
  };
  const measured = (value: number, at: string) => ({ status: 'measured' as const, measuredAt: at, value, delta: value - 0.4, answersSince: 3 });

  it('lists followed advice the log measured again, ups and downs, newest first, once each', () => {
    const log: CoachOutcomeLog = {
      v: 1,
      entries: [
        { ...base, id: 'a', follow: { status: 'followed', at: iso(9), sessionId: 's' }, outcome: measured(0.55, iso(6)) },
        { ...base, id: 'b', follow: { status: 'not_followed' }, outcome: measured(0.7, iso(5)) },
        { ...base, id: 'c', kind: 'review', target: { type: 'topic', topicKey: 'school' }, baseline: { type: 'topic_average', topicKey: 'school', value: 7, sessions: 2 },
          follow: { status: 'followed', at: iso(4), sessionId: 's2' }, outcome: { status: 'measured', measuredAt: iso(2), value: 6, delta: -1, answersSince: 3 } },
        { ...base, id: 'd', follow: { status: 'followed', at: iso(3), sessionId: 's3' }, outcome: { status: 'pending' } },
      ],
    };
    const items = whatHasWorked(log, { skill: id => LABELS[id] ?? id, topic: k => k });
    expect(items.map(i => [i.title, i.change.from, i.change.to, i.change.direction])).toEqual([
      ['Review: school', '7/10', '6/10', 'down'],
      ['Strengthen Past tense', '40%', '55%', 'up'],
    ]);
  });
});

describe('practice calendar', () => {
  it('counts sessions per local day, never a score, and leaves the rest of this week empty', () => {
    const sessions = [learn(0), learn(0, 'exam'), learn(1), learn(1, 'story'), learn(1), learn(1), learn(3), learn(2, 'minigame' as StoredSession['mode'])];
    const cal = practiceCalendar(sessions, NOW, 2);
    const cells = cal.weeks.flat();
    expect(cells).toHaveLength(14);
    const byKey = new Map(cells.map(c => [c.key, c]));
    expect(byKey.get(ymdIn(0))).toMatchObject({ count: 2, level: 2, today: true });
    expect(byKey.get(ymdIn(-1))).toMatchObject({ count: 4, level: 3 });
    expect(byKey.get(ymdIn(-2))).toMatchObject({ count: 0, level: 0 }); // a game is not practice here
    expect(cells.filter(c => c.future).map(c => c.key)).toEqual([ymdIn(1), ymdIn(2), ymdIn(3), ymdIn(4)]);
    expect(cal).toMatchObject({ daysPractised: 3, sessions: 7, longestRun: 2 });
    // Monday first.
    expect(new Date(`${cal.weeks[0][0].key}T12:00:00`).getDay()).toBe(1);
  });
});

describe('the whole plan is honest', () => {
  const PREDICTION = /predict|you(?:'|’)ll get|you will get|on track for|expected (?:grade|mark|score)|readiness|grade [1-9A-G]\b|\bgrade\b/i;

  it('today is the coach’s move and the week is the coach’s week', () => {
    const { brief, week, plan } = whole({ examDate: ymdIn(40) });
    expect(plan.today).toBe(brief.move);
    expect(plan.week).toBe(week);
  });

  it('never words a grade, prediction or readiness figure', () => {
    const sessions = [...Array.from({ length: 7 }, (_, k) => exam(7 * (7 - k) + 1, 15 + k * 2)), learn(1), learn(2)];
    for (const examDate of [null, ymdIn(3), ymdIn(20), ymdIn(60), ymdIn(150)]) {
      const { plan } = whole({ examDate, sessions });
      const text = JSON.stringify(plan);
      expect(text, String(examDate)).not.toMatch(PREDICTION);
    }
  });
});
