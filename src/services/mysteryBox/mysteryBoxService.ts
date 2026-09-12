/**
 * Mystery Box (reliability plan §2.6, Option B) — server-side claim.
 * claim_mystery_box (backend/supabase/migrations/20260912093000) is the sole
 * source of truth for both "has this user already claimed today" and the
 * reward amount itself (chosen server-side, never client-submitted) — mirrors
 * dailyChallengeService.ts's RPC-wrapping convention: warn-and-degrade on
 * error, no throwing.
 *
 * Unlike Daily Challenge, there is no local ADD_XP dispatch here: award_xp
 * (called internally by the RPC) writes directly to the server xp_events
 * ledger, and profiles.total_xp/local progression catch up through the
 * normal cloud-sync/hydration path — same precedent as DailyChallenge.tsx,
 * which also never dispatches ADD_XP for its RPC-awarded XP.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';

export type ClaimMysteryBoxResult =
  | { ok: true; alreadyClaimed: boolean; xpAwarded: number }
  | { ok: false; reason: 'not_authenticated' | 'offline' | 'unknown' };

export async function claimMysteryBox(): Promise<ClaimMysteryBoxResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('claim_mystery_box');
    if (error) {
      console.warn('[mysteryBoxService] claim failed:', error.message);
      if (error.message.includes('not_authenticated')) return { ok: false, reason: 'not_authenticated' };
      return { ok: false, reason: 'unknown' };
    }
    return { ok: true, alreadyClaimed: data.already_claimed, xpAwarded: data.xp_awarded };
  } catch (err) {
    console.warn('[mysteryBoxService] claim error:', err);
    return { ok: false, reason: 'unknown' };
  }
}
