/**
 * Device-local bookkeeping for product analytics (never synced, never sent as
 * is): the last day the app was opened (app_opened is once per day), which
 * "first time" milestones this browser has already reported, and which
 * Supabase user id PostHog was last told about (so sign-in / sign-out are
 * reported on the transition, not on every page load).
 */
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';

const STATE_VERSION = 1;

export type FirstTimeKey = 'learn_session' | 'answer' | 'feedback';

interface AnalyticsState {
  version: number;
  /** Local calendar day (YYYY-MM-DD) app_opened last fired. */
  lastOpenDay: string | null;
  firsts: FirstTimeKey[];
  identifiedUserId: string | null;
  /** The last person properties sent (with the user id), so an unchanged person is not re-sent. */
  personKey?: string;
}

function emptyState(): AnalyticsState {
  return { version: STATE_VERSION, lastOpenDay: null, firsts: [], identifiedUserId: null };
}

function readState(): AnalyticsState {
  const stored = storageGet<AnalyticsState | null>(STORAGE_KEYS.analyticsState, null);
  if (!stored || stored.version !== STATE_VERSION || !Array.isArray(stored.firsts)) return emptyState();
  return stored;
}

function writeState(state: AnalyticsState): void {
  storageSet(STORAGE_KEYS.analyticsState, state);
}

/** Local calendar day, so "once per day" follows the learner's own midnight. */
export function localDay(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(fromDay: string, toDay: string): number {
  const from = Date.parse(`${fromDay}T00:00:00`);
  const to = Date.parse(`${toDay}T00:00:00`);
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/**
 * The app_opened props when this is the first open of the local day (and
 * records the day), else null.
 */
export function claimDailyOpen(now: Date = new Date()): { first_visit: boolean; days_since_last_visit: number | null } | null {
  const state = readState();
  const today = localDay(now);
  if (state.lastOpenDay === today) return null;
  const props = {
    first_visit: state.lastOpenDay === null,
    days_since_last_visit: state.lastOpenDay === null ? null : daysBetween(state.lastOpenDay, today),
  };
  writeState({ ...state, lastOpenDay: today });
  return props;
}

/** True exactly once per browser for each milestone (the first Learn session, answer, feedback). */
export function claimFirstTime(key: FirstTimeKey): boolean {
  const state = readState();
  if (state.firsts.includes(key)) return false;
  writeState({ ...state, firsts: [...state.firsts, key] });
  return true;
}

export function getIdentifiedUserId(): string | null {
  return readState().identifiedUserId;
}

/** A new identity (sign-in, or the fresh anonymous id after sign-out) gets its person properties sent again. */
export function setIdentifiedUserId(userId: string | null): void {
  writeState({ ...readState(), identifiedUserId: userId, personKey: undefined });
}

/** True when `key` differs from the last person properties sent (and records it). */
export function claimPersonPropsChange(key: string): boolean {
  const state = readState();
  if (state.personKey === key) return false;
  writeState({ ...state, personKey: key });
  return true;
}

const firedThisPage = new Set<string>();

/** True the first time `key` is seen in this page load (dedupes noisy signals like mic_permission). */
export function claimOncePerPage(key: string): boolean {
  if (firedThisPage.has(key)) return false;
  firedThisPage.add(key);
  return true;
}

/** Tests only. */
export function resetPageClaimsForTests(): void {
  firedThisPage.clear();
}
