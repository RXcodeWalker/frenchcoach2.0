import { LEAGUE_TIER_ORDER, type LeagueCohort, type LeagueLastWeek, type LeagueMember, type LeagueTier } from '../../types/league';

/**
 * Display rules for the league screen (docs/systems/daily-challenge-and-leagues.md §3.6).
 * Pure. The zones are the server's (`_league_zones`): this module only reads
 * `promoteCount`/`demoteCount`/`promoteMinXp`, never computes its own.
 */

export const TIER_LABEL: Record<LeagueTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
};

/** The tier chip's hue (inside the chip only, like topic chips): a metal per tier. */
export const TIER_HUE: Record<LeagueTier, number> = {
  bronze: 45,
  silver: 250,
  gold: 85,
  platinum: 200,
  diamond: 295,
};

export const tierIndex = (t: LeagueTier): number => LEAGUE_TIER_ORDER.indexOf(t);
export const tierAbove = (t: LeagueTier): LeagueTier | null => LEAGUE_TIER_ORDER[tierIndex(t) + 1] ?? null;
export const tierBelow = (t: LeagueTier): LeagueTier | null => (tierIndex(t) > 0 ? LEAGUE_TIER_ORDER[tierIndex(t) - 1] : null);

export type Zone = 'promote' | 'demote' | 'safe' | 'unranked';

/**
 * Where a member stands if the week ended now. Mirrors `_league_finalize_week`: promotion
 * needs a top rank AND the minimum week; demotion only in a group with a demotion zone;
 * the tier ends (Diamond, Bronze) have no zone above/below.
 */
export function zoneOf(member: LeagueMember, cohort: LeagueCohort): Zone {
  if (member.rank === null) return 'unranked';
  const canRise = member.standingTier !== 'diamond';
  const canFall = member.standingTier !== 'bronze';
  if (canRise && member.rank <= cohort.promoteCount && member.weeklyXp >= cohort.promoteMinXp) return 'promote';
  if (canFall && cohort.demoteCount > 0 && member.rank > cohort.activeMembers - cohort.demoteCount) return 'demote';
  return 'safe';
}

/** The one line under the learner's own card. Never promises a move the server would not make. */
export function myStandingLine(me: LeagueMember | undefined, cohort: LeagueCohort): string {
  if (!me || me.rank === null) return 'Earn XP to get a place in the table.';
  const zone = zoneOf(me, cohort);
  const above = tierAbove(me.standingTier);
  const below = tierBelow(me.standingTier);
  if (zone === 'promote' && above) return `In the promotion zone: finish here to move up to ${TIER_LABEL[above]}.`;
  if (zone === 'demote' && below) return `In the drop zone: earn more XP to stay in ${TIER_LABEL[me.standingTier]}.`;
  if (above && me.rank <= cohort.promoteCount && me.weeklyXp < cohort.promoteMinXp) {
    const short = cohort.promoteMinXp - me.weeklyXp;
    return `Top of the table: ${short} more XP this week makes it a promotion to ${TIER_LABEL[above]}.`;
  }
  if (!above) return 'Diamond is the top league. Stay active to keep your place.';
  return `Safe for now. Climb into the top ${cohort.promoteCount} to move up to ${TIER_LABEL[above]}.`;
}

/** Last week's card: what happened, in one sentence. */
export function lastWeekLine(w: LeagueLastWeek): { tone: 'up' | 'down' | 'same'; text: string } {
  const place = w.rank !== null ? ` You finished #${w.rank} of ${w.activeMembers}` : ' You finished';
  if (w.promoted) {
    const to = tierAbove(w.standingTier);
    return { tone: 'up', text: `Promoted to ${to ? TIER_LABEL[to] : TIER_LABEL[w.standingTier]}!${place} with ${w.finalXp} XP.` };
  }
  if (w.demoted) {
    const to = tierBelow(w.standingTier);
    return { tone: 'down', text: `Moved down to ${to ? TIER_LABEL[to] : TIER_LABEL[w.standingTier]}.${place} with ${w.finalXp} XP. A fresh week starts now.` };
  }
  if (w.rank === null) return { tone: 'same', text: `You stayed in ${TIER_LABEL[w.standingTier]}.` };
  return { tone: 'same', text: `You stayed in ${TIER_LABEL[w.standingTier]}.${place} with ${w.finalXp} XP.` };
}
