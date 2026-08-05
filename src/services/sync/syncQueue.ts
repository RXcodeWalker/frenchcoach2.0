/**
 * Generic synced/pending-ID queue helpers, extracted from the verbatim
 * duplication across sessionSync.ts (synced + pending) and coachSync.ts
 * (synced only). Per the accent-analyzer plan §R2: there is no generic sync
 * framework in this codebase to integrate into — sessionSync, coachSync and
 * progressionSync are three bespoke modules — so this extracts only the
 * duplicated ID-queue primitive rather than attempting a broader refactor.
 * pronunciationSync.ts is its first consumer; sessionSync.ts and
 * coachSync.ts are left on their own inline copies for now (opportunistic
 * migration later, not part of this change).
 */

import type { StorageKey } from '../persistence/storage';
import { storageGet, storageSet } from '../persistence/storage';

export function getSyncedIds(key: StorageKey): Set<string> {
  return new Set(storageGet<string[]>(key, []));
}

export function addSyncedId(key: StorageKey, id: string): void {
  const ids = storageGet<string[]>(key, []);
  if (!ids.includes(id)) {
    storageSet(key, [...ids, id]);
  }
}

export function addSyncedIds(key: StorageKey, ids: string[]): void {
  const existing = storageGet<string[]>(key, []);
  const merged = Array.from(new Set([...existing, ...ids]));
  storageSet(key, merged);
}

export function getPendingIds(key: StorageKey): string[] {
  return storageGet<string[]>(key, []);
}

export function addPendingId(key: StorageKey, id: string): void {
  const ids = getPendingIds(key);
  if (!ids.includes(id)) {
    storageSet(key, [...ids, id]);
  }
}

export function removePendingId(key: StorageKey, id: string): void {
  const ids = getPendingIds(key).filter(x => x !== id);
  storageSet(key, ids);
}
