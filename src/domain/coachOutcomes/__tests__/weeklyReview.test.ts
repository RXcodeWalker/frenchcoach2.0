import { describe, expect, it } from 'vitest';
import {
  buildWeeklyReview,
  focusFromPlan,
  hasContent,
  localWeekStart,
  parseWeeklyReview,
  previousWeek,
} from '../weeklyReview';
import { emptyOutcomeLog, type CoachOutcomeEntry, type OutcomeSession } from '../outcomeLog';

const labels = { skill: (id: string) => `skill:${id}`, topic: (k: string) => `topic:${k}` };

// Wednesday 2026-11-18 (local noon). The week just ended is Mon 2026-11-09 – Sun 2026-11-15.
const NOW = new Date(2026, 10, 18, 12);

const at = (day: number, h = 12) => new Date(2026, 10, day, h).toISOString();

function entry(over: Partial<CoachOutcomeEntry>): CoachOutcomeEntry {
  return {
    id: 'e', kind: 'weak_skill', target: { type: 'skill', skillId: 'tense_past' }, activity: { type: 'learn', topicKey: null },
    evidence: {}, baseline: null, shownAt: at(10), lastShownAt: at(10), shows: 1,
    follow: { status: 'pending' }, outcome: { status: 'no_metric' },
    ...over,
  };
}

function session(day: number, mode: string, practiceOnly?: boolean): OutcomeSession {
  return { id: `${mode}${day}`, date: at(day), mode, topicKey: null, examTotal: null, ...(practiceOnly !== undefined ? { practiceOnly } : {}) };
}

describe('weeks', () => {
  it('a week starts on Monday, in local days', () => {
    expect(localWeekStart(new Date(2026, 10, 18))).toBe('2026-11-16');
    expect(localWeekStart(new Date(2026, 10, 16))).toBe('2026-11-16');
    expect(localWeekStart(new Date(2026, 10, 22, 23))).toBe('2026-11-16'); // Sunday night
  });
  it('the previous week is the Monday to Sunday before this one', () => {
    expect(previousWeek(NOW)).toEqual({ start: '2026-11-09', end: '2026-11-15' });
  });
});

describe('buildWeeklyReview', () => {
  it('lists what was planned and whether it was followed, only for that week', () => {
    const log = {
      ...emptyOutcomeLog(),
      entries: [
        entry({ id: 'a', follow: { status: 'followed', at: at(10), sessionId: 's' } }),
        entry({ id: 'b', kind: 'exam_sim', target: { type: 'exam' }, follow: { status: 'not_followed' } }),
        entry({ id: 'old', kind: 'review', target: { type: 'topic', topicKey: 'school' }, shownAt: at(2) }),
      ],
    };
    const r = buildWeeklyReview({ now: NOW, log, sessions: [], labels, nextFocus: [] });
    expect(r.planned).toEqual([
      { title: 'Strengthen skill:tense_past', status: 'followed' },
      { title: 'The weekly Exam Sim', status: 'not_followed' },
    ]);
  });

  it('counts what was done in the week only', () => {
    const sessions = [
      session(9, 'practice'), session(9, 'practice'), session(11, 'practice'),
      session(12, 'exam', false), session(13, 'exam', true), session(14, 'story'),
      session(16, 'practice'), // this week: not counted
      session(8, 'practice'), // the Sunday before: not counted
    ];
    const r = buildWeeklyReview({ now: NOW, log: emptyOutcomeLog(), sessions, labels, nextFocus: [] });
    expect(r.done).toEqual({ learnAnswers: 3, examSims: 1, coachedExams: 1, rolePlayAnswers: 1, activeDays: 5 });
  });

  it('reports only outcomes measured that week, as the two numbers read', () => {
    const log = {
      ...emptyOutcomeLog(),
      entries: [
        entry({
          id: 'skill',
          baseline: { type: 'skill_mastery', skillId: 'tense_past', value: 0.4, evidenceCount: 5 },
          outcome: { status: 'measured', measuredAt: at(13), value: 0.55, delta: 0.15, answersSince: 4 },
        }),
        entry({
          id: 'area', kind: 'develop_answers', target: { type: 'exam_area', area: 'communication' },
          baseline: { type: 'exam_area', area: 'communication', mark: 9, max: 15 },
          outcome: { status: 'measured', measuredAt: at(14), value: 8, delta: -1, answersSince: 1 },
        }),
        entry({
          id: 'later',
          baseline: { type: 'skill_mastery', skillId: 'x', value: 0.1, evidenceCount: 1 },
          outcome: { status: 'measured', measuredAt: at(17), value: 0.9, delta: 0.8, answersSince: 9 },
        }),
        entry({ id: 'pending', baseline: { type: 'topic_average', topicKey: 'school', value: 5, sessions: 1 }, outcome: { status: 'pending' } }),
        entry({
          id: 'nobaseline', kind: 'review', target: { type: 'topic', topicKey: 'home' },
          baseline: { type: 'topic_average', topicKey: 'home', value: null, sessions: 1 },
          outcome: { status: 'measured', measuredAt: at(13), value: 6, delta: null, answersSince: 3 },
        }),
      ],
    };
    const r = buildWeeklyReview({ now: NOW, log, sessions: [], labels, nextFocus: [] });
    expect(r.changed).toEqual([
      { label: 'skill:tense_past', from: '40%', to: '55%', direction: 'up', basis: 'after 4 more answers' },
      { label: 'Communication', from: '9/15', to: '8/15', direction: 'down', basis: 'at your next Exam Sim' },
    ]);
  });

  it('invents nothing for an empty week and says so through hasContent', () => {
    const r = buildWeeklyReview({ now: NOW, log: emptyOutcomeLog(), sessions: [], labels, nextFocus: ['Past tense'] });
    expect(r.planned).toEqual([]);
    expect(r.changed).toEqual([]);
    expect(hasContent(r)).toBe(false);
    expect(r.generatedWeek).toBe('2026-11-16');
  });

  it('carries no predicted score or grade', () => {
    const r = buildWeeklyReview({ now: NOW, log: emptyOutcomeLog(), sessions: [session(9, 'practice')], labels, nextFocus: [] });
    expect(JSON.stringify(r)).not.toMatch(/predict|readiness|grade|band/i);
  });
});

describe('focusFromPlan', () => {
  it('lists distinct learn targets then the Exam Sim day', () => {
    const days = [
      { kind: 'learn', label: 'Past tense', weekday: 'Wed' },
      { kind: 'learn', label: 'Past tense', weekday: 'Thu' },
      { kind: 'exam_sim', label: 'Exam Sim', weekday: 'Fri' },
      { kind: 'follow_up', label: 'Opinions', weekday: 'Sat' },
      { kind: 'role_play', label: 'Role plays', weekday: 'Sun' },
    ];
    expect(focusFromPlan(days)).toEqual(['Past tense', 'Opinions', 'Exam Sim (Fri)']);
  });
});

describe('parseWeeklyReview', () => {
  it('rejects the old shape and junk', () => {
    expect(parseWeeklyReview(null)).toBeNull();
    expect(parseWeeklyReview({ generatedAt: 'x', examReadiness: { predictedScore: 70 } })).toBeNull();
  });
  it('round-trips a built review', () => {
    const r = buildWeeklyReview({ now: NOW, log: emptyOutcomeLog(), sessions: [], labels, nextFocus: [] });
    expect(parseWeeklyReview(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });
});
