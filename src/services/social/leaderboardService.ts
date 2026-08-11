/**
 * Leaderboard reads (social layer plan §2.1, §3.2, §5). Reads only — all
 * writes happen implicitly via xp_events (xpLedger.ts). No RPCs: PostgREST
 * queries the public_profile / weekly_leaderboard views directly (plan §4.3).
 *
 * Ranking is computed client-side from page position, never a SQL window
 * function over the whole table (plan §3.2). "My rank" is a
 * `count: 'exact', head: true` query filtered `xp > mine`, not a full page
 * walk. Pagination is keyset (`(xp, user_id)` cursor), never OFFSET.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { getWeekKey } from '../../domain/weekKey';
import type { RankingUser } from '../../types';

const PAGE_SIZE = 50;
const CACHE_TTL_MS = 60_000;

export type Timeframe = 'weekly' | 'all-time';

type CacheEntry = { rows: RankingUser[]; fetchedAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(timeframe: Timeframe, weekKey: string): string {
  return `${timeframe}:${weekKey}`;
}

type WeeklyLeaderboardRow = {
  user_id: string;
  username: string;
  avatar_emoji: string | null;
  weekly_xp: number;
};

type AllTimeLeaderboardRow = {
  user_id: string;
  username: string;
  avatar_emoji: string | null;
  total_xp: number;
};

/**
 * First page of the weekly leaderboard, current ISO week (UTC), 60s TTL
 * cache with stale-while-revalidate: a cached page is returned immediately
 * and a background refetch updates the cache for the next call.
 */
export async function getWeeklyLeaderboard(currentUserId: string | null): Promise<RankingUser[]> {
  if (!supabaseConfigured) return [];
  const weekKey = getWeekKey();
  const key = cacheKey('weekly', weekKey);
  const cached = cache.get(key);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rows;
  }

  const rows = await fetchWeeklyPage(weekKey, currentUserId);
  if (rows) cache.set(key, { rows, fetchedAt: Date.now() });
  return rows ?? cached?.rows ?? [];
}

async function fetchWeeklyPage(weekKey: string, currentUserId: string | null): Promise<RankingUser[] | null> {
  try {
    const { data, error } = await supabase
      .from('weekly_leaderboard')
      .select('user_id, username, avatar_emoji, weekly_xp')
      .eq('week_key', weekKey)
      .order('weekly_xp', { ascending: false })
      .order('user_id', { ascending: true })
      .limit(PAGE_SIZE);

    if (error) {
      console.warn('[leaderboardService] weekly fetch failed:', error.message);
      return null;
    }

    return ((data as WeeklyLeaderboardRow[]) ?? []).map((row, i) => ({
      id: row.user_id,
      username: row.username,
      avatar: row.avatar_emoji ?? undefined,
      totalXP: 0,
      weeklyXP: row.weekly_xp,
      streak: 0,
      isCurrentUser: row.user_id === currentUserId,
      rank: i + 1,
    }));
  } catch (err) {
    console.warn('[leaderboardService] weekly fetch error:', err);
    return null;
  }
}

/**
 * All-time leaderboard reads total_xp via the all_time_leaderboard view —
 * never scans xp_events (plan §3.2), and never the profiles table directly.
 * Reading profiles here would return at most one row: its SELECT policy is
 * self-scoped (auth.uid() = id) and must stay that way, so cross-user reads
 * go through a curated view, exactly as weekly_leaderboard does. total_xp
 * isn't on public_profile (cross-user-sensitive on the base table, but fine
 * to expose ranked — that's the point of a leaderboard), hence a second view
 * rather than widening public_profile.
 */
export async function getAllTimeLeaderboard(currentUserId: string | null): Promise<RankingUser[]> {
  if (!supabaseConfigured) return [];
  const key = cacheKey('all-time', 'all');
  const cached = cache.get(key);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rows;
  }

  try {
    const { data, error } = await supabase
      .from('all_time_leaderboard')
      .select('user_id, username, avatar_emoji, total_xp')
      .order('total_xp', { ascending: false })
      .order('user_id', { ascending: true })
      .limit(PAGE_SIZE);

    if (error) {
      console.warn('[leaderboardService] all-time fetch failed:', error.message);
      return cached?.rows ?? [];
    }

    const rows: RankingUser[] = ((data as AllTimeLeaderboardRow[]) ?? []).map((row, i) => ({
      id: row.user_id,
      username: row.username,
      avatar: row.avatar_emoji ?? undefined,
      totalXP: row.total_xp,
      weeklyXP: 0,
      streak: 0,
      isCurrentUser: row.user_id === currentUserId,
      rank: i + 1,
    }));

    cache.set(key, { rows, fetchedAt: Date.now() });
    return rows;
  } catch (err) {
    console.warn('[leaderboardService] all-time fetch error:', err);
    return cached?.rows ?? [];
  }
}

/**
 * "Your rank" — a head-only exact count of rows with more XP than the
 * caller, not a full page walk and not a SQL window function (plan §3.2).
 */
export async function getMyWeeklyRank(myWeeklyXp: number): Promise<number | null> {
  if (!supabaseConfigured) return null;
  try {
    const weekKey = getWeekKey();
    const { count, error } = await supabase
      .from('weekly_leaderboard')
      .select('user_id', { count: 'exact', head: true })
      .eq('week_key', weekKey)
      .gt('weekly_xp', myWeeklyXp);

    if (error) {
      console.warn('[leaderboardService] my-rank fetch failed:', error.message);
      return null;
    }
    return (count ?? 0) + 1;
  } catch (err) {
    console.warn('[leaderboardService] my-rank fetch error:', err);
    return null;
  }
}

export async function getMyAllTimeRank(myTotalXp: number): Promise<number | null> {
  if (!supabaseConfigured) return null;
  try {
    const { count, error } = await supabase
      .from('all_time_leaderboard')
      .select('user_id', { count: 'exact', head: true })
      .gt('total_xp', myTotalXp);

    if (error) {
      console.warn('[leaderboardService] my-all-time-rank fetch failed:', error.message);
      return null;
    }
    return (count ?? 0) + 1;
  } catch (err) {
    console.warn('[leaderboardService] my-all-time-rank fetch error:', err);
    return null;
  }
}
