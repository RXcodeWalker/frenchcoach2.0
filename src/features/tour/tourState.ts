import { useSyncExternalStore } from 'react';
import { storageGet, storageSet } from '../../services/persistence/storage';

/**
 * Whether the first-run tour has been finished or skipped, and the "replay"
 * signal Profile sends.
 *
 * The flag goes through the identity-scoped storage helpers, so it is per
 * account for a signed-in learner (`…::<userId>`) and per browser for a guest
 * (`…::guest`); both helpers already swallow storage errors (private mode,
 * blocked site data), so a failed read just means "not seen yet". Deliberately
 * not in STORAGE_KEYS: copyGuestScopeToIdentity would carry it onto a new
 * account, and it is a UI convenience, not app data for AppContext.
 *
 * Bump the version suffix to show a reworked tour to everyone once more.
 */
export const TOUR_STORAGE_KEY = 'frenchCoach_tourSeen_v1';

export function hasSeenTour(): boolean {
  return storageGet<boolean>(TOUR_STORAGE_KEY, false) === true;
}

export function markTourSeen(): void {
  storageSet(TOUR_STORAGE_KEY, true);
}

/**
 * Auto-start only for someone genuinely new: never seen the tour AND no
 * practice history yet. The second check keeps existing learners (who
 * predate the tour) from being interrupted by it after a deploy.
 */
export function shouldAutoStartTour({ seen, sessionCount }: { seen: boolean; sessionCount: number }): boolean {
  return !seen && sessionCount === 0;
}

// ── Replay signal (Profile → TourHost) ─────────────────────────────────────
// A tiny external store, same shape as useGuestMode: Profile can ask for a
// replay without TourHost and Profile sharing a context.
type Listener = () => void;
const listeners = new Set<Listener>();
let replayRequested = false;

function emit() {
  listeners.forEach((l) => l());
}

export function requestTourReplay(): void {
  replayRequested = true;
  emit();
}

export function consumeTourReplay(): void {
  replayRequested = false;
  emit();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTourReplayRequested(): boolean {
  return useSyncExternalStore(subscribe, () => replayRequested, () => false);
}
