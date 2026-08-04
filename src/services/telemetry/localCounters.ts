/**
 * Tier-1 local product metrics (Phase 2 Slice 5). The only honestly-available
 * measurement surface: track()'s Sentry breadcrumbs transmit only on a
 * captured exception (see telemetryService.ts), so any rate derived from
 * them would come exclusively from crashed sessions. These counters are
 * local-only, on-device, and never synced — CoachBeliefDebug reads them
 * directly for a single-user view of entry vs. completion rates.
 */

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';

const COUNTERS_VERSION = 1;

export type CounterKey =
  | 'practice_step_shown'
  | 'practice_step_completed_pass'
  | 'practice_step_completed_retry'
  | 'practice_step_completed_advance_no_verdict'
  | 'transcript_confirmed'
  | 'transcript_rerecorded'
  | 'review_item_shown'
  | 'review_item_answered';

interface CountersState {
  version: number;
  counts: Partial<Record<CounterKey, number>>;
}

function emptyState(): CountersState {
  return { version: COUNTERS_VERSION, counts: {} };
}

function readState(): CountersState {
  const stored = storageGet<CountersState>(STORAGE_KEYS.localCounters, emptyState());
  // Corrupt shape or a future/older version — reset rather than trust partial data.
  if (!stored || stored.version !== COUNTERS_VERSION || typeof stored.counts !== 'object') {
    return emptyState();
  }
  return stored;
}

export function incrementCounter(key: CounterKey): void {
  const state = readState();
  state.counts[key] = (state.counts[key] ?? 0) + 1;
  storageSet(STORAGE_KEYS.localCounters, state);
}

export function getCounters(): Partial<Record<CounterKey, number>> {
  return readState().counts;
}

export function resetCounters(): void {
  storageSet(STORAGE_KEYS.localCounters, emptyState());
}
