// @vitest-environment jsdom
// Friend Duels Phase 2 — claim-recovery + error-mapping unit tests. Mirrors
// dailyChallengeService.test.ts's pattern: mock the Supabase client boundary,
// exercise the real storageGet/storageSet primitives against jsdom's
// localStorage.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  supabaseConfigured: true,
}));

import {
  savePendingDuelClaim,
  getPendingDuelClaim,
  clearPendingDuelClaim,
  getAllPendingDuelClaims,
  isTerminalClaimReason,
  submitDuelAttempt,
  createDuelChallenge,
  respondDuelChallenge,
  startDuelAttempt,
} from '../duelsService';

beforeEach(() => {
  localStorage.clear();
  rpcMock.mockReset();
});

describe('multi-duel claim keying', () => {
  it('savePendingDuelClaim for two different duels keeps both distinct', () => {
    expect(getPendingDuelClaim('A')).toBeNull();
    expect(getPendingDuelClaim('B')).toBeNull();

    savePendingDuelClaim({ duelId: 'A', attemptId: 'attempt-a' });
    savePendingDuelClaim({ duelId: 'B', attemptId: 'attempt-b' });

    expect(getPendingDuelClaim('A')).toEqual({ duelId: 'A', attemptId: 'attempt-a' });
    expect(getPendingDuelClaim('B')).toEqual({ duelId: 'B', attemptId: 'attempt-b' });
  });

  it('clearPendingDuelClaim removes only the targeted duel, leaves the other untouched', () => {
    savePendingDuelClaim({ duelId: 'A', attemptId: 'attempt-a' });
    savePendingDuelClaim({ duelId: 'B', attemptId: 'attempt-b' });

    clearPendingDuelClaim('A');

    expect(getPendingDuelClaim('A')).toBeNull();
    expect(getPendingDuelClaim('B')).toEqual({ duelId: 'B', attemptId: 'attempt-b' });
  });

  it('getAllPendingDuelClaims returns both while pending, then just the remaining one after either is cleared', () => {
    savePendingDuelClaim({ duelId: 'A', attemptId: 'attempt-a' });
    savePendingDuelClaim({ duelId: 'B', attemptId: 'attempt-b' });

    expect(getAllPendingDuelClaims().sort((x, y) => x.duelId.localeCompare(y.duelId))).toEqual([
      { duelId: 'A', attemptId: 'attempt-a' },
      { duelId: 'B', attemptId: 'attempt-b' },
    ]);

    clearPendingDuelClaim('A');
    expect(getAllPendingDuelClaims()).toEqual([{ duelId: 'B', attemptId: 'attempt-b' }]);
  });

  it('clearPendingDuelClaim on an unknown duelId is a safe no-op', () => {
    savePendingDuelClaim({ duelId: 'A', attemptId: 'attempt-a' });
    clearPendingDuelClaim('does-not-exist');
    expect(getPendingDuelClaim('A')).toEqual({ duelId: 'A', attemptId: 'attempt-a' });
  });
});

describe('terminal-clear vs. transient-keep recovery branching', () => {
  it('duel_expired / duel_not_active / attempt_already_claimed are terminal-clear', () => {
    expect(isTerminalClaimReason('duel_expired')).toBe(true);
    expect(isTerminalClaimReason('duel_not_active')).toBe(true);
    expect(isTerminalClaimReason('attempt_already_claimed')).toBe(true);
  });

  it('offline / unknown are transient-keep', () => {
    expect(isTerminalClaimReason('offline')).toBe(false);
    expect(isTerminalClaimReason('unknown')).toBe(false);
  });

  it('a submitDuelAttempt result reporting duel_expired is a terminal-clear reason for the recovery caller', async () => {
    savePendingDuelClaim({ duelId: 'A', attemptId: 'attempt-a' });
    rpcMock.mockResolvedValueOnce({ data: { ok: false, reason: 'duel_expired' }, error: null });

    const result = await submitDuelAttempt('A', 'attempt-a');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('duel_expired');
      expect(isTerminalClaimReason(result.reason)).toBe(true);
      clearPendingDuelClaim('A');
    }
    expect(getPendingDuelClaim('A')).toBeNull();
  });

  it('a submitDuelAttempt RPC error of duel_not_active is terminal-clear', async () => {
    savePendingDuelClaim({ duelId: 'A', attemptId: 'attempt-a' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'duel_not_active' } });

    const result = await submitDuelAttempt('A', 'attempt-a');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('duel_not_active');
      expect(isTerminalClaimReason(result.reason)).toBe(true);
    }
  });

  it('a submitDuelAttempt RPC error of attempt_already_claimed is terminal-clear', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'attempt_already_claimed' } });
    const result = await submitDuelAttempt('A', 'attempt-a');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(isTerminalClaimReason(result.reason)).toBe(true);
  });

  it('a network failure (offline) leaves the pending claim in place — transient-keep', async () => {
    savePendingDuelClaim({ duelId: 'A', attemptId: 'attempt-a' });
    rpcMock.mockRejectedValueOnce(new Error('network error'));

    const result = await submitDuelAttempt('A', 'attempt-a');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(isTerminalClaimReason(result.reason)).toBe(false);
    expect(getPendingDuelClaim('A')).toEqual({ duelId: 'A', attemptId: 'attempt-a' });
  });

  it('an unknown RPC error message leaves the pending claim in place — transient-keep', async () => {
    savePendingDuelClaim({ duelId: 'A', attemptId: 'attempt-a' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'something_unexpected' } });

    const result = await submitDuelAttempt('A', 'attempt-a');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unknown');
      expect(isTerminalClaimReason(result.reason)).toBe(false);
    }
    expect(getPendingDuelClaim('A')).toEqual({ duelId: 'A', attemptId: 'attempt-a' });
  });

  it('an ok:true already_claimed result clears once the caller acts on it', async () => {
    savePendingDuelClaim({ duelId: 'A', attemptId: 'attempt-a' });
    rpcMock.mockResolvedValueOnce({ data: { already_claimed: true, status: 'completed' }, error: null });

    const result = await submitDuelAttempt('A', 'attempt-a');
    expect(result.ok).toBe(true);
    if (result.ok) clearPendingDuelClaim('A');
    expect(getPendingDuelClaim('A')).toBeNull();
  });
});

describe('map*Error substring-to-reason translation', () => {
  it('createDuelChallenge maps every known reason substring', async () => {
    const cases: Array<[string, string]> = [
      ['not_authenticated', 'not_authenticated'],
      ['cannot_duel_self', 'cannot_duel_self'],
      ['duel_rate_limited', 'duel_rate_limited'],
      ['not_friends', 'not_friends'],
      ['unknown_question_set', 'unknown_question_set'],
    ];
    for (const [message, expected] of cases) {
      rpcMock.mockResolvedValueOnce({ data: null, error: { message } });
      const result = await createDuelChallenge('opponent-id', 'set-id');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe(expected);
    }
  });

  it('respondDuelChallenge maps unknown_duel, invalid_action, invalid_actor_for_action', async () => {
    const cases: Array<[string, string]> = [
      ['unknown_duel', 'unknown_duel'],
      ['invalid_action', 'invalid_action'],
      ['invalid_actor_for_action', 'invalid_actor_for_action'],
    ];
    for (const [message, expected] of cases) {
      rpcMock.mockResolvedValueOnce({ data: null, error: { message } });
      const result = await respondDuelChallenge('duel-id', 'accept');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe(expected);
    }
  });

  it('startDuelAttempt maps duel_not_active, already_completed', async () => {
    const cases: Array<[string, string]> = [
      ['duel_not_active', 'duel_not_active'],
      ['already_completed', 'already_completed'],
    ];
    for (const [message, expected] of cases) {
      rpcMock.mockResolvedValueOnce({ data: null, error: { message } });
      const result = await startDuelAttempt('duel-id');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe(expected);
    }
  });

  it('submitDuelAttempt maps envelope-guard reasons', async () => {
    const cases: Array<[string, string]> = [
      ['unknown_envelope', 'unknown_envelope'],
      ['not_original_practice', 'not_original_practice'],
      ['question_set_mismatch', 'question_set_mismatch'],
      ['session_not_bound', 'session_not_bound'],
      ['invalid_envelope_total', 'invalid_envelope_total'],
    ];
    for (const [message, expected] of cases) {
      rpcMock.mockResolvedValueOnce({ data: null, error: { message } });
      const result = await submitDuelAttempt('duel-id', 'attempt-id');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe(expected);
    }
  });

  it('maps invariant_violation to a typed reason, not unknown', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'invariant_violation: accepted duel x has 2 attempts' } });
    const result = await submitDuelAttempt('duel-id', 'attempt-id');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invariant_violation');
  });

  it('an unrecognized error message falls back to unknown', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'totally_unrecognized_error' } });
    const result = await createDuelChallenge('opponent-id', 'set-id');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unknown');
  });

  it('not_participant is no longer a translated reason anywhere in this service (folded into unknown_duel per the RPC design)', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'not_participant' } });
    const result = await respondDuelChallenge('duel-id', 'accept');
    expect(result.ok).toBe(false);
    // 'not_participant' is not in the known-reasons list, so it must fall back to 'unknown' — never surfaced as its own typed reason.
    if (!result.ok) expect(result.reason).toBe('unknown');
  });
});
