/**
 * Friend Duels (Phase 2) — mirrors dailyChallengeService.ts's/friendsService.ts's
 * conventions: RPC-wrap, never throw, map*Error(message) substring-matches
 * known error reasons into a typed discriminated-union result.
 *
 * Score-binding flow (never trusts a client-sent score): identical pattern
 * to Daily Challenge — startDuelAttempt reserves a server-minted session_id
 * BEFORE the exam runs; submitDuelAttempt then verifies that exact session_id
 * backs the submitted scoring_envelopes row before pulling the real score.
 *
 * Claim recovery: unlike Daily Challenge's single-slot pending-claim record,
 * this is keyed by duelId — a user can have several accepted duels in flight
 * at once (no UNIQUE(user_id, day) constraint the way Daily Challenge has),
 * so a single-slot key would let one duel's checkpoint silently overwrite
 * another's. See STORAGE_KEYS.duelPendingClaims for the storage-key rationale.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import type { DuelChallenge } from '../../types/duels';

export type DuelActionReason =
  | 'not_authenticated' | 'cannot_duel_self' | 'duel_rate_limited' | 'not_friends'
  | 'unknown_question_set' | 'unknown_duel' | 'invalid_action' | 'invalid_actor_for_action'
  | 'duel_not_active' | 'already_completed' | 'duel_expired' | 'attempt_already_claimed'
  | 'unknown_envelope' | 'not_original_practice' | 'question_set_mismatch' | 'session_not_bound'
  | 'invalid_envelope_total' | 'invariant_violation' | 'offline' | 'unknown';

const KNOWN_REASONS: readonly DuelActionReason[] = [
  'not_authenticated', 'cannot_duel_self', 'duel_rate_limited', 'not_friends',
  'unknown_question_set', 'unknown_duel', 'invalid_action', 'invalid_actor_for_action',
  'duel_not_active', 'already_completed', 'duel_expired', 'attempt_already_claimed',
  'unknown_envelope', 'not_original_practice', 'question_set_mismatch', 'session_not_bound',
  'invalid_envelope_total', 'invariant_violation',
];

function mapError(message: string): { ok: false; reason: DuelActionReason } {
  for (const reason of KNOWN_REASONS) {
    if (message.includes(reason)) return { ok: false, reason };
  }
  return { ok: false, reason: 'unknown' };
}

export type CreateDuelResult =
  | { ok: true; duelId: string; status: 'pending' }
  | { ok: false; reason: DuelActionReason };

export type RespondDuelResult =
  | { ok: true; status: DuelChallenge['status'] }
  | { ok: false; reason: DuelActionReason };

export type StartDuelAttemptResult =
  | { ok: true; sessionId: string; questionSetId: string; duelId: string }
  | { ok: false; reason: DuelActionReason };

export type SubmitDuelAttemptResult =
  | { ok: true; alreadyClaimed: true; status: DuelChallenge['status'] }
  | {
      ok: true; alreadyClaimed: false; status: 'accepted'; waitingOnOpponent: true; scoreTotal: number;
    }
  | {
      ok: true; alreadyClaimed: false; status: 'completed'; isTie: boolean; winnerUserId: string | null;
      myOutcome: string; myXpAwarded: number; scoreTotal: number;
    }
  | { ok: false; reason: DuelActionReason };

export type SyncDuelStatusResult =
  | { ok: true; status: DuelChallenge['status']; winnerUserId: string | null; isTie: boolean; expiresAt: string | null }
  | { ok: false; reason: DuelActionReason };

export async function createDuelChallenge(opponentUserId: string, questionSetId: string): Promise<CreateDuelResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('create_duel_challenge', {
      p_opponent_user_id: opponentUserId,
      p_question_set_id: questionSetId,
    });
    if (error) {
      console.warn('[duelsService] createDuelChallenge failed:', error.message);
      return mapError(error.message);
    }
    return { ok: true, duelId: data.duel_id, status: 'pending' };
  } catch (err) {
    console.warn('[duelsService] createDuelChallenge error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

export async function respondDuelChallenge(duelId: string, action: 'accept' | 'decline' | 'cancel'): Promise<RespondDuelResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('respond_duel_challenge', { p_duel_id: duelId, p_action: action });
    if (error) {
      console.warn(`[duelsService] respondDuelChallenge(${action}) failed:`, error.message);
      return mapError(error.message);
    }
    return { ok: true, status: data.status };
  } catch (err) {
    console.warn(`[duelsService] respondDuelChallenge(${action}) error:`, err);
    return { ok: false, reason: 'unknown' };
  }
}

export async function startDuelAttempt(duelId: string): Promise<StartDuelAttemptResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('start_duel_attempt', { p_duel_id: duelId });
    if (error) {
      console.warn('[duelsService] startDuelAttempt failed:', error.message);
      return mapError(error.message);
    }
    if (data.ok === false) {
      return { ok: false, reason: data.reason ?? 'unknown' };
    }
    return { ok: true, sessionId: data.session_id, questionSetId: data.question_set_id, duelId: data.duel_id };
  } catch (err) {
    console.warn('[duelsService] startDuelAttempt error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

export async function submitDuelAttempt(duelId: string, attemptId: string): Promise<SubmitDuelAttemptResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('submit_duel_attempt', { p_duel_id: duelId, p_attempt_id: attemptId });
    if (error) {
      console.warn('[duelsService] submitDuelAttempt failed:', error.message);
      return mapError(error.message);
    }
    if (data.ok === false) {
      return { ok: false, reason: data.reason ?? 'unknown' };
    }
    if (data.already_claimed) {
      return { ok: true, alreadyClaimed: true, status: data.status };
    }
    if (data.status === 'completed') {
      return {
        ok: true, alreadyClaimed: false, status: 'completed',
        isTie: data.is_tie, winnerUserId: data.winner_user_id,
        myOutcome: data.my_outcome, myXpAwarded: data.my_xp_awarded, scoreTotal: data.score_total,
      };
    }
    return { ok: true, alreadyClaimed: false, status: 'accepted', waitingOnOpponent: true, scoreTotal: data.score_total };
  } catch (err) {
    console.warn('[duelsService] submitDuelAttempt error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

export async function syncDuelStatus(duelId: string): Promise<SyncDuelStatusResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('sync_duel_status', { p_duel_id: duelId });
    if (error) {
      console.warn('[duelsService] syncDuelStatus failed:', error.message);
      return mapError(error.message);
    }
    return { ok: true, status: data.status, winnerUserId: data.winner_user_id, isTie: data.is_tie, expiresAt: data.expires_at };
  } catch (err) {
    console.warn('[duelsService] syncDuelStatus error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

type DuelChallengeViewRow = {
  duel_id: string;
  challenger_id: string;
  challenger_username: string;
  challenger_avatar_emoji: string | null;
  opponent_id: string;
  opponent_username: string;
  opponent_avatar_emoji: string | null;
  question_set_id: string;
  status: DuelChallenge['status'];
  created_at: string;
  responded_at: string | null;
  expires_at: string | null;
  completed_at: string | null;
  winner_user_id: string | null;
  is_tie: boolean;
};

type DuelAttemptRow = {
  duel_id: string;
  user_id: string;
  score_total: number;
  xp_awarded: number;
  outcome: string;
};

function toDuelChallenge(row: DuelChallengeViewRow, attemptsByUser: Map<string, DuelAttemptRow>): DuelChallenge {
  const myAttempt = null; // caller-relative fields are stitched by the consumer, not here
  void myAttempt;
  const challengerAttempt = attemptsByUser.get(row.challenger_id);
  const opponentAttempt = attemptsByUser.get(row.opponent_id);
  return {
    duelId: row.duel_id,
    challengerId: row.challenger_id,
    challengerUsername: row.challenger_username,
    challengerAvatarEmoji: row.challenger_avatar_emoji,
    opponentId: row.opponent_id,
    opponentUsername: row.opponent_username,
    opponentAvatarEmoji: row.opponent_avatar_emoji,
    questionSetId: row.question_set_id,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    winnerUserId: row.winner_user_id,
    isTie: row.is_tie,
    myAttempt: challengerAttempt
      ? { scoreTotal: challengerAttempt.score_total, xpAwarded: challengerAttempt.xp_awarded, outcome: challengerAttempt.outcome }
      : null,
    opponentAttempt: opponentAttempt
      ? { scoreTotal: opponentAttempt.score_total, xpAwarded: opponentAttempt.xp_awarded, outcome: opponentAttempt.outcome }
      : null,
  };
}

/**
 * All duels involving the caller, with each participant's attempt stitched
 * in via a second query (same two-query stitch pattern friendsService's
 * listFriendships uses for its profile join). myAttempt/opponentAttempt on
 * the returned DuelChallenge are populated per-row as challenger/opponent —
 * callers should re-key against userId to get "my" vs "their" perspective.
 */
export async function listMyDuels(userId: string): Promise<DuelChallenge[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('duel_challenges_view')
      .select('*')
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`);

    if (error) {
      console.warn('[duelsService] listMyDuels failed:', error.message);
      return [];
    }

    const rows = (data as DuelChallengeViewRow[]) ?? [];
    if (rows.length === 0) return [];

    const duelIds = rows.map(r => r.duel_id);
    const { data: attempts, error: attemptsError } = await supabase
      .from('duel_attempts')
      .select('duel_id, user_id, score_total, xp_awarded, outcome')
      .in('duel_id', duelIds);

    if (attemptsError) {
      console.warn('[duelsService] listMyDuels attempts join failed:', attemptsError.message);
      return rows.map(r => toDuelChallenge(r, new Map()));
    }

    const attemptsByDuel = new Map<string, Map<string, DuelAttemptRow>>();
    for (const a of (attempts as DuelAttemptRow[]) ?? []) {
      if (!attemptsByDuel.has(a.duel_id)) attemptsByDuel.set(a.duel_id, new Map());
      attemptsByDuel.get(a.duel_id)!.set(a.user_id, a);
    }

    return rows.map(r => toDuelChallenge(r, attemptsByDuel.get(r.duel_id) ?? new Map()));
  } catch (err) {
    console.warn('[duelsService] listMyDuels error:', err);
    return [];
  }
}

export async function getDuel(duelId: string): Promise<DuelChallenge | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('duel_challenges_view').select('*').eq('duel_id', duelId).maybeSingle();
    if (error || !data) {
      if (error) console.warn('[duelsService] getDuel failed:', error.message);
      return null;
    }

    const { data: attempts, error: attemptsError } = await supabase
      .from('duel_attempts')
      .select('duel_id, user_id, score_total, xp_awarded, outcome')
      .eq('duel_id', duelId);

    if (attemptsError) {
      console.warn('[duelsService] getDuel attempts join failed:', attemptsError.message);
      return toDuelChallenge(data as DuelChallengeViewRow, new Map());
    }

    const attemptsByUser = new Map<string, DuelAttemptRow>();
    for (const a of (attempts as DuelAttemptRow[]) ?? []) {
      attemptsByUser.set(a.user_id, a);
    }

    return toDuelChallenge(data as DuelChallengeViewRow, attemptsByUser);
  } catch (err) {
    console.warn('[duelsService] getDuel error:', err);
    return null;
  }
}

// ── Claim recovery — keyed by duelId (see module header) ───────────────────

export interface PendingDuelClaim {
  duelId: string;
  attemptId: string;
}

function readAllPendingDuelClaims(): Record<string, PendingDuelClaim> {
  return storageGet<Record<string, PendingDuelClaim>>(STORAGE_KEYS.duelPendingClaims, {});
}

export function savePendingDuelClaim(claim: PendingDuelClaim): void {
  storageSet(STORAGE_KEYS.duelPendingClaims, { ...readAllPendingDuelClaims(), [claim.duelId]: claim });
}

export function getPendingDuelClaim(duelId: string): PendingDuelClaim | null {
  return readAllPendingDuelClaims()[duelId] ?? null;
}

/** Global recovery sweep (e.g. on app boot / Home mount) — flushes ALL outstanding
 *  claims, not just the one for whatever duel the user happens to be viewing. */
export function getAllPendingDuelClaims(): PendingDuelClaim[] {
  return Object.values(readAllPendingDuelClaims());
}

export function clearPendingDuelClaim(duelId: string): void {
  const all = readAllPendingDuelClaims();
  if (!(duelId in all)) return;
  const rest: Record<string, PendingDuelClaim> = {};
  for (const key of Object.keys(all)) {
    if (key !== duelId) rest[key] = all[key];
  }
  storageSet(STORAGE_KEYS.duelPendingClaims, rest);
}

/** Terminal-clear reasons: the duel moved to a state where retrying the claim
 *  is pointless (it already resolved out from under the pending claim, e.g.
 *  via the other participant's forfeit-resolution, or was already claimed).
 *  Everything else (offline/unknown/etc.) is transient-keep — leave the claim
 *  in place for the next retry. */
const TERMINAL_CLEAR_REASONS: readonly DuelActionReason[] = ['duel_expired', 'duel_not_active', 'attempt_already_claimed'];

export function isTerminalClaimReason(reason: DuelActionReason): boolean {
  return TERMINAL_CLEAR_REASONS.includes(reason);
}
