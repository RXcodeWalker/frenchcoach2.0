// @vitest-environment jsdom
// Phase 4 (Shadowing Mode) — unit tests for shadowingService.ts. Header and
// mocking copied from duelsService.test.ts's pattern: mock the Supabase
// boundary, exercise the real storageGet/storageSet primitives against
// jsdom's localStorage.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();
const upsertMock = vi.fn();
const fromMock = vi.fn(() => ({ upsert: upsertMock }));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => (rpcMock as (...a: unknown[]) => unknown)(...args),
    from: (...args: unknown[]) => (fromMock as (...a: unknown[]) => unknown)(...args),
  },
  supabaseConfigured: true,
}));

import {
  assessmentToShadowingRecord,
  appendShadowingAttempt,
  bestScoreForPhrase,
  pushShadowingAttempt,
  getCoachingQuota,
  isDetailedFeedbackEnabled,
  setDetailedFeedbackEnabled,
  MAX_SHADOWING_ATTEMPTS,
  type ShadowingAttemptRecord,
} from '../shadowingService';
import type { PronunciationAssessment } from '../../../domain/pronunciation/types';

function makeAssessment(overrides: Partial<PronunciationAssessment> = {}): PronunciationAssessment {
  return {
    score: 82,
    transcript: 'Les amis arrivent.',
    issues: [],
    words: [],
    provider: 'azure',
    subScores: { accuracy: 85, fluency: 80, completeness: 90, prosody: null },
    couldNotAssess: false,
    couldNotAssessReason: null,
    assessorVersion: 'v3',
    prosodyMetrics: null,
    coaching: null,
    ...overrides,
  };
}

function makeRecord(overrides: Partial<ShadowingAttemptRecord> = {}): ShadowingAttemptRecord {
  return {
    id: `shad_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    phraseId: 'shad_liaison_01',
    provider: 'azure',
    assessorVersion: 'v3',
    score: 80,
    couldNotAssess: false,
    subScores: null,
    rhythmMetrics: null,
    coachingDelivered: false,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  rpcMock.mockReset();
  upsertMock.mockReset();
  fromMock.mockClear();
});

describe('assessmentToShadowingRecord', () => {
  it('maps subScores/rhythmMetrics/provider/assessorVersion from the assessment', () => {
    const assessment = makeAssessment({
      provider: 'azure',
      assessorVersion: 'v3',
      subScores: { accuracy: 91, fluency: 88, completeness: 95, prosody: null },
      prosodyMetrics: {
        speechRateWpm: 120,
        articulationRateSyllPerSec: 4.2,
        pauseCount: 1,
        longestPauseMs: 200,
        pauseRatio: 0.05,
        rhythmRegularity: 0.8,
        finalSyllableLengthening: false,
      },
    });
    const record = assessmentToShadowingRecord('id1', 'shad_liaison_01', assessment);
    expect(record.provider).toBe('azure');
    expect(record.assessorVersion).toBe('v3');
    expect(record.subScores).toEqual(assessment.subScores);
    expect(record.rhythmMetrics).toEqual(assessment.prosodyMetrics);
    expect(record.phraseId).toBe('shad_liaison_01');
    expect(record.coachingDelivered).toBe(false);
  });

  it('preserves score: null on couldNotAssess — never coerced to 0', () => {
    const assessment = makeAssessment({ score: null, couldNotAssess: true, subScores: null });
    const record = assessmentToShadowingRecord('id2', 'shad_liaison_01', assessment);
    expect(record.score).toBeNull();
    expect(record.couldNotAssess).toBe(true);
  });

  it('sets coachingDelivered true when assessment.coaching is present', () => {
    const assessment = makeAssessment({
      coaching: { summary: 's', topPriority: 'p', tips: [], grounded: true },
    });
    const record = assessmentToShadowingRecord('id3', 'shad_liaison_01', assessment);
    expect(record.coachingDelivered).toBe(true);
  });

  it('defaults assessorVersion to "unknown" when absent', () => {
    const assessment = makeAssessment({ assessorVersion: undefined });
    const record = assessmentToShadowingRecord('id4', 'shad_liaison_01', assessment);
    expect(record.assessorVersion).toBe('unknown');
  });
});

describe('appendShadowingAttempt', () => {
  it('ring-buffers at MAX_SHADOWING_ATTEMPTS', () => {
    let history: ShadowingAttemptRecord[] = [];
    for (let i = 0; i < MAX_SHADOWING_ATTEMPTS + 10; i++) {
      history = appendShadowingAttempt(makeRecord({ id: `id_${i}` }));
    }
    expect(history.length).toBe(MAX_SHADOWING_ATTEMPTS);
    // Oldest 10 should have been evicted — the first surviving id is id_10.
    expect(history[0].id).toBe('id_10');
    expect(history[history.length - 1].id).toBe(`id_${MAX_SHADOWING_ATTEMPTS + 9}`);
  });
});

describe('bestScoreForPhrase', () => {
  it('ignores other phrases', () => {
    const history = [
      makeRecord({ id: 'a', phraseId: 'shad_liaison_01', score: 70 }),
      makeRecord({ id: 'b', phraseId: 'shad_nasal_01', score: 99 }),
    ];
    const best = bestScoreForPhrase(history, 'shad_liaison_01');
    expect(best?.id).toBe('a');
  });

  it('ignores couldNotAssess records', () => {
    const history = [
      makeRecord({ id: 'a', phraseId: 'shad_liaison_01', score: null, couldNotAssess: true }),
      makeRecord({ id: 'b', phraseId: 'shad_liaison_01', score: 60 }),
    ];
    const best = bestScoreForPhrase(history, 'shad_liaison_01');
    expect(best?.id).toBe('b');
  });

  it('returns null when no eligible records exist for the phrase', () => {
    expect(bestScoreForPhrase([], 'shad_liaison_01')).toBeNull();
  });

  it('returns the highest score among multiple eligible attempts', () => {
    const history = [
      makeRecord({ id: 'a', phraseId: 'shad_liaison_01', score: 60 }),
      makeRecord({ id: 'b', phraseId: 'shad_liaison_01', score: 95 }),
      makeRecord({ id: 'c', phraseId: 'shad_liaison_01', score: 80 }),
    ];
    const best = bestScoreForPhrase(history, 'shad_liaison_01');
    expect(best?.id).toBe('b');
  });
});

describe('pushShadowingAttempt', () => {
  it('short-circuits on an already-synced id (no network call)', async () => {
    localStorage.setItem(
      'frenchCoach_syncedShadowingIds',
      JSON.stringify(['id-synced']),
    );
    const ok = await pushShadowingAttempt('user-1', makeRecord({ id: 'id-synced' }));
    expect(ok).toBe(true);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('calls upsert with ignoreDuplicates: true (append-only grants regression guard)', async () => {
    upsertMock.mockResolvedValueOnce({ error: null });
    const ok = await pushShadowingAttempt('user-1', makeRecord({ id: 'id-new' }));
    expect(ok).toBe(true);
    expect(fromMock).toHaveBeenCalledWith('shadowing_attempts');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'id-new', user_id: 'user-1' }),
      { onConflict: 'id', ignoreDuplicates: true },
    );
  });

  it('on error queues the id and returns false; never throws', async () => {
    upsertMock.mockResolvedValueOnce({ error: { message: 'boom' } });
    const ok = await pushShadowingAttempt('user-1', makeRecord({ id: 'id-fail' }));
    expect(ok).toBe(false);
    const pending = JSON.parse(localStorage.getItem('frenchCoach_pendingSyncShadowingIds') ?? '[]');
    expect(pending).toContain('id-fail');
  });

  it('on a thrown network error, returns false and never throws', async () => {
    upsertMock.mockRejectedValueOnce(new Error('network down'));
    const ok = await pushShadowingAttempt('user-1', makeRecord({ id: 'id-throw' }));
    expect(ok).toBe(false);
    const pending = JSON.parse(localStorage.getItem('frenchCoach_pendingSyncShadowingIds') ?? '[]');
    expect(pending).toContain('id-throw');
  });
});

describe('getCoachingQuota', () => {
  it('returns null when supabaseConfigured is false', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/supabase', () => ({
      supabase: { rpc: rpcMock, from: fromMock },
      supabaseConfigured: false,
    }));
    const mod = await import('../shadowingService');
    const quota = await mod.getCoachingQuota();
    expect(quota).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
    vi.doUnmock('../../../lib/supabase');
    vi.resetModules();
  });

  it('returns null on an RPC error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'not_authenticated' } });
    const quota = await getCoachingQuota();
    expect(quota).toBeNull();
  });

  it('returns null on a thrown network error', async () => {
    rpcMock.mockRejectedValueOnce(new Error('offline'));
    const quota = await getCoachingQuota();
    expect(quota).toBeNull();
  });

  it('maps {used, limit, remaining} from the RPC payload', async () => {
    rpcMock.mockResolvedValueOnce({ data: { used: 1, limit: 3, remaining: 2 }, error: null });
    const quota = await getCoachingQuota();
    expect(quota).toEqual({ used: 1, limit: 3, remaining: 2 });
  });

  it('derives remaining when the payload omits it', async () => {
    rpcMock.mockResolvedValueOnce({ data: { used: 2, limit: 3 }, error: null });
    const quota = await getCoachingQuota();
    expect(quota).toEqual({ used: 2, limit: 3, remaining: 1 });
  });
});

describe('isDetailedFeedbackEnabled / setDetailedFeedbackEnabled', () => {
  it('defaults to false on empty storage', () => {
    expect(isDetailedFeedbackEnabled()).toBe(false);
  });

  it('round-trips through storage', () => {
    setDetailedFeedbackEnabled(true);
    expect(isDetailedFeedbackEnabled()).toBe(true);
    setDetailedFeedbackEnabled(false);
    expect(isDetailedFeedbackEnabled()).toBe(false);
  });
});
