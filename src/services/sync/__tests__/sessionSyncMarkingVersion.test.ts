// @vitest-environment jsdom
// learn-marking §8.3 — a ladder-scored attempt carries markingVersion in the
// synced feedback blob, so history stays comparable across the scale change.
// The levelCheck itself (five levels of sub-scores) stays on the device.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const upsertMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: () => ({ upsert: (...args: unknown[]) => upsertMock(...args) }) },
  supabaseConfigured: true,
}));

import { pushSessionToCloud } from '../sessionSync';
import type { FeedbackV2, Session } from '../../../types';

function makeSession(id: string, feedback: Partial<FeedbackV2>): Session {
  return {
    id,
    mode: 'practice',
    topicKey: 'family',
    questionText: 'Décris ta famille.',
    transcript: 'Mon père est grand.',
    wordCount: 4,
    score: 6.8,
    xpEarned: 20,
    durationSec: 30,
    feedback: {
      scores: { overall: 6.8, communication: 8, language: 8, accuracy: 10, fluency: 1 },
      cefrLevel: 'A1',
      ...feedback,
    } as FeedbackV2,
    createdAt: '2026-10-20T00:00:00.000Z',
  };
}

beforeEach(() => {
  localStorage.clear();
  upsertMock.mockReset();
  upsertMock.mockResolvedValue({ error: null });
});

describe('stripFeedback markingVersion (learn-marking §8.3)', () => {
  it('keeps markingVersion and drops levelCheck', async () => {
    await pushSessionToCloud('user-1', makeSession('s-1', {
      markingVersion: 'ladder-v1',
      levelCheck: { scheme: 'ladder-v1' } as FeedbackV2['levelCheck'],
    }));
    const [row] = upsertMock.mock.calls[0] as [{ feedback: Record<string, unknown> }];
    expect(row.feedback.markingVersion).toBe('ladder-v1');
    expect(row.feedback).not.toHaveProperty('levelCheck');
  });

  it('a v6 attempt has no markingVersion', async () => {
    await pushSessionToCloud('user-1', makeSession('s-2', {}));
    const [row] = upsertMock.mock.calls[0] as [{ feedback: Record<string, unknown> }];
    expect(row.feedback).not.toHaveProperty('markingVersion');
  });
});
