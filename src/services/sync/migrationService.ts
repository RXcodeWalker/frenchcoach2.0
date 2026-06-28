import { supabase, supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { pushProgressionToCloud } from './progressionSync';
import { backfillSessionsToCloud, type StoredSession } from './sessionSync';
import { backfillEvidenceToCloud } from './coachSync';
import { getEvidenceEvents } from '../coach/coachStorage';

export type MigrationPhase = 'progression' | 'sessions' | 'evidence' | 'complete';

export interface MigrationResult {
  success: boolean;
  completedPhases: MigrationPhase[];
  failedPhase: MigrationPhase | null;
  skipped: boolean;
}

export interface MigrationRecord {
  userId: string;
  completedAt: string;
  version: number;
}

const CURRENT_MIGRATION_VERSION = 1;

export function isMigrationNeeded(
  userId: string,
  localRecord: MigrationRecord | null,
  cloudVersion: number,
): boolean {
  if (localRecord?.userId === userId) return false;
  if (cloudVersion >= CURRENT_MIGRATION_VERSION) return false;
  return true;
}

export function hasMeaningfulLocalData(): boolean {
  const analytics = storageGet<{ sessions: unknown[] }>(STORAGE_KEYS.analytics, { sessions: [] });
  const progression = storageGet<{ totalXP: number }>(STORAGE_KEYS.progression, { totalXP: 0 });
  const evidence = storageGet<unknown[]>(STORAGE_KEYS.coachEvidence, []);
  return (
    analytics.sessions.length > 0 ||
    progression.totalXP > 0 ||
    evidence.length > 0
  );
}

export async function markMigrationComplete(userId: string): Promise<void> {
  const record: MigrationRecord = {
    userId,
    completedAt: new Date().toISOString(),
    version: CURRENT_MIGRATION_VERSION,
  };
  storageSet(STORAGE_KEYS.migrationV1, record);

  if (supabaseConfigured) {
    try {
      await supabase
        .from('profiles')
        .upsert({ id: userId, migration_version: CURRENT_MIGRATION_VERSION }, { onConflict: 'id' });
    } catch (err) {
      console.warn('[migrationService] failed to write migration_version to cloud:', err);
    }
  }
}

export async function runMigration(
  userId: string,
  mergedSessions: StoredSession[],
  cloudIds: Set<string>,
  cloudEvidenceIds: Set<string>,
  setMigrationPhase: (phase: MigrationPhase | null) => void,
): Promise<MigrationResult> {
  const completedPhases: MigrationPhase[] = [];

  if (!hasMeaningfulLocalData()) {
    await markMigrationComplete(userId);
    return { success: true, completedPhases: [], failedPhase: null, skipped: true };
  }

  // Phase 1: progression (critical, blocking)
  setMigrationPhase('progression');
  const progressionOk = await pushProgressionToCloud(userId);
  if (!progressionOk) {
    setMigrationPhase(null);
    return { success: false, completedPhases, failedPhase: 'progression', skipped: false };
  }
  completedPhases.push('progression');
  await markMigrationComplete(userId);

  // Phase 2: sessions (best-effort)
  setMigrationPhase('sessions');
  try {
    await backfillSessionsToCloud(userId, mergedSessions, cloudIds);
    completedPhases.push('sessions');
  } catch (err) {
    console.warn('[migrationService] session backfill failed:', err);
  }

  // Phase 3: evidence (best-effort)
  setMigrationPhase('evidence');
  try {
    await backfillEvidenceToCloud(userId, getEvidenceEvents(), cloudEvidenceIds);
    completedPhases.push('evidence');
  } catch (err) {
    console.warn('[migrationService] evidence backfill failed:', err);
  }

  setMigrationPhase('complete');
  setMigrationPhase(null);

  return { success: true, completedPhases, failedPhase: null, skipped: false };
}
