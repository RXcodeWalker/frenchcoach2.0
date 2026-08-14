/**
 * Daily Challenge (revised plan Phase 1) — mirrors friendsService.ts's
 * conventions: RPC wrapping with warn-and-degrade on error, no throwing.
 *
 * Score-binding flow (never trusts a client-sent score): start_daily_challenge
 * reserves a server-minted session_id BEFORE the exam runs; ExamMode uses it
 * verbatim instead of minting its own `exam-sim-${Date.now()}`;
 * submit_daily_challenge_attempt then verifies that exact session_id backs
 * the submitted scoring_envelopes row before pulling the real score from it.
 *
 * Claim recovery (Fix 4): savePendingClaim/getPendingClaim/clearPendingClaim
 * are built on the same storageGet/storageSet primitives localTranscriptStore.ts
 * already uses — not a new storage layer. The pending-claim record is the
 * single durable checkpoint written unconditionally the moment ExamMode's
 * scoring machine reaches Completed in daily-challenge mode, before the claim
 * RPC is even attempted — so a reload after a successful /score but a failed
 * claim can retry the claim without redoing the exam.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';

/** UTC ISO day, matching the existing week_key convention — no new boundary rule invented. */
export function todayChallengeDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface DailyChallengeAssignment {
  challengeDate: string;
  questionSetId: string;
}

export type StartDailyChallengeResult =
  | { ok: true; sessionId: string; questionSetId: string }
  | { ok: false; reason: 'not_authenticated' | 'unknown_challenge' | 'already_completed' | 'offline' | 'unknown' };

export type SubmitDailyChallengeResult =
  | { ok: true; alreadyClaimed: boolean; xpAwarded?: number; scoreTotal?: number }
  | { ok: false; reason: 'not_authenticated' | 'unknown_challenge' | 'unknown_envelope' | 'not_original_practice'
      | 'question_set_mismatch' | 'wrong_day' | 'session_not_bound' | 'invalid_envelope_total' | 'offline' | 'unknown' };

function mapStartError(message: string): StartDailyChallengeResult {
  const known = ['not_authenticated', 'unknown_challenge', 'already_completed'] as const;
  for (const reason of known) {
    if (message.includes(reason)) return { ok: false, reason };
  }
  return { ok: false, reason: 'unknown' };
}

function mapSubmitError(message: string): SubmitDailyChallengeResult {
  const known = [
    'not_authenticated', 'unknown_challenge', 'unknown_envelope', 'not_original_practice',
    'question_set_mismatch', 'wrong_day', 'session_not_bound', 'invalid_envelope_total',
  ] as const;
  for (const reason of known) {
    if (message.includes(reason)) return { ok: false, reason };
  }
  return { ok: false, reason: 'unknown' };
}

/** Today's assigned question set, or null if unseeded (scheduled job missed a run) or offline. */
export async function getTodaysChallenge(): Promise<DailyChallengeAssignment | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('daily_challenge_assignments')
      .select('challenge_date, question_set_id')
      .eq('challenge_date', todayChallengeDate())
      .maybeSingle();

    if (error || !data) {
      if (error) console.warn('[dailyChallengeService] getTodaysChallenge failed:', error.message);
      return null;
    }
    return { challengeDate: data.challenge_date, questionSetId: data.question_set_id };
  } catch (err) {
    console.warn('[dailyChallengeService] getTodaysChallenge error:', err);
    return null;
  }
}

/** Whether the caller has already completed today's challenge. */
export async function hasCompletedToday(userId: string): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const { data, error } = await supabase
      .from('daily_challenge_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('challenge_date', todayChallengeDate())
      .maybeSingle();

    if (error) {
      console.warn('[dailyChallengeService] hasCompletedToday failed:', error.message);
      return false;
    }
    return data !== null;
  } catch (err) {
    console.warn('[dailyChallengeService] hasCompletedToday error:', err);
    return false;
  }
}

export async function startDailyChallenge(challengeDate: string): Promise<StartDailyChallengeResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('start_daily_challenge', { p_challenge_date: challengeDate });
    if (error) {
      console.warn('[dailyChallengeService] start failed:', error.message);
      return mapStartError(error.message);
    }
    return { ok: true, sessionId: data.session_id, questionSetId: data.question_set_id };
  } catch (err) {
    console.warn('[dailyChallengeService] start error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

export async function submitDailyChallengeAttempt(challengeDate: string, attemptId: string): Promise<SubmitDailyChallengeResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('submit_daily_challenge_attempt', {
      p_challenge_date: challengeDate,
      p_attempt_id: attemptId,
    });
    if (error) {
      console.warn('[dailyChallengeService] submit failed:', error.message);
      return mapSubmitError(error.message);
    }
    return {
      ok: true,
      alreadyClaimed: data.already_claimed,
      xpAwarded: data.xp_awarded,
      scoreTotal: data.score_total,
    };
  } catch (err) {
    console.warn('[dailyChallengeService] submit error:', err);
    return { ok: false, reason: 'unknown' };
  }
}

// ── Claim recovery (Fix 4) ──────────────────────────────────────────────────

export interface PendingDailyChallengeClaim {
  challengeDate: string;
  attemptId: string;
}

export function savePendingClaim(claim: PendingDailyChallengeClaim): void {
  storageSet(STORAGE_KEYS.dailyChallengePendingClaim, claim);
}

export function getPendingClaim(): PendingDailyChallengeClaim | null {
  return storageGet<PendingDailyChallengeClaim | null>(STORAGE_KEYS.dailyChallengePendingClaim, null);
}

export function clearPendingClaim(): void {
  storageSet(STORAGE_KEYS.dailyChallengePendingClaim, null);
}
