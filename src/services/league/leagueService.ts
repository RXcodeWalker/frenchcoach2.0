/**
 * League Power (revised plan i-am-implementing-phase-hashed-karp.md, Part
 * B6) — read-only frontend service. All mutation (cohort assignment,
 * promotion/demotion, tier changes) happens server-side via the weekly
 * assign_weekly_league_cohorts cron RPC; the client only ever reads
 * league_cohort_roster and league_memberships.
 *
 * getLastWeekOutcome queries the exact previous ISO week key directly
 * (computed with the same getWeekKey() algorithm the backend's
 * _league_week_key(p_as_of - interval '7 days') uses), rather than a
 * "fetch top-2 rows, take the second" heuristic — both sides of the
 * client/server boundary use the literal same "week key of (date - 7 days)"
 * definition, so there's no drift between "which row means last week" on
 * the frontend vs. what the backend actually finalized.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { getWeekKey } from '../../domain/weekKey';
import type { LeagueTier, MyLeagueStanding, LastWeekOutcome } from '../../types/league';

type RosterRow = {
  cohort_id: string; week_key: string; pool_tier: LeagueTier; user_id: string;
  username: string; avatar_emoji: string | null; live_weekly_xp: number;
  final_weekly_xp: number | null; rank_in_cohort: number | null;
  promoted: boolean; demoted: boolean;
};

export async function getMyLeagueStanding(userId: string | null): Promise<MyLeagueStanding | null> {
  if (!supabaseConfigured || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('league_cohort_roster')
      .select('*')
      .order('live_weekly_xp', { ascending: false })
      .order('user_id', { ascending: true });

    if (error) { console.warn('[leagueService] getMyLeagueStanding failed:', error.message); return null; }
    const rows = (data as RosterRow[]) ?? [];
    if (rows.length === 0) return null;

    return {
      cohortId: rows[0].cohort_id,
      weekKey: rows[0].week_key,
      poolTier: rows[0].pool_tier,
      members: rows.map(r => ({
        userId: r.user_id, username: r.username, avatarEmoji: r.avatar_emoji,
        liveWeeklyXp: r.live_weekly_xp, finalWeeklyXp: r.final_weekly_xp,
        rankInCohort: r.rank_in_cohort, promoted: r.promoted, demoted: r.demoted,
        isCurrentUser: r.user_id === userId,
      })),
    };
  } catch (err) { console.warn('[leagueService] getMyLeagueStanding error:', err); return null; }
}

export async function getLastWeekOutcome(userId: string | null): Promise<LastWeekOutcome | null> {
  if (!supabaseConfigured || !userId) return null;
  try {
    const lastWeekKey = getWeekKey(new Date(Date.now() - 7 * 86400000));
    const { data, error } = await supabase
      .from('league_memberships')
      .select('week_key, pool_tier, final_weekly_xp, rank_in_cohort, promoted, demoted')
      .eq('user_id', userId)
      .eq('week_key', lastWeekKey)
      .maybeSingle();

    if (error) { console.warn('[leagueService] getLastWeekOutcome failed:', error.message); return null; }
    // final_weekly_xp is NULL until next Monday's run finalizes it -- treat
    // "row exists but not yet finalized" the same as "no row" (nothing to show yet).
    if (!data || data.final_weekly_xp === null) return null;
    return {
      weekKey: data.week_key, poolTier: data.pool_tier as LeagueTier,
      finalWeeklyXp: data.final_weekly_xp, rankInCohort: data.rank_in_cohort,
      promoted: data.promoted, demoted: data.demoted,
    };
  } catch (err) { console.warn('[leagueService] getLastWeekOutcome error:', err); return null; }
}
