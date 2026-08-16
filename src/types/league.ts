export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export const LEAGUE_TIER_ORDER: readonly LeagueTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export interface LeagueCohortMember {
  userId: string;
  username: string;
  avatarEmoji: string | null;
  liveWeeklyXp: number;
  finalWeeklyXp: number | null;
  rankInCohort: number | null;
  promoted: boolean;
  demoted: boolean;
  isCurrentUser: boolean;
}

export interface MyLeagueStanding {
  cohortId: string;
  weekKey: string;
  poolTier: LeagueTier; // which tier's cohort you're actually competing in this week
  members: LeagueCohortMember[]; // pre-sorted by liveWeeklyXp desc, user_id asc
}

export interface LastWeekOutcome {
  weekKey: string;
  poolTier: LeagueTier;
  finalWeeklyXp: number | null;
  rankInCohort: number | null;
  promoted: boolean;
  demoted: boolean;
}
