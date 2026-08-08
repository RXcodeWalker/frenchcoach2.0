/**
 * XP ledger — local log + cloud sync (social layer plan §1.3, §1.5, §2.1,
 * §2.2, §5). The sole source for weekly XP; xp_events is append-only.
 *
 * DELIBERATE DEPARTURE FROM THE HOUSE SYNC STYLE (plan §1.10, §2.2): every
 * other sync module in this codebase (sessionSync, coachSync,
 * pronunciationSync, progressionSync) pushes with plain `.upsert(row,
 * { onConflict: 'id' })`. That re-fires `ON CONFLICT DO UPDATE`, which is
 * safe for those tables because re-writing the same row with the same values
 * is a no-op. It is NOT safe here — xp_events has no UPDATE policy (Phase 1
 * migration), so a plain upsert would be rejected outright, and even if it
 * weren't, retrying an upsert against a rollup-adjacent table is exactly the
 * double-count class of bug this design avoids. Every push below uses
 * `ignoreDuplicates: true`, which PostgREST turns into
 * `INSERT ... ON CONFLICT DO NOTHING` — a lost response on retry produces a
 * harmless no-op insert, never a second row, never an UPDATE. Do not change
 * this to a plain upsert to "match the other sync modules."
 *
 * The client-generated id (see makeXpEventId) is persisted to the local log
 * synchronously at award time, before any network attempt — every retry
 * replays that same id. See logXpEvent's callers in progressionService.ts.
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
} from '../sync/syncQueue';
import { getXpEventLog, appendXpEvent, setXpEventLog } from './xpLedgerStorage';
import type { XpEventRecord, XpSource } from '../../types/social';

const SYNC_WINDOW_DAYS = 90; // matches SYNC_WINDOW_DAYS precedent in pronunciationSync.ts

export function makeXpEventId(): string {
  return `xp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type CloudXpEventRow = {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
  schema_version: number;
};

function recordToRow(userId: string, record: XpEventRecord): CloudXpEventRow {
  return {
    id: record.id,
    user_id: userId,
    amount: record.amount,
    source: record.source,
    metadata: record.metadata,
    occurred_at: record.occurredAt,
    schema_version: 1,
  };
}

function rowToRecord(row: CloudXpEventRow): XpEventRecord {
  return {
    id: row.id,
    amount: row.amount,
    source: row.source as XpSource,
    metadata: row.metadata ?? {},
    occurredAt: row.occurred_at,
  };
}

// ── Pure merge ───────────────────────────────────────────────────────────────

export function mergeXpEventLists(
  local: XpEventRecord[],
  cloud: XpEventRecord[],
): XpEventRecord[] {
  const byId = new Map<string, XpEventRecord>();
  for (const r of local) byId.set(r.id, r);
  for (const r of cloud) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  return Array.from(byId.values()).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

// ── Local log entry point ───────────────────────────────────────────────────

/**
 * Append one XP event to the local ledger synchronously, at award time —
 * before any network attempt (plan §2.2 requirement 1). Call sites are the
 * three earning functions in progressionService.ts only; setProgressionData
 * must never call this (plan §1.5 — it's a reconciliation merge, not earned
 * XP, and emitting from it would inflate the ledger on every login).
 */
export function logXpEvent(amount: number, source: XpSource, metadata: Record<string, unknown> = {}): XpEventRecord {
  const record: XpEventRecord = {
    id: makeXpEventId(),
    amount,
    source,
    metadata,
    occurredAt: new Date().toISOString(),
  };
  appendXpEvent(record);
  return record;
}

// ── Pull ─────────────────────────────────────────────────────────────────────

async function pullXpEventsFromCloud(userId: string): Promise<XpEventRecord[] | null> {
  if (!supabaseConfigured) return null;
  try {
    const cutoff = new Date(Date.now() - SYNC_WINDOW_DAYS * 86400000).toISOString();
    const { data, error } = await supabase
      .from('xp_events')
      .select('id, user_id, amount, source, metadata, occurred_at, schema_version')
      .eq('user_id', userId)
      .gte('occurred_at', cutoff)
      .order('occurred_at', { ascending: true });

    if (error) {
      if (error.code !== 'PGRST116') {
        console.warn('[xpLedger] pull failed:', error.message);
      }
      return null;
    }

    return (data ?? []).map(row => rowToRecord(row as CloudXpEventRow));
  } catch (err) {
    console.warn('[xpLedger] pull error:', err);
    return null;
  }
}

// ── Push ─────────────────────────────────────────────────────────────────────

export async function pushXpEvent(userId: string, record: XpEventRecord): Promise<boolean> {
  if (!supabaseConfigured) return false;

  const syncedIds = getSyncedIds(STORAGE_KEYS.syncedXpEventIds);
  if (syncedIds.has(record.id)) return true;

  try {
    const row = recordToRow(userId, record);
    // ignoreDuplicates -> INSERT ... ON CONFLICT DO NOTHING. See module header:
    // this must never become a plain upsert.
    const { error } = await supabase
      .from('xp_events')
      .upsert(row, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.warn('[xpLedger] push failed:', error.message);
      addPendingId(STORAGE_KEYS.pendingSyncXpEventIds, record.id);
      return false;
    }

    addSyncedId(STORAGE_KEYS.syncedXpEventIds, record.id);
    removePendingId(STORAGE_KEYS.pendingSyncXpEventIds, record.id);
    return true;
  } catch (err) {
    console.warn('[xpLedger] push error:', err);
    addPendingId(STORAGE_KEYS.pendingSyncXpEventIds, record.id);
    return false;
  }
}

// ── Backfill ─────────────────────────────────────────────────────────────────

export async function backfillXpEventsToCloud(
  userId: string,
  local: XpEventRecord[],
  cloudIds: Set<string>,
): Promise<number> {
  if (!supabaseConfigured) return 0;
  const syncedIds = getSyncedIds(STORAGE_KEYS.syncedXpEventIds);
  const toBackfill = local.filter(r => !cloudIds.has(r.id) && !syncedIds.has(r.id));
  if (toBackfill.length === 0) return 0;

  let pushed = 0;
  try {
    const rows = toBackfill.map(r => recordToRow(userId, r));
    const { error } = await supabase
      .from('xp_events')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

    if (!error) {
      addSyncedIds(STORAGE_KEYS.syncedXpEventIds, toBackfill.map(r => r.id));
      pushed = toBackfill.length;
    } else {
      console.warn('[xpLedger] backfill failed:', error.message);
    }
  } catch (err) {
    console.warn('[xpLedger] backfill error:', err);
  }

  return pushed;
}

// ── Flush pending ──────────────────────────────────────────────────────────

export async function flushPendingXpEventQueue(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  const pending = getPendingIds(STORAGE_KEYS.pendingSyncXpEventIds);
  if (pending.length === 0) return;

  const local = getXpEventLog();
  const byId = new Map(local.map(r => [r.id, r]));

  for (const id of pending) {
    const record = byId.get(id);
    if (!record) {
      removePendingId(STORAGE_KEYS.pendingSyncXpEventIds, id);
      continue;
    }
    try {
      const row = recordToRow(userId, record);
      const { error } = await supabase
        .from('xp_events')
        .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
      if (!error) {
        addSyncedId(STORAGE_KEYS.syncedXpEventIds, id);
        removePendingId(STORAGE_KEYS.pendingSyncXpEventIds, id);
      }
    } catch {
      // leave in queue for next trigger
    }
  }
}

// ── Hydrate ──────────────────────────────────────────────────────────────────

export async function hydrateXpEventsFromCloud(
  userId: string,
): Promise<{ mergedEvents: XpEventRecord[]; cloudIds: Set<string> }> {
  try {
    const cloudEvents = await pullXpEventsFromCloud(userId);
    const cloudIds = new Set<string>((cloudEvents ?? []).map(r => r.id));

    const local = getXpEventLog();
    const merged = mergeXpEventLists(local, cloudEvents ?? []);
    setXpEventLog(merged);

    return { mergedEvents: merged, cloudIds };
  } catch (err) {
    console.warn('[xpLedger] hydrateXpEventsFromCloud error:', err);
    return { mergedEvents: getXpEventLog(), cloudIds: new Set() };
  }
}
