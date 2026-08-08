/**
 * Local persistence for the XP ledger (social layer plan §1.3, §1.5, §2.2).
 * Mirrors coachStorage.ts / pronunciationHistoryService.ts's bounded-log
 * shape: a thin, fail-safe localStorage wrapper capped so storage never
 * grows unbounded.
 *
 * Cap of 2,000 events / effectively bounded by SYNC_WINDOW_DAYS pruning in
 * xpLedger.ts — matches SYNC_WINDOW_DAYS elsewhere in the sync modules (plan
 * §2.2: "Local ledger sizing. Cap at ~2,000 events / 90 days ... Weekly
 * leaderboards only ever need the current week; the rest is history the
 * cloud holds").
 */

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import type { XpEventRecord } from '../../types/social';

export const MAX_XP_EVENTS = 2000;

export function getXpEventLog(): XpEventRecord[] {
  return storageGet<XpEventRecord[]>(STORAGE_KEYS.xpEventLog, []);
}

/** Append one event, keeping only the most recent MAX_XP_EVENTS. */
export function appendXpEvent(record: XpEventRecord): XpEventRecord[] {
  const existing = getXpEventLog();
  const next = [...existing, record].slice(-MAX_XP_EVENTS);
  storageSet(STORAGE_KEYS.xpEventLog, next);
  return next;
}

export function setXpEventLog(records: XpEventRecord[]): void {
  storageSet(STORAGE_KEYS.xpEventLog, records.slice(-MAX_XP_EVENTS));
}
