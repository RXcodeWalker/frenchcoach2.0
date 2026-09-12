// @vitest-environment jsdom
// Reliability plan §2.6 — backfillSessionsToCloud/flushPendingQueue previously
// hardcoded xp_earned: 0 regardless of what the stored session actually
// earned. Follows dailyChallengeService.test.ts's precedent: real
// storageGet/storageSet against jsdom's localStorage, mocking only the
// Supabase client boundary.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const upsertMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: () => ({ upsert: (...args: unknown[]) => upsertMock(...args) }) },
  supabaseConfigured: true,
}));

import { backfillSessionsToCloud, flushPendingQueue } from '../sessionSync';
import type { StoredSession } from '../sessionSync';
import { STORAGE_KEYS, storageSet } from '../../persistence/storage';

function makeSession(id: string, overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id,
    date: '2026-01-01',
    mode: 'practice',
    topicKey: 'greetings',
    questionText: 'Comment ça va ?',
    transcript: 'Ça va bien',
    wordCount: 3,
    score: 8,
    durationSec: 30,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  upsertMock.mockReset();
  upsertMock.mockResolvedValue({ error: null });
});

describe('backfillSessionsToCloud', () => {
  it('sends the stored session\'s real xpEarned, not a hardcoded 0', async () => {
    const stored = makeSession('s-1', { xpEarned: 42 });

    await backfillSessionsToCloud('user-1', [stored], new Set());

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [row] = upsertMock.mock.calls[0] as [{ xp_earned: number }];
    expect(row.xp_earned).toBe(42);
  });

  it('falls back to 0 for a pre-existing stored session with no xpEarned field', async () => {
    const stored = makeSession('s-2');
    expect(stored.xpEarned).toBeUndefined();

    await backfillSessionsToCloud('user-1', [stored], new Set());

    const [row] = upsertMock.mock.calls[0] as [{ xp_earned: number }];
    expect(row.xp_earned).toBe(0);
  });
});

describe('flushPendingQueue', () => {
  it('sends the queued session\'s real xpEarned, not a hardcoded 0', async () => {
    const stored = makeSession('s-3', { xpEarned: 17 });
    storageSet(STORAGE_KEYS.analytics, {
      sessions: [stored],
      totalWords: 0,
      streak: { count: 0, lastDate: null },
      challengeLog: {},
    });
    storageSet(STORAGE_KEYS.pendingSyncSessionIds, ['s-3']);

    await flushPendingQueue('user-1');

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [row] = upsertMock.mock.calls[0] as [{ xp_earned: number }];
    expect(row.xp_earned).toBe(17);
  });
});
