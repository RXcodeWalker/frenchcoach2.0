// Reliability plan §2.6 (Option B) — mysteryBoxService wraps claim_mystery_box,
// warn-and-degrade on error, matching dailyChallengeService.ts's convention.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  supabaseConfigured: true,
}));

import { claimMysteryBox } from '../mysteryBoxService';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('claimMysteryBox', () => {
  it('returns the server-chosen amount on a fresh claim', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, already_claimed: false, xp_awarded: 100 }, error: null });
    const result = await claimMysteryBox();
    expect(result).toEqual({ ok: true, alreadyClaimed: false, xpAwarded: 100 });
  });

  it('reports alreadyClaimed without minting again on a repeat call', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, already_claimed: true, xp_awarded: 100 }, error: null });
    const result = await claimMysteryBox();
    expect(result).toEqual({ ok: true, alreadyClaimed: true, xpAwarded: 100 });
  });

  it('degrades to a typed failure instead of throwing on an RPC error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'not_authenticated' } });
    const result = await claimMysteryBox();
    expect(result).toEqual({ ok: false, reason: 'not_authenticated' });
  });

  it('degrades to reason: unknown on an unrecognized error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'some_other_db_error' } });
    const result = await claimMysteryBox();
    expect(result).toEqual({ ok: false, reason: 'unknown' });
  });
});
