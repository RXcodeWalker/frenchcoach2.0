/**
 * Leagues (docs/systems/daily-challenge-and-leagues.md §3) — read-only client.
 *
 * Everything is decided on the server: who is in which group, live ranks, the promotion
 * and demotion zones (`_league_zones`), the weekly rollover. The one call is
 * `get_my_league()`, a SECURITY DEFINER function scoped by auth.uid() that returns no user
 * ids. Calling it also heals a missed Monday rollover and joins a learner who already has
 * XP this week. There is nothing to write from the client: XP lands through the ledger.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { classifyRpcError, type RpcFailure } from '../../lib/rpcFailure';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import {
  isLeagueTier,
  type LeagueCohort,
  type LeagueLastWeek,
  type LeagueMember,
  type LeagueStatus,
  type LeagueTier,
  type MyLeague,
} from '../../types/league';

export type LeagueResult = { ok: true; league: MyLeague } | { ok: false; reason: RpcFailure };

const STATUSES: readonly LeagueStatus[] = ['active', 'not_joined', 'needs_username', 'not_global'];

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number.isFinite(num(v, NaN)) ? num(v) : null);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const tier = (v: unknown, fallback: LeagueTier = 'bronze'): LeagueTier => (isLeagueTier(v) ? v : fallback);

function parseMember(raw: unknown): LeagueMember | null {
  const m = obj(raw);
  const username = str(m?.username);
  if (!m || !username) return null;
  return {
    rank: numOrNull(m.rank),
    username,
    avatarEmoji: str(m.avatar_emoji),
    equippedFrame: str(m.equipped_frame),
    equippedNameplate: str(m.equipped_nameplate),
    weeklyXp: num(m.weekly_xp),
    standingTier: tier(m.standing_tier),
    isMe: m.is_me === true,
  };
}

function parseCohort(raw: unknown): LeagueCohort | null {
  const c = obj(raw);
  if (!c) return null;
  const members = Array.isArray(c.members) ? c.members.map(parseMember).filter((m): m is LeagueMember => m !== null) : [];
  return {
    tier: tier(c.tier),
    mixed: c.mixed === true,
    activeMembers: num(c.active_members),
    promoteCount: num(c.promote_count),
    demoteCount: num(c.demote_count),
    promoteMinXp: num(c.promote_min_xp),
    members,
  };
}

function parseLastWeek(raw: unknown): LeagueLastWeek | null {
  const w = obj(raw);
  const weekKey = str(w?.week_key);
  if (!w || !weekKey) return null;
  return {
    weekKey,
    poolTier: tier(w.pool_tier),
    standingTier: tier(w.standing_tier),
    rank: numOrNull(w.rank),
    finalXp: num(w.final_xp),
    promoted: w.promoted === true,
    demoted: w.demoted === true,
    activeMembers: num(w.active_members),
  };
}

/** Exported for tests: the RPC's JSON → `MyLeague`, or null when it is not that shape. */
export function parseMyLeague(raw: unknown): MyLeague | null {
  const r = obj(raw);
  if (!r) return null;
  const status = STATUSES.find(s => s === r.status);
  const weekKey = str(r.week_key);
  if (!status || !weekKey) return null;
  const cohort = parseCohort(r.cohort);
  return {
    status: status === 'active' && !cohort ? 'not_joined' : status,
    weekKey,
    resetsAt: str(r.resets_at) ?? '',
    tier: tier(r.tier),
    myWeeklyXp: num(r.my_weekly_xp),
    cohort: status === 'active' ? cohort : null,
    lastWeek: parseLastWeek(r.last_week),
  };
}

export async function getMyLeague(userId: string | null): Promise<LeagueResult> {
  if (!userId) return { ok: false, reason: 'signed_out' };
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('get_my_league');
    if (error) return { ok: false, reason: classifyRpcError(error) };
    const league = parseMyLeague(data);
    return league ? { ok: true, league } : { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

// ── Last week's card: shown until dismissed, once per finished week ─────────

export function lastWeekCardSeen(weekKey: string): boolean {
  return storageGet<string | null>(STORAGE_KEYS.leagueOutcomeSeen, null) === weekKey;
}

export function markLastWeekCardSeen(weekKey: string): void {
  storageSet(STORAGE_KEYS.leagueOutcomeSeen, weekKey);
}
