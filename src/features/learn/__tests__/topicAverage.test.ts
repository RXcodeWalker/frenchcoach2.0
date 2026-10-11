// ── Learn overhaul Batch 1c — the topic "Avg score" never shows a fabricated 0 ─
// endSession used to save `existing?.averageScore ?? avgScore ?? 0`, so a first
// session with no real score (Examiner voice, a guest past 3 tries, offline)
// saved 0 and the setup screen showed "Avg score 0.0".

import { describe, it, expect } from 'vitest';
import { nextTopicMastery, normalizeTopicMastery, normalizeTopicMasteryAll } from '../topicAverage';
import type { TopicMasteryEntry } from '../../../types';

const NOW = '2026-10-06T12:00:00.000Z';

function legacy(overrides: Partial<TopicMasteryEntry>): TopicMasteryEntry {
  return {
    topicKey: 'school',
    sessionsCompleted: 5,
    uniqueQuestionsAnswered: ['sch_01'],
    averageScore: 0,
    lastSessionAt: NOW,
    mastered: false,
    ...overrides,
  };
}

describe('nextTopicMastery', () => {
  it('an unscored-only first session leaves the average null, not 0', () => {
    const { entry, justMastered } = nextTopicMastery(undefined, {
      topicKey: 'school', completedScores: [null, null], answeredIds: ['sch_01', 'sch_02'], now: NOW,
    });
    expect(entry.averageScore).toBeNull();
    expect(entry.scoredSessionsCompleted).toBe(0);
    expect(entry.sessionsCompleted).toBe(1);
    expect(justMastered).toBe(false);
  });

  it('a scored session after an unscored one gives the true mean', () => {
    const first = nextTopicMastery(undefined, { topicKey: 'school', completedScores: [null], answeredIds: ['sch_01'], now: NOW }).entry;
    const second = nextTopicMastery(first, { topicKey: 'school', completedScores: [6, 8], answeredIds: ['sch_02'], now: NOW }).entry;
    expect(second.averageScore).toBe(7);
    expect(second.scoredSessionsCompleted).toBe(1);
    const third = nextTopicMastery(second, { topicKey: 'school', completedScores: [5], answeredIds: ['sch_03'], now: NOW }).entry;
    expect(third.averageScore).toBe(6);
  });

  it('an unscored session never changes an existing real average', () => {
    const scored = nextTopicMastery(undefined, { topicKey: 'school', completedScores: [7], answeredIds: ['sch_01'], now: NOW }).entry;
    const after = nextTopicMastery(scored, { topicKey: 'school', completedScores: [null], answeredIds: ['sch_02'], now: NOW }).entry;
    expect(after.averageScore).toBe(7);
    expect(after.scoredSessionsCompleted).toBe(1);
    expect(after.uniqueQuestionsAnswered).toEqual(['sch_01', 'sch_02']);
  });

  it('a legacy fake-0 entry is not folded into the next real score', () => {
    const { entry } = nextTopicMastery(legacy({}), { topicKey: 'school', completedScores: [8], answeredIds: ['sch_02'], now: NOW });
    expect(entry.averageScore).toBe(8);
  });

  it('nowMastered never fires on a null average', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `sch_${i}`);
    const { entry, justMastered } = nextTopicMastery(undefined, { topicKey: 'school', completedScores: ids.map(() => null), answeredIds: ids, now: NOW });
    expect(justMastered).toBe(false);
    expect(entry.mastered).toBe(false);
  });

  it('mastery still fires on a real average >= 7.5 over 10+ questions', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `sch_${i}`);
    const { entry, justMastered } = nextTopicMastery(undefined, { topicKey: 'school', completedScores: ids.map(() => 8), answeredIds: ids, now: NOW });
    expect(justMastered).toBe(true);
    expect(entry.mastered).toBe(true);
    expect(entry.badge).toBe('gold');
  });
});

describe('normalizeTopicMastery (read-time, no migration)', () => {
  it('legacy {averageScore: 0, sessionsCompleted: 5} reads as "no average"', () => {
    expect(normalizeTopicMastery(legacy({})).averageScore).toBeNull();
  });

  it('a 0 with scoredSessionsCompleted 0 reads as "no average"', () => {
    expect(normalizeTopicMastery(legacy({ scoredSessionsCompleted: 0 })).averageScore).toBeNull();
  });

  it('a legacy non-zero average is kept unchanged', () => {
    const entry = legacy({ averageScore: 4.3 });
    expect(normalizeTopicMastery(entry)).toBe(entry);
  });

  it('normalizeTopicMasteryAll maps every entry', () => {
    const all = normalizeTopicMasteryAll({ school: legacy({}), hobbies: legacy({ topicKey: 'hobbies', averageScore: 6 }) });
    expect(all.school.averageScore).toBeNull();
    expect(all.hobbies.averageScore).toBe(6);
  });
});
