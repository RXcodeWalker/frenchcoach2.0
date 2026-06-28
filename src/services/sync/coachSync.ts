import { supabase, supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import type { EvidenceEvent } from '../../types/evidence';
import {
  getEvidenceEvents,
  MAX_EVIDENCE_EVENTS,
} from '../coach/coachStorage';
import { rebuildBeliefSnapshot } from '../coach/beliefProjectionService';
import { detectAndPersistProblem } from '../coach/interventionService';
import { invalidateDailyPlan } from '../coach/decisionEngine';

// ── Schema version ─────────────────────────────────────────────────────────────
// Versions the cloud row ↔ EvidenceEvent mapping only. Bump when the shape of
// eventToRow / rowToEvent changes. Independent from REDUCER_VERSION (belief
// algorithm) and SQL migration timestamps.
export const COACH_SYNC_SCHEMA_VERSION = 1;

// ── Cloud row type ─────────────────────────────────────────────────────────────

type CoachEvidenceRow = {
  id: string;
  user_id: string;
  occurred_at: string;
  source_session_id: string | null;
  evidence_type: string;
  target_node_ids: string[];
  observation: Record<string, unknown>;
  result: Record<string, unknown>;
  reliability: Record<string, unknown>;
  context: Record<string, unknown>;
  schema_version: number;
  created_at: string;
};

// ── Synced-ID helpers ──────────────────────────────────────────────────────────

function getSyncedIds(): Set<string> {
  return new Set(storageGet<string[]>(STORAGE_KEYS.syncedEvidenceIds, []));
}

function addSyncedIds(ids: string[]): void {
  const existing = storageGet<string[]>(STORAGE_KEYS.syncedEvidenceIds, []);
  const merged = Array.from(new Set([...existing, ...ids]));
  storageSet(STORAGE_KEYS.syncedEvidenceIds, merged);
}

// ── Row mappers ────────────────────────────────────────────────────────────────

function eventToRow(userId: string, ev: EvidenceEvent): CoachEvidenceRow {
  return {
    id: ev.id,
    user_id: userId,
    occurred_at: ev.occurredAt,
    source_session_id: ev.sourceSessionId ?? null,
    evidence_type: ev.evidenceType,
    target_node_ids: ev.targetNodeIds,
    observation: ev.observation as Record<string, unknown>,
    result: ev.result as Record<string, unknown>,
    reliability: ev.reliability as unknown as Record<string, unknown>,
    context: ev.context as unknown as Record<string, unknown>,
    schema_version: COACH_SYNC_SCHEMA_VERSION,
    created_at: new Date().toISOString(),
  };
}

function migrateRow(row: CoachEvidenceRow, _fromVersion: number): CoachEvidenceRow {
  // No migrations needed at v1. Add cases here as COACH_SYNC_SCHEMA_VERSION bumps.
  return row;
}

export function rowToEvent(row: CoachEvidenceRow): EvidenceEvent | null {
  if (row.schema_version > COACH_SYNC_SCHEMA_VERSION) {
    // Written by a newer client — skip to avoid corrupt interpretation
    console.warn('[coachSync] skipping row with unknown schema_version', row.schema_version, row.id);
    return null;
  }

  const normalized = row.schema_version < COACH_SYNC_SCHEMA_VERSION
    ? migrateRow(row, row.schema_version)
    : row;

  return {
    id: normalized.id,
    learnerId: 'local-user',
    occurredAt: normalized.occurred_at,
    sourceSessionId: normalized.source_session_id ?? '',
    evidenceType: normalized.evidence_type as EvidenceEvent['evidenceType'],
    targetNodeIds: normalized.target_node_ids,
    observation: normalized.observation as EvidenceEvent['observation'],
    result: normalized.result as EvidenceEvent['result'],
    reliability: normalized.reliability as unknown as EvidenceEvent['reliability'],
    context: normalized.context as unknown as EvidenceEvent['context'],
  };
}

// ── Pure merge ────────────────────────────────────────────────────────────────

export function mergeEvidenceLists(
  local: EvidenceEvent[],
  cloud: EvidenceEvent[],
): EvidenceEvent[] {
  const byId = new Map<string, EvidenceEvent>();
  for (const ev of local) byId.set(ev.id, ev);
  for (const ev of cloud) {
    if (!byId.has(ev.id)) byId.set(ev.id, ev);
  }
  const sorted = Array.from(byId.values()).sort(
    (a, b) => a.occurredAt.localeCompare(b.occurredAt),
  );
  return sorted.slice(-MAX_EVIDENCE_EVENTS);
}

// ── Pull ──────────────────────────────────────────────────────────────────────

const PULL_LIMIT = 200;

async function pullEvidenceFromCloud(userId: string): Promise<EvidenceEvent[] | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('coach_evidence')
      .select('id, user_id, occurred_at, source_session_id, evidence_type, target_node_ids, observation, result, reliability, context, schema_version, created_at')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: true })
      .limit(PULL_LIMIT);

    if (error) {
      if (error.code !== 'PGRST116') {
        console.warn('[coachSync] pull failed:', error.message);
      }
      return null;
    }

    const events: EvidenceEvent[] = [];
    for (const row of data ?? []) {
      const ev = rowToEvent(row as CoachEvidenceRow);
      if (ev) events.push(ev);
    }
    return events;
  } catch (err) {
    console.warn('[coachSync] pull error:', err);
    return null;
  }
}

// ── Push ──────────────────────────────────────────────────────────────────────

export async function pushPendingEvidence(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  const syncedIds = getSyncedIds();
  const events = getEvidenceEvents();
  const unsyncedEvents = events.filter(ev => !syncedIds.has(ev.id));
  if (unsyncedEvents.length === 0) return;

  try {
    const rows = unsyncedEvents.map(ev => eventToRow(userId, ev));
    const { error } = await supabase
      .from('coach_evidence')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('[coachSync] push failed:', error.message);
      return;
    }

    addSyncedIds(unsyncedEvents.map(ev => ev.id));
  } catch (err) {
    console.warn('[coachSync] push error:', err);
  }
}

// ── Backfill ──────────────────────────────────────────────────────────────────

export async function backfillEvidenceToCloud(
  userId: string,
  localEvents: EvidenceEvent[],
  cloudIds: Set<string>,
): Promise<number> {
  if (!supabaseConfigured) return 0;
  const syncedIds = getSyncedIds();
  const toBackfill = localEvents.filter(
    ev => !cloudIds.has(ev.id) && !syncedIds.has(ev.id),
  );
  if (toBackfill.length === 0) return 0;

  let pushed = 0;
  try {
    const rows = toBackfill.map(ev => eventToRow(userId, ev));
    const { error } = await supabase
      .from('coach_evidence')
      .upsert(rows, { onConflict: 'id' });

    if (!error) {
      addSyncedIds(toBackfill.map(ev => ev.id));
      pushed = toBackfill.length;
    } else {
      console.warn('[coachSync] backfill failed:', error.message);
    }
  } catch (err) {
    console.warn('[coachSync] backfill error:', err);
  }

  return pushed;
}

// ── Hydrate ───────────────────────────────────────────────────────────────────

export async function hydrateCoachFromCloud(
  userId: string,
): Promise<{ cloudIds: Set<string> }> {
  if (!supabaseConfigured) return { cloudIds: new Set() };

  try {
    const cloudEvents = await pullEvidenceFromCloud(userId);
    if (!cloudEvents) return { cloudIds: new Set() };

    const cloudIds = new Set(cloudEvents.map(ev => ev.id));
    const localEvents = getEvidenceEvents();
    const merged = mergeEvidenceLists(localEvents, cloudEvents);

    storageSet(STORAGE_KEYS.coachEvidence, merged);
    addSyncedIds(Array.from(cloudIds));

    const snapshot = rebuildBeliefSnapshot();
    detectAndPersistProblem(merged, snapshot);
    invalidateDailyPlan();

    return { cloudIds };
  } catch (err) {
    console.warn('[coachSync] hydrateCoachFromCloud error:', err);
    return { cloudIds: new Set() };
  }
}
