/**
 * Shadowing Mode (Phase 4) — mirrors dailyChallengeService.ts's/duelsService.ts's
 * conventions: guard supabaseConfigured first, try/catch every call, never
 * throw, console.warn('[shadowingService] ...') on both the `error` branch
 * and the catch.
 *
 * Local history via storageGet/storageSet + STORAGE_KEYS.shadowingHistory —
 * the same bounded ring buffer as pronunciationHistoryService.ts. No new
 * storage layer.
 *
 * pushShadowingAttempt uses .upsert(row, { onConflict: 'id', ignoreDuplicates: true })
 * — INSERT ... ON CONFLICT DO NOTHING, which shadowing_attempts' append-only
 * grants (SELECT + INSERT only, no UPDATE/DELETE — see the Phase 4 migration)
 * allow. Reuses syncQueue.ts's shared ID-queue primitives (first non-
 * pronunciationSync consumer) with new syncedShadowingIds/
 * pendingSyncShadowingIds keys, as pronunciationSync.ts does for its own
 * table. Do NOT change this to a plain .upsert() without ignoreDuplicates —
 * that would require UPDATE privilege, which this table deliberately does
 * not grant (see xpLedger.ts's header for the same idempotent-insert
 * rationale on a different append-only table).
 *
 * No pull/hydrate path in v1 — the UI reads local history only; cloud rows
 * exist for later analytics (plan §11, "out of scope").
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import {
  getSyncedIds,
  addSyncedId,
  addPendingId,
  removePendingId,
} from '../sync/syncQueue';
import type { PronunciationAssessment } from '../../domain/pronunciation/types';

export const MAX_SHADOWING_ATTEMPTS = 200;

export interface ShadowingAttemptRecord {
  id: string;
  createdAt: string; // ISO
  phraseId: string;
  provider: PronunciationAssessment['provider'];
  assessorVersion: string;
  score: number | null;
  couldNotAssess: boolean;
  subScores: PronunciationAssessment['subScores'];
  rhythmMetrics: PronunciationAssessment['prosodyMetrics'] | null;
  coachingDelivered: boolean;
}

export function assessmentToShadowingRecord(
  id: string,
  phraseId: string,
  assessment: PronunciationAssessment,
): ShadowingAttemptRecord {
  return {
    id,
    createdAt: new Date().toISOString(),
    phraseId,
    provider: assessment.provider,
    assessorVersion: assessment.assessorVersion ?? 'unknown',
    // null iff couldNotAssess — never coerced to 0 (contract stability policy, domain/pronunciation/types.ts).
    score: assessment.score,
    couldNotAssess: assessment.couldNotAssess,
    subScores: assessment.subScores,
    rhythmMetrics: assessment.prosodyMetrics ?? null,
    coachingDelivered: assessment.coaching != null,
  };
}

export function getShadowingHistory(): ShadowingAttemptRecord[] {
  return storageGet<ShadowingAttemptRecord[]>(STORAGE_KEYS.shadowingHistory, []);
}

/** Append one attempt, keeping only the most recent MAX_SHADOWING_ATTEMPTS. */
export function appendShadowingAttempt(record: ShadowingAttemptRecord): ShadowingAttemptRecord[] {
  const existing = getShadowingHistory();
  const next = [...existing, record].slice(-MAX_SHADOWING_ATTEMPTS);
  storageSet(STORAGE_KEYS.shadowingHistory, next);
  return next;
}

/** Most recent assessed (non-couldNotAssess) attempt for a given phrase, or null. */
export function bestScoreForPhrase(
  history: ShadowingAttemptRecord[],
  phraseId: string,
): ShadowingAttemptRecord | null {
  let best: ShadowingAttemptRecord | null = null;
  for (const record of history) {
    if (record.phraseId !== phraseId) continue;
    if (record.couldNotAssess || record.score === null) continue;
    if (best === null || record.score! > best.score!) best = record;
  }
  return best;
}

type CloudShadowingRow = {
  id: string;
  user_id: string;
  phrase_id: string;
  provider: string;
  assessor_version: string;
  score: number | null;
  could_not_assess: boolean;
  sub_scores: PronunciationAssessment['subScores'];
  rhythm_metrics: PronunciationAssessment['prosodyMetrics'] | null;
  coaching_delivered: boolean;
  schema_version: number;
};

const SHADOWING_SCHEMA_VERSION = 1;

/**
 * Idempotent push: INSERT ... ON CONFLICT DO NOTHING via ignoreDuplicates,
 * matching the append-only grants on shadowing_attempts. Short-circuits on
 * an already-synced id (no network call), same as pronunciationSync.ts's push.
 */
export async function pushShadowingAttempt(
  userId: string,
  record: ShadowingAttemptRecord,
): Promise<boolean> {
  if (!supabaseConfigured) return false;

  const syncedIds = getSyncedIds(STORAGE_KEYS.syncedShadowingIds);
  if (syncedIds.has(record.id)) return true;

  try {
    const row: CloudShadowingRow = {
      id: record.id,
      user_id: userId,
      phrase_id: record.phraseId,
      provider: record.provider,
      assessor_version: record.assessorVersion,
      score: record.score,
      could_not_assess: record.couldNotAssess,
      sub_scores: record.subScores,
      rhythm_metrics: record.rhythmMetrics,
      coaching_delivered: record.coachingDelivered,
      schema_version: SHADOWING_SCHEMA_VERSION,
    };
    const { error } = await supabase
      .from('shadowing_attempts')
      .upsert(row, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.warn('[shadowingService] pushShadowingAttempt failed:', error.message);
      addPendingId(STORAGE_KEYS.pendingSyncShadowingIds, record.id);
      return false;
    }

    addSyncedId(STORAGE_KEYS.syncedShadowingIds, record.id);
    removePendingId(STORAGE_KEYS.pendingSyncShadowingIds, record.id);
    return true;
  } catch (err) {
    console.warn('[shadowingService] pushShadowingAttempt error:', err);
    addPendingId(STORAGE_KEYS.pendingSyncShadowingIds, record.id);
    return false;
  }
}

// ── Detailed-coaching quota (display-only — server is always authoritative) ──

export interface CoachingQuota {
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Reads today's UTC coaching quota via get_shadowing_coaching_quota(). Never
 * throws: returns null on offline, signed-out (RPC-level not_authenticated),
 * or any network/RPC error — the UI hides the counter rather than guessing
 * (plan §5: "A failed quota read is silent (counter hidden)").
 */
export async function getCoachingQuota(): Promise<CoachingQuota | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await supabase.rpc('get_shadowing_coaching_quota');
    if (error) {
      console.warn('[shadowingService] getCoachingQuota failed:', error.message);
      return null;
    }
    if (!data || typeof data.used !== 'number' || typeof data.limit !== 'number') {
      return null;
    }
    return {
      used: data.used,
      limit: data.limit,
      remaining: typeof data.remaining === 'number' ? data.remaining : Math.max(0, data.limit - data.used),
    };
  } catch (err) {
    console.warn('[shadowingService] getCoachingQuota error:', err);
    return null;
  }
}

// ── Detailed-feedback toggle preference — local-only, default OFF ──────────

export function isDetailedFeedbackEnabled(): boolean {
  return storageGet<boolean>(STORAGE_KEYS.shadowingDetailedFeedback, false);
}

export function setDetailedFeedbackEnabled(value: boolean): void {
  storageSet(STORAGE_KEYS.shadowingDetailedFeedback, value);
}
