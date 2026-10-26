import { describe, it, expect } from 'vitest';
import type { StoredSession } from '../../../services/analytics/analyticsService';
import type { ExamAreaMarks, SkillProfile, Topic, TopicMasteryEntry } from '../../../types';
import {
  examSummary,
  examTotalOutOf40,
  learnSummary,
  nextStep,
  pastAttempts,
  learnAverage,
  practiceDays,
  weakSkills,
  type LearnSummaryInput,
} from '../progressSummary';

const NOW = Date.parse('2026-10-26T12:00:00Z');
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

function session(overrides: Partial<StoredSession>): StoredSession {
  return {
    id: Math.random().toString(36).slice(2),
    date: daysAgo(1),
    mode: 'practice',
    topicKey: 'school',
    questionText: 'Q?',
    transcript: 'Je vais au collège.',
    wordCount: 4,
    score: 7,
    durationSec: 30,
    ...overrides,
  };
}

const marks = (m: Partial<ExamAreaMarks>): ExamAreaMarks => ({
  rolePlay: 8, rolePlayMax: 10, communication: 12, qualityOfLanguage: 9, total: 29, ...m,
});

function topic(key: string, questionsCount = 20): Topic {
  return { key, label: key, labelEn: key.toUpperCase(), icon: '', color: '', description: '', questionsCount };
}

function mastery(key: string, e: Partial<TopicMasteryEntry> = {}): TopicMasteryEntry {
  return {
    topicKey: key, sessionsCompleted: 3, uniqueQuestionsAnswered: ['a', 'b'], averageScore: 6,
    lastSessionAt: daysAgo(1), mastered: false, ...e,
  };
}

function learnInput(over: Partial<LearnSummaryInput> = {}): LearnSummaryInput {
  return {
    topics: [topic('school'), topic('hobbies'), topic('tiny', 2)],
    isTopicVisible: t => t.questionsCount >= 5,
    topicMastery: {},
    dueCounts: {},
    sessions: [],
    streakDays: 0,
    skillProfile: {},
    now: NOW,
    ...over,
  };
}

describe('examTotalOutOf40', () => {
  it('reads the saved total, else recovers it exactly from the /10 rescale', () => {
    expect(examTotalOutOf40({ score: 7.3, examMarks: marks({ total: 29 }) })).toBe(29);
    for (let total = 0; total <= 40; total++) {
      const rescaled = Math.round((total / 40) * 10 * 10) / 10;
      expect(examTotalOutOf40({ score: rescaled })).toBe(total);
    }
    expect(examTotalOutOf40({ score: null })).toBeNull();
  });
});

describe('examSummary', () => {
  it('excludes practiceOnly attempts from the trend, the areas and the weakest area', () => {
    const sessions = [
      session({ mode: 'exam', practiceOnly: true, score: 2.5, examMarks: marks({ rolePlay: 1, total: 10 }) }),
      session({ mode: 'exam', score: 7.3, examMarks: marks({}) }),
      session({ mode: 'exam', score: 5 }),
      session({ mode: 'practice', score: 9 }),
    ];
    const summary = examSummary(sessions);
    expect(summary.counted.map(a => a.total)).toEqual([29, 20]);
    expect(summary.practiceExcludedCount).toBe(1);
    expect(summary.areas.find(a => a.key === 'rolePlay')?.mark).toBe(8);
    expect(summary.weakestArea?.key).toBe('qualityOfLanguage');
  });

  it('uses the newest counted attempt that has area marks; legacy attempts give totals only', () => {
    const summary = examSummary([session({ mode: 'exam', score: 6 }), session({ mode: 'exam', score: 7.3, examMarks: marks({}) })]);
    expect(summary.counted[0].marks).toBeNull();
    expect(summary.latestWithAreas?.total).toBe(29);

    const legacyOnly = examSummary([session({ mode: 'exam', score: 6 })]);
    expect(legacyOnly.areas).toEqual([]);
    expect(legacyOnly.weakestArea).toBeNull();
  });

  it('skips unmarked counted attempts rather than inventing a 0', () => {
    expect(examSummary([session({ mode: 'exam', score: null })]).counted).toEqual([]);
  });
});

describe('learnSummary', () => {
  it('keeps a null average as null and only lists practised, visible topics', () => {
    const summary = learnSummary(learnInput({
      topicMastery: {
        school: mastery('school', { averageScore: null }),
        hobbies: mastery('hobbies', { mastered: true, lastSessionAt: daysAgo(3) }),
        tiny: mastery('tiny'),
      },
      dueCounts: { school: 2, tiny: 4 },
    }));
    expect(summary.visibleTopicCount).toBe(2);
    expect(summary.topics.map(t => t.key)).toEqual(['school', 'hobbies']);
    expect(summary.topics[0].averageScore).toBeNull();
    expect(summary.masteredCount).toBe(1);
    expect(summary.dueForReview).toBe(2);
  });

  it('counts distinct days with a Learn or Exam session in the last 14 days', () => {
    const summary = learnSummary(learnInput({
      sessions: [
        session({ date: daysAgo(1) }),
        session({ date: daysAgo(1) }),
        session({ mode: 'exam', date: daysAgo(5) }),
        session({ mode: 'story', date: daysAgo(2) }),
        session({ date: daysAgo(20) }),
      ],
    }));
    expect(summary.daysPractisedRecently).toBe(2);
  });
});

describe('weakSkills', () => {
  it('needs two observations and a score under 75%, weakest first', () => {
    const profile: SkillProfile = {
      gender: { name: 'Gender', score: 0.4, lastSeen: 0, feedbackCount: 3, mastery: 'learning' },
      negation: { name: 'Negation', score: 0.6, lastSeen: 0, feedbackCount: 2, mastery: 'practiced' },
      elision: { name: 'Elision', score: 0.2, lastSeen: 0, feedbackCount: 1, mastery: 'unknown' },
      opinion: { name: 'Opinion', score: 0.9, lastSeen: 0, feedbackCount: 5, mastery: 'mastered' },
    };
    expect(weakSkills(profile).map(s => s.id)).toEqual(['gender', 'negation']);
  });
});

describe('nextStep', () => {
  const run = (sessions: StoredSession[], over: Partial<LearnSummaryInput> = {}) =>
    nextStep({ sessions, exam: examSummary(sessions), learn: learnSummary(learnInput({ sessions, ...over })), now: NOW });

  it('sends a new learner to Learn', () => {
    expect(run([]).kind).toBe('first-session');
    expect(run([session({ mode: 'story' })]).to).toBe('/learn');
  });

  it('sends due spaced review to the topic with the most due', () => {
    const step = run([session({})], {
      topicMastery: { school: mastery('school'), hobbies: mastery('hobbies') },
      dueCounts: { school: 1, hobbies: 3 },
    });
    expect(step.kind).toBe('review-due');
    expect(step.to).toBe('/learn?topic=hobbies');
  });

  it('suggests Exam Sim when no exam was sat in the last 7 days', () => {
    expect(run([session({}), session({ mode: 'exam', date: daysAgo(9) })]).kind).toBe('exam-sim');
  });

  it('a Coached attempt this week still uses up the weekly window', () => {
    const step = run([session({ mode: 'exam', practiceOnly: true, date: daysAgo(2) })], {
      topicMastery: { school: mastery('school', { averageScore: 5 }), hobbies: mastery('hobbies', { averageScore: 7 }) },
    });
    expect(step.kind).toBe('weakest-topic');
    expect(step.to).toBe('/learn?topic=school');
  });

  it('never ranks a null-average topic as the weakest', () => {
    const step = run([session({ mode: 'exam', date: daysAgo(2), examMarks: marks({}) })], {
      topicMastery: { school: mastery('school', { averageScore: null }) },
    });
    expect(step.kind).toBe('new-topic');
    expect(step.detail).toContain('Quality of language');
  });
});

describe('pastAttempts', () => {
  it('lists Learn and Exam only, tagging attempts that do not count', () => {
    const rows = pastAttempts([
      session({ id: 'e1', mode: 'exam', practiceOnly: true, score: 5 }),
      session({ id: 'l1', feedbackSummary: 'Use the past tense.' }),
      session({ id: 's1', mode: 'story' }),
    ], [topic('school')]);
    expect(rows.map(r => r.id)).toEqual(['e1', 'l1']);
    expect(rows[0]).toMatchObject({ kind: 'exam', counted: false, total: 20, areas: [] });
    expect(rows[1]).toMatchObject({ kind: 'learn', topicLabel: 'SCHOOL', feedbackSummary: 'Use the past tense.' });
  });
});

describe('learnAverage', () => {
  it('averages scored Learn answers only, and is null with none — never 0', () => {
    expect(learnAverage([])).toBeNull();
    expect(learnAverage([session({ id: 'a', score: null }), session({ id: 'x', mode: 'exam', score: 9 })])).toBeNull();
    expect(learnAverage([session({ id: 'a', score: 6 }), session({ id: 'b', score: 8 })])).toBe(7);
  });
});

describe('practiceDays', () => {
  it('returns the window oldest first, marks today and the days with a Learn or exam attempt', () => {
    const now = Date.parse('2026-10-26T12:00:00Z');
    const days = practiceDays([
      session({ id: 'a', date: '2026-10-26T09:00:00Z' }),
      session({ id: 'b', date: '2026-10-20T09:00:00Z', mode: 'exam' }),
      session({ id: 'c', date: '2026-10-19T09:00:00Z', mode: 'story' }),
    ], 14, now);
    expect(days).toHaveLength(14);
    expect(days[0].key).toBe('2026-10-13');
    expect(days[13]).toEqual({ key: '2026-10-26', practised: true, today: true });
    expect(days.filter(d => d.practised).map(d => d.key)).toEqual(['2026-10-20', '2026-10-26']);
  });
});
