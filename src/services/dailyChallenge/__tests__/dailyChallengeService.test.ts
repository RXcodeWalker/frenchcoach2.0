// @vitest-environment jsdom
// Daily Challenge Phase 1, Fix 4 — claim-recovery integration test. Simulates
// submitDailyChallengeAttempt throwing (network failure): the pending-claim
// record must survive in storage. A second call succeeding must clear it.
// This exercises the real storageGet/storageSet primitives against jsdom's
// localStorage (matching reviewPool.test.ts's precedent), mocking only the
// Supabase client boundary the RPC call crosses.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  supabaseConfigured: true,
}));

import {
  savePendingClaim,
  getPendingClaim,
  clearPendingClaim,
  submitDailyChallengeAttempt,
} from '../dailyChallengeService';

beforeEach(() => {
  localStorage.clear();
  rpcMock.mockReset();
});

describe('claim recovery (Fix 4)', () => {
  it('savePendingClaim persists through storage, survives a fresh read', () => {
    expect(getPendingClaim()).toBeNull();
    savePendingClaim({ challengeDate: '2026-08-14', attemptId: 'attempt-1' });
    expect(getPendingClaim()).toEqual({ challengeDate: '2026-08-14', attemptId: 'attempt-1' });
  });

  it('a failed submitDailyChallengeAttempt call leaves the pending-claim record untouched', async () => {
    savePendingClaim({ challengeDate: '2026-08-14', attemptId: 'attempt-1' });
    rpcMock.mockRejectedValueOnce(new Error('network error'));

    // submitDailyChallengeAttempt itself catches and returns a result rather
    // than throwing — mirrors the real service's try/catch, which is what
    // lets ExamMode's inline .catch() and DailyChallenge's mount effect both
    // treat a network failure as "stays pending," not a crash.
    const result = await submitDailyChallengeAttempt('2026-08-14', 'attempt-1');
    expect(result.ok).toBe(false);
    expect(getPendingClaim()).toEqual({ challengeDate: '2026-08-14', attemptId: 'attempt-1' });
  });

  it('a second call succeeding clears the pending claim once the caller acts on ok:true', async () => {
    savePendingClaim({ challengeDate: '2026-08-14', attemptId: 'attempt-1' });
    rpcMock.mockResolvedValueOnce({ data: { already_claimed: false, xp_awarded: 40, score_total: 32 }, error: null });

    const result = await submitDailyChallengeAttempt('2026-08-14', 'attempt-1');
    expect(result.ok).toBe(true);

    // submitDailyChallengeAttempt itself never touches the pending-claim
    // record — callers (ExamMode's inline attempt, DailyChallenge's mount
    // effect) are responsible for clearing it on ok:true, exactly like the
    // real call sites do.
    if (result.ok) clearPendingClaim();
    expect(getPendingClaim()).toBeNull();
  });

  it('a replayed/idempotent already_claimed:true result also clears the pending claim', async () => {
    savePendingClaim({ challengeDate: '2026-08-14', attemptId: 'attempt-1' });
    rpcMock.mockResolvedValueOnce({ data: { already_claimed: true }, error: null });

    const result = await submitDailyChallengeAttempt('2026-08-14', 'attempt-1');
    expect(result.ok).toBe(true);
    if (result.ok) clearPendingClaim();
    expect(getPendingClaim()).toBeNull();
  });

  it('an RPC-level error (session_not_bound etc.) leaves the pending claim in place', async () => {
    savePendingClaim({ challengeDate: '2026-08-14', attemptId: 'attempt-1' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'session_not_bound' } });

    const result = await submitDailyChallengeAttempt('2026-08-14', 'attempt-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('session_not_bound');
    expect(getPendingClaim()).toEqual({ challengeDate: '2026-08-14', attemptId: 'attempt-1' });
  });
});
