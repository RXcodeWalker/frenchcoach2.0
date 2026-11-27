/** Leagues (docs/systems/daily-challenge-and-leagues.md §3). Shapes of `get_my_league()`. */
export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export const LEAGUE_TIER_ORDER: readonly LeagueTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export const isLeagueTier = (v: unknown): v is LeagueTier =>
  typeof v === 'string' && (LEAGUE_TIER_ORDER as readonly string[]).includes(v);

/**
 * `active`: in this week's league. `not_joined`: eligible, no XP yet this week (the first
 * XP joins). `needs_username` / `not_global`: cannot join until that is fixed.
 */
export type LeagueStatus = 'active' | 'not_joined' | 'needs_username' | 'not_global';

export interface LeagueMember {
  /** Rank among members with XP this week; null for a member with none (shown last). */
  rank: number | null;
  username: string;
  avatarEmoji: string | null;
  equippedFrame: string | null;
  equippedNameplate: string | null;
  weeklyXp: number;
  /** The member's own tier (differs from the cohort's in a merged group). */
  standingTier: LeagueTier;
  isMe: boolean;
}

export interface LeagueCohort {
  /** The group's tier label (a quiet week can merge adjacent tiers into one group). */
  tier: LeagueTier;
  mixed: boolean;
  activeMembers: number;
  /** The server's zones (`_league_zones`) — the screen draws exactly these, never its own. */
  promoteCount: number;
  demoteCount: number;
  promoteMinXp: number;
  /** Sorted by rank (unranked last). Members who hid themselves are left out. */
  members: LeagueMember[];
}

export interface LeagueLastWeek {
  weekKey: string;
  poolTier: LeagueTier;
  standingTier: LeagueTier;
  rank: number | null;
  finalXp: number;
  promoted: boolean;
  demoted: boolean;
  activeMembers: number;
}

export interface MyLeague {
  status: LeagueStatus;
  weekKey: string;
  resetsAt: string;
  /** The learner's standing tier (where next week's promotion/demotion is counted from). */
  tier: LeagueTier;
  myWeeklyXp: number;
  cohort: LeagueCohort | null;
  lastWeek: LeagueLastWeek | null;
}
