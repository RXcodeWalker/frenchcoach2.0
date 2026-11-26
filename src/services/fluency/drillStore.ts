/**
 * The fluency trainer's drill history (fluency-trainer §5): one record per
 * finished 4-3-2 drill. Numbers, ids and enums only. Never audio or a
 * transcript.
 *
 * Kept on this device only, per account (the key is account-scoped). There is
 * no sync: the `speaking_samples` table accepts only `surface = 'learn'`, and
 * drill rounds are deliberately rushed retellings that must not be mixed into
 * Learn's flow trend. A cloud copy needs its own table (a backend migration).
 * `deleteMyAccount()` removes it. No request body, log or analytics property
 * may read it (`drillStorePrivacy.test.ts`).
 * It writes no XP, Session, mastery, review or evidence, so it is outside
 * `AppContext` on purpose, like the speaking log.
 */

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import type { DrillRecord } from '../../domain/fluency/drill432';

export const DRILL_STORE_VERSION = 1;
/** Oldest drills drop off past this many. */
export const DRILL_STORE_MAX = 200;

interface StoredDrills {
  v: number;
  drills: DrillRecord[];
}

export function getDrillHistory(): DrillRecord[] {
  const stored = storageGet<StoredDrills | null>(STORAGE_KEYS.fluencyDrills, null);
  if (!stored || stored.v !== DRILL_STORE_VERSION || !Array.isArray(stored.drills)) return [];
  return stored.drills;
}

export function saveDrill(record: DrillRecord): void {
  const drills = getDrillHistory().filter((d) => d.id !== record.id);
  drills.push(record);
  drills.sort((a, b) => a.at.localeCompare(b.at));
  storageSet(STORAGE_KEYS.fluencyDrills, {
    v: DRILL_STORE_VERSION,
    drills: drills.slice(-DRILL_STORE_MAX),
  } satisfies StoredDrills);
}
