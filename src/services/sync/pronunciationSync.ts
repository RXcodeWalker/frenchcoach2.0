/**
 * Pronunciation history cloud sync (accent-analyzer plan §13, D3). Shape
 * mirrors sessionSync.ts (push/pull/backfill/hydrate) with coachSync.ts's
 * schema-version + migrateRow mechanism grafted on, per D3's explicit
 * instruction to adopt that mechanism wholesale. First consumer of the
 * shared syncQueue.ts primitives (plan R2) rather than an inline copy.
 *
 * client_request_id (== the local record's `id`) is unique per user in the
 * pronunciation_attempts table (see the migration) — upsert on that conflict
 * key makes push idempotent, matching plan §13's idempotency requirement.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS } from '../persistence/storage';
import {
  getSyncedIds,
  addSyncedId,
  addSyncedIds,
  getPendingIds,
  addPendingId,
  removePendingId,
} from './syncQueue';
import {
  getPronunciationHistory,
  setPronunciationHistory,
  type PronunciationAttemptRecord,
} from '../pronunciation/pronunciationHistoryService';

// ── Schema version ───────────────────────────────────────────────────────────
// Versions the cloud row <-> PronunciationAttemptRecord mapping only, per
// coachSync's COACH_SYNC_SCHEMA_VERSION precedent. Independent from
// PRONUNCIATION_ASSESSOR_VERSION (the assessment pipeline's own version).
export const PRONUNCIATION_SYNC_SCHEMA_VERSION = 1;

const SYNC_WINDOW_DAYS = 90; // plan §12: reuse the existing SYNC_WINDOW_DAYS precedent

type CloudPronunciationRow = {
  id: string;
  user_id: string;
  client_request_id: string;
  mode: string;
  locale: string;
  provider: string;
  assessor_version: string;
  score: number | null;
  could_not_assess: boolean;
  confidence_overall: number | null;
  reference_text: string | null;
  transcript: string | null;
  schema_version: number;
  created_at: string;
};

// ── Row mappers ──────────────────────────────────────────────────────────────

function recordToRow(userId: string, record: PronunciationAttemptRecord): CloudPronunciationRow {
  return {
    id: record.id,
    user_id: userId,
    client_request_id: record.id,
    mode: record.mode,
    locale: record.locale,
    provider: record.provider,
    assessor_version: record.assessorVersion,
    score: record.score,
    could_not_assess: record.couldNotAssess,
    confidence_overall: record.confidenceOverall,
    reference_text: record.referenceText,
    transcript: record.transcript,
    schema_version: PRONUNCIATION_SYNC_SCHEMA_VERSION,
    created_at: record.createdAt,
  };
}

function migrateRow(row: CloudPronunciationRow): CloudPronunciationRow {
  // No migrations needed at v1. Add cases here as PRONUNCIATION_SYNC_SCHEMA_VERSION bumps.
  return row;
}

export function rowToRecord(row: CloudPronunciationRow): PronunciationAttemptRecord | null {
  if (row.schema_version > PRONUNCIATION_SYNC_SCHEMA_VERSION) {
    // Written by a newer client — skip rather than misinterpret (coachSync precedent).
    console.warn('[pronunciationSync] skipping row with unknown schema_version', row.schema_version, row.id);
    return null;
  }

  const normalized = row.schema_version < PRONUNCIATION_SYNC_SCHEMA_VERSION
    ? migrateRow(row)
    : row;

  return {
    id: normalized.id,
    createdAt: normalized.created_at,
    mode: normalized.mode as PronunciationAttemptRecord['mode'],
    locale: normalized.locale,
    provider: normalized.provider as PronunciationAttemptRecord['provider'],
    assessorVersion: normalized.assessor_version,
    score: normalized.score,
    couldNotAssess: normalized.could_not_assess,
    confidenceOverall: normalized.confidence_overall,
    referenceText: normalized.reference_text ?? '',
    transcript: normalized.transcript ?? '',
  };
}

// ── Pure merge ───────────────────────────────────────────────────────────────

export function mergeAttemptLists(
  local: PronunciationAttemptRecord[],
  cloud: PronunciationAttemptRecord[],
): PronunciationAttemptRecord[] {
  const byId = new Map<string, PronunciationAttemptRecord>();
  for (const r of local) byId.set(r.id, r);
  for (const r of cloud) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ── Pull ─────────────────────────────────────────────────────────────────────

async function pullAttemptsFromCloud(userId: string): Promise<PronunciationAttemptRecord[] | null> {
  if (!supabaseConfigured) return null;
  try {
    const cutoff = new Date(Date.now() - SYNC_WINDOW_DAYS * 86400000).toISOString();
    const { data, error } = await supabase
      .from('pronunciation_attempts')
      .select('id, user_id, client_request_id, mode, locale, provider, assessor_version, score, could_not_assess, confidence_overall, reference_text, transcript, schema_version, created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code !== 'PGRST116') {
        console.warn('[pronunciationSync] pull failed:', error.message);
      }
      return null;
    }

    const records: PronunciationAttemptRecord[] = [];
    for (const row of data ?? []) {
      const rec = rowToRecord(row as CloudPronunciationRow);
      if (rec) records.push(rec);
    }
    return records;
  } catch (err) {
    console.warn('[pronunciationSync] pull error:', err);
    return null;
  }
}

// ── Push ─────────────────────────────────────────────────────────────────────

export async function pushPronunciationAttempt(
  userId: string,
  record: PronunciationAttemptRecord,
): Promise<boolean> {
  if (!supabaseConfigured) return false;

  const syncedIds = getSyncedIds(STORAGE_KEYS.syncedPronunciationIds);
  if (syncedIds.has(record.id)) return true;

  try {
    const row = recordToRow(userId, record);
    const { error } = await supabase.from('pronunciation_attempts').upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('[pronunciationSync] push failed:', error.message);
      addPendingId(STORAGE_KEYS.pendingSyncPronunciationIds, record.id);
      return false;
    }

    addSyncedId(STORAGE_KEYS.syncedPronunciationIds, record.id);
    removePendingId(STORAGE_KEYS.pendingSyncPronunciationIds, record.id);
    return true;
  } catch (err) {
    console.warn('[pronunciationSync] push error:', err);
    addPendingId(STORAGE_KEYS.pendingSyncPronunciationIds, record.id);
    return false;
  }
}

// ── Backfill ─────────────────────────────────────────────────────────────────

export async function backfillPronunciationToCloud(
  userId: string,
  local: PronunciationAttemptRecord[],
  cloudIds: Set<string>,
): Promise<number> {
  if (!supabaseConfigured) return 0;
  const syncedIds = getSyncedIds(STORAGE_KEYS.syncedPronunciationIds);
  const toBackfill = local.filter(r => !cloudIds.has(r.id) && !syncedIds.has(r.id));
  if (toBackfill.length === 0) return 0;

  let pushed = 0;
  try {
    const rows = toBackfill.map(r => recordToRow(userId, r));
    const { error } = await supabase.from('pronunciation_attempts').upsert(rows, { onConflict: 'id' });

    if (!error) {
      addSyncedIds(STORAGE_KEYS.syncedPronunciationIds, toBackfill.map(r => r.id));
      pushed = toBackfill.length;
    } else {
      console.warn('[pronunciationSync] backfill failed:', error.message);
    }
  } catch (err) {
    console.warn('[pronunciationSync] backfill error:', err);
  }

  return pushed;
}

// ── Flush pending ──────────────────────────────────────────────────────────

export async function flushPendingPronunciationQueue(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  const pending = getPendingIds(STORAGE_KEYS.pendingSyncPronunciationIds);
  if (pending.length === 0) return;

  const local = getPronunciationHistory();
  const byId = new Map(local.map(r => [r.id, r]));

  for (const id of pending) {
    const record = byId.get(id);
    if (!record) {
      removePendingId(STORAGE_KEYS.pendingSyncPronunciationIds, id);
      continue;
    }
    try {
      const row = recordToRow(userId, record);
      const { error } = await supabase.from('pronunciation_attempts').upsert(row, { onConflict: 'id' });
      if (!error) {
        addSyncedId(STORAGE_KEYS.syncedPronunciationIds, id);
        removePendingId(STORAGE_KEYS.pendingSyncPronunciationIds, id);
      }
    } catch {
      // leave in queue for next trigger
    }
  }
}

// ── Hydrate ──────────────────────────────────────────────────────────────────

export async function hydratePronunciationFromCloud(
  userId: string,
): Promise<{ mergedAttempts: PronunciationAttemptRecord[]; cloudIds: Set<string> }> {
  try {
    const cloudAttempts = await pullAttemptsFromCloud(userId);
    const cloudIds = new Set<string>((cloudAttempts ?? []).map(r => r.id));

    const local = getPronunciationHistory();
    const merged = mergeAttemptLists(local, cloudAttempts ?? []);
    setPronunciationHistory(merged);

    return { mergedAttempts: merged, cloudIds };
  } catch (err) {
    console.warn('[pronunciationSync] hydratePronunciationFromCloud error:', err);
    return { mergedAttempts: getPronunciationHistory(), cloudIds: new Set() };
  }
}
