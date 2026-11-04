// @vitest-environment jsdom
// Topic progress, the SM-2 review schedule and Learn settings survive a change
// of device (learner_state), and a sign-in never loses what this device holds.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const upsertMock = vi.fn();
const pullMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      upsert: (...args: unknown[]) => upsertMock(...args),
      select: () => ({ eq: () => pullMock() }),
    }),
  },
  supabaseConfigured: true,
}));

vi.mock('../../../config/featureFlags', async (orig) => ({
  ...(await orig<typeof import('../../../config/featureFlags')>()),
  resolveFeatureStatus: () => 'live',
}));

import {
  hydrateLearnerState,
  pushLearnerState,
  mergeTopicMastery,
  settingsToFill,
  _resetLearnerStateSyncCache,
} from '../learnerStateSync';
import { STORAGE_KEYS, storageGet, storageSet, storageSetRaw } from '../../persistence/storage';
import type { TopicMasteryEntry } from '../../../types';

function entry(topicKey: string, over: Partial<TopicMasteryEntry> = {}): TopicMasteryEntry {
  return {
    topicKey, sessionsCompleted: 1, scoredSessionsCompleted: 1, uniqueQuestionsAnswered: ['q1'],
    averageScore: 6, lastSessionAt: '2026-10-01T10:00:00Z', mastered: false, ...over,
  };
}

function item(questionId: string, lastAnsweredAt: string, intervalDays = 1) {
  return {
    questionId, topicKey: 'school', easeFactor: 2.5, intervalDays, repetitions: 1,
    nextEligibleAt: lastAnsweredAt, lastAnsweredAt, lastQuality: 4, firstRecordedScore: 7,
  };
}

beforeEach(() => {
  localStorage.clear();
  _resetLearnerStateSyncCache();
  upsertMock.mockReset().mockResolvedValue({ error: null });
  pullMock.mockReset().mockResolvedValue({ data: [], error: null });
});

describe('mergeTopicMastery', () => {
  it('a fresh device gets every cloud topic back', () => {
    const { merged, changedTopics } = mergeTopicMastery({}, { school: entry('school', { sessionsCompleted: 6, mastered: true, badge: 'gold' }) });
    expect(changedTopics).toEqual(['school']);
    expect(merged.school.sessionsCompleted).toBe(6);
    expect(merged.school.mastered).toBe(true);
  });

  it('keeps the further-along entry, unions answered questions, and mastery is sticky', () => {
    const local = { school: entry('school', { sessionsCompleted: 4, uniqueQuestionsAnswered: ['q1', 'q2'], mastered: true, masteredAt: '2026-10-05T00:00:00Z' }) };
    const cloud = { school: entry('school', { sessionsCompleted: 2, uniqueQuestionsAnswered: ['q3'], averageScore: 9 }) };
    const { merged } = mergeTopicMastery(local, cloud);
    expect(merged.school.sessionsCompleted).toBe(4);
    expect(merged.school.averageScore).toBe(6);
    expect(merged.school.uniqueQuestionsAnswered.sort()).toEqual(['q1', 'q2', 'q3']);
    expect(merged.school.mastered).toBe(true);
    expect(merged.school.badge).toBe('gold');
  });

  it('ignores malformed cloud entries and keeps local-only topics', () => {
    const { merged, changedTopics } = mergeTopicMastery({ food: entry('food') }, { school: { topicKey: 'school' }, home: 'x' });
    expect(changedTopics).toEqual([]);
    expect(Object.keys(merged)).toEqual(['food']);
  });
});

describe('settingsToFill', () => {
  it('fills only the settings this device never set', () => {
    expect(settingsToFill({ aim: 'push' }, { aim: 'comfortable', markingLevel: 'B1', dailyGoal: 5 }))
      .toEqual({ markingLevel: 'B1', dailyGoal: 5 });
  });
});

describe('hydrateLearnerState', () => {
  it('restores topic progress, the review schedule and settings on a new device', async () => {
    pullMock.mockResolvedValueOnce({
      data: [
        { key: 'topic_mastery', value: { school: entry('school', { sessionsCompleted: 3 }) } },
        { key: 'review_pool', value: { version: 3, items: { q9: item('q9', '2026-10-02T10:00:00Z') } } },
        { key: 'learn_settings', value: { aim: 'push', markingLevel: 'A2', dailyGoal: 4 } },
      ],
      error: null,
    });
    const result = await hydrateLearnerState('u1');
    expect(result?.changedTopics).toEqual(['school']);
    expect(result?.settings).toEqual({ aim: 'push', markingLevel: 'A2', dailyGoal: 4 });
    expect(storageGet<Record<string, TopicMasteryEntry>>(STORAGE_KEYS.topicMastery, {}).school.sessionsCompleted).toBe(3);
    expect(storageGet<{ items: Record<string, unknown> }>(STORAGE_KEYS.reviewPool, { items: {} }).items.q9).toBeDefined();
  });

  it('per review item, the more recent answer wins; a cloud pool of another version is ignored', async () => {
    storageSet(STORAGE_KEYS.reviewPool, { version: 3, items: { q1: item('q1', '2026-10-05T00:00:00Z', 6), q2: item('q2', '2026-10-01T00:00:00Z', 1) } });
    pullMock.mockResolvedValueOnce({
      data: [{ key: 'review_pool', value: { version: 3, items: { q1: item('q1', '2026-10-01T00:00:00Z', 1), q2: item('q2', '2026-10-09T00:00:00Z', 15) } } }],
      error: null,
    });
    await hydrateLearnerState('u1');
    const pool = storageGet<{ items: Record<string, { intervalDays: number }> }>(STORAGE_KEYS.reviewPool, { items: {} });
    expect(pool.items.q1.intervalDays).toBe(6);
    expect(pool.items.q2.intervalDays).toBe(15);

    pullMock.mockResolvedValueOnce({ data: [{ key: 'review_pool', value: { version: 2, items: { q3: item('q3', '2026-10-09T00:00:00Z') } } }], error: null });
    await hydrateLearnerState('u1');
    expect(storageGet<{ items: Record<string, unknown> }>(STORAGE_KEYS.reviewPool, { items: {} }).items.q3).toBeUndefined();
  });

  it("this device's own setting wins over the cloud's", async () => {
    storageSetRaw(STORAGE_KEYS.aim, 'comfortable');
    pullMock.mockResolvedValueOnce({ data: [{ key: 'learn_settings', value: { aim: 'push' } }], error: null });
    const result = await hydrateLearnerState('u1');
    expect(result?.settings.aim).toBeUndefined();
  });

  it('a failed pull changes nothing and returns null', async () => {
    storageSet(STORAGE_KEYS.topicMastery, { food: entry('food') });
    pullMock.mockResolvedValueOnce({ data: null, error: { message: 'relation "learner_state" does not exist' } });
    expect(await hydrateLearnerState('u1')).toBeNull();
    expect(Object.keys(storageGet(STORAGE_KEYS.topicMastery, {}))).toEqual(['food']);
  });
});

describe('pushLearnerState', () => {
  it('never pushes before this account was hydrated (would overwrite a richer cloud copy)', async () => {
    storageSet(STORAGE_KEYS.topicMastery, { food: entry('food') });
    await pushLearnerState('u1');
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('never pushes after a failed pull either', async () => {
    pullMock.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    await hydrateLearnerState('u1');
    await pushLearnerState('u1');
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('after hydration, pushes the keys the cloud lacks, then only what changed', async () => {
    storageSet(STORAGE_KEYS.topicMastery, { food: entry('food') });
    pullMock.mockResolvedValueOnce({ data: [{ key: 'learn_settings', value: {} }], error: null });
    await hydrateLearnerState('u1');
    await pushLearnerState('u1');
    const [rows] = upsertMock.mock.calls[0] as [{ key: string; user_id: string; value: Record<string, unknown> }[]];
    expect(rows.map(r => r.key).sort()).toEqual(['review_pool', 'topic_mastery']);
    expect(rows.every(r => r.user_id === 'u1')).toBe(true);

    await pushLearnerState('u1');
    expect(upsertMock).toHaveBeenCalledTimes(1);

    storageSet(STORAGE_KEYS.topicMastery, { food: entry('food', { sessionsCompleted: 2 }) });
    await pushLearnerState('u1');
    const [second] = upsertMock.mock.calls[1] as [{ key: string }[]];
    expect(second.map(r => r.key)).toEqual(['topic_mastery']);
  });
});
