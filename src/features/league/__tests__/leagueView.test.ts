import { describe, it, expect } from 'vitest';
import { lastWeekLine, myStandingLine, zoneOf } from '../leagueView';
import type { LeagueCohort, LeagueMember, LeagueTier } from '../../../types/league';

const member = (rank: number | null, xp: number, standingTier: LeagueTier = 'silver', isMe = false): LeagueMember => ({
  rank, username: `u${rank}`, avatarEmoji: null, equippedFrame: null, equippedNameplate: null, weeklyXp: xp, standingTier, isMe,
});
// The server's _league_zones(8): promote 1, demote 1, minimum 50 XP.
const cohort = (members: LeagueMember[], over: Partial<LeagueCohort> = {}): LeagueCohort => ({
  tier: 'silver', mixed: false, activeMembers: 8, promoteCount: 1, demoteCount: 1, promoteMinXp: 50, members, ...over,
});

describe('zoneOf mirrors _league_finalize_week', () => {
  it('top rank with enough XP promotes, bottom rank demotes, the rest are safe', () => {
    const c = cohort([]);
    expect(zoneOf(member(1, 300), c)).toBe('promote');
    expect(zoneOf(member(4, 100), c)).toBe('safe');
    expect(zoneOf(member(8, 10), c)).toBe('demote');
    expect(zoneOf(member(null, 0), c)).toBe('unranked');
  });

  it('the top rank below the minimum week does not promote', () => {
    expect(zoneOf(member(1, 40), cohort([]))).toBe('safe');
  });

  it('Diamond never promotes and Bronze never demotes', () => {
    const c = cohort([]);
    expect(zoneOf(member(1, 300, 'diamond'), c)).toBe('safe');
    expect(zoneOf(member(8, 10, 'bronze'), c)).toBe('safe');
  });

  it('a group with no demotion zone demotes no one', () => {
    expect(zoneOf(member(4, 1), cohort([], { activeMembers: 4, demoteCount: 0 }))).toBe('safe');
  });
});

describe('copy', () => {
  it('tells the leader how much XP a promotion still needs', () => {
    expect(myStandingLine(member(1, 30, 'silver', true), cohort([]))).toContain('20 more XP');
  });

  it('names the next tier on promotion', () => {
    expect(lastWeekLine({ weekKey: 'w', poolTier: 'silver', standingTier: 'silver', rank: 1, finalXp: 300, promoted: true, demoted: false, activeMembers: 9 }).text)
      .toContain('Promoted to Gold');
  });
});
