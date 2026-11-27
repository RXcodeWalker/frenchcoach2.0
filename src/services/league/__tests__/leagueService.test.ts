import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();
vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  supabaseConfigured: true,
}));

import { getMyLeague, parseMyLeague } from '../leagueService';

const ACTIVE = {
  status: 'active', week_key: '2026-W48', resets_at: '2026-11-30T00:00:00+00:00', tier: 'silver', my_weekly_xp: 120,
  cohort: {
    tier: 'silver', mixed: true, active_members: 2, promote_count: 1, demote_count: 0, promote_min_xp: 150,
    members: [
      { rank: 1, username: 'lea', avatar_emoji: null, weekly_xp: 200, standing_tier: 'silver', is_me: false },
      { rank: 2, username: 'me', avatar_emoji: null, weekly_xp: 120, standing_tier: 'bronze', is_me: true },
    ],
  },
  last_week: { week_key: '2026-W47', pool_tier: 'bronze', standing_tier: 'bronze', rank: 1, final_xp: 300, promoted: true, demoted: false, active_members: 6 },
};

beforeEach(() => rpcMock.mockReset());

describe('parseMyLeague', () => {
  it('reads the RPC shape', () => {
    const l = parseMyLeague(ACTIVE)!;
    expect(l.tier).toBe('silver');
    expect(l.cohort?.members.map(m => m.isMe)).toEqual([false, true]);
    expect(l.cohort?.promoteMinXp).toBe(150);
    expect(l.lastWeek?.promoted).toBe(true);
  });

  it('an active status without a cohort reads as not joined; other statuses carry no cohort', () => {
    expect(parseMyLeague({ ...ACTIVE, cohort: null })!.status).toBe('not_joined');
    expect(parseMyLeague({ ...ACTIVE, status: 'not_global' })!.cohort).toBeNull();
  });

  it('rejects an unknown status or a bad tier', () => {
    expect(parseMyLeague({ ...ACTIVE, status: 'champion' })).toBeNull();
    expect(parseMyLeague({ ...ACTIVE, tier: 'mithril' })!.tier).toBe('bronze');
  });
});

describe('getMyLeague', () => {
  it('needs a signed-in user and never calls the server otherwise', async () => {
    expect(await getMyLeague(null)).toEqual({ ok: false, reason: 'signed_out' });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('calls get_my_league with no arguments', async () => {
    rpcMock.mockResolvedValue({ data: ACTIVE, error: null });
    const r = await getMyLeague('u1');
    expect(rpcMock).toHaveBeenCalledWith('get_my_league');
    expect(r.ok).toBe(true);
  });

  it('says "not deployed" when the migration is not applied yet', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    expect(await getMyLeague('u1')).toEqual({ ok: false, reason: 'not_deployed' });
  });
});
