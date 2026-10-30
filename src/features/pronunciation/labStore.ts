import { useSyncExternalStore } from 'react';
import { addCheck, addDrill, addTake, emptyLabHistory, parseLabHistory, type LabHistory } from '../../domain/pronunciation/lab/labHistory';
import type { MonthlyCheckResult } from '../../domain/pronunciation/lab/monthlyCheck';
import { soundProgress, type SoundProgress } from '../../domain/pronunciation/lab/soundProgress';
import { localDay } from '../../domain/pronunciation/lab/trickyWords';
import type { DrillVerdict, LabTake } from '../../domain/pronunciation/lab/wordStates';
import { STORAGE_KEYS, matchesScopedKey, scopedKey, storageRemove, storageSet } from '../../services/persistence/storage';

/**
 * The Pronunciation Lab's local history (pronunciation-lab plan §4 `labStore`):
 * "Your sounds" evidence, the tricky-words table and the monthly-check results,
 * kept in localStorage under the account's scope. The pure shape and updates are `domain/pronunciation/lab/
 * labHistory.ts`; this file is only the storage and the React subscription.
 *
 * LOCAL ONLY. Per check it keeps sound-family observations and single words
 * with counts — no audio, no sentence text, no transcript. Nothing here may
 * reach a sync module, a request body, a log or an analytics property
 * (`__tests__/labStorePrivacy.test.ts`); `deleteMyAccount()` removes it. It is
 * a store of its own on purpose: the Lab writes no Session, XP, mastery,
 * review or Learn evidence (plan §4), so it does not go through AppContext.
 *
 * Writes come from the Lab (`LabPractice`, the tricky-words deck) only, and
 * only for a scripted check of a sentence or word the learner was trying to say.
 */

let listeners = new Set<() => void>();
let cache: { key: string; raw: string | null; value: LabHistory } | null = null;

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The current history (an empty one if none is stored or storage is unreadable). Stable between changes. */
export function loadLabHistory(): LabHistory {
  const key = scopedKey(STORAGE_KEYS.pronunciationLab);
  const raw = readRaw(key);
  if (cache && cache.key === key && cache.raw === raw) return cache.value;
  let value = emptyLabHistory();
  if (raw !== null) {
    try {
      value = parseLabHistory(JSON.parse(raw));
    } catch {
      value = emptyLabHistory();
    }
  }
  cache = { key, raw, value };
  return value;
}

function notify(): void {
  for (const listener of [...listeners]) listener();
}

function save(next: LabHistory): void {
  storageSet(STORAGE_KEYS.pronunciationLab, next);
  notify();
}

/** Adds one whole-sentence take (a refused take adds nothing). */
export function recordLabTake(take: LabTake, now: Date = new Date()): void {
  const current = loadLabHistory();
  const next = addTake(current, take, localDay(now));
  if (next !== current) save(next);
}

/** Adds one one-word drill result (focus word or tricky-deck card). */
export function recordLabDrill(word: string, verdict: DrillVerdict, now: Date = new Date()): void {
  const current = loadLabHistory();
  const next = addDrill(current, word, verdict, localDay(now));
  if (next !== current) save(next);
}

/** Keeps one monthly check beside the observations (Stage 6). */
export function saveMonthlyCheck(check: MonthlyCheckResult): void {
  save(addCheck(loadLabHistory(), check));
}

/** "Your French sounds": the strongest and weakest families from the learner's Lab takes. */
export function getSoundProgress(): SoundProgress {
  return soundProgress(loadLabHistory().observations);
}

/** Forgets everything the Lab has kept on this device for this account. */
export function clearLabHistory(): void {
  storageRemove(STORAGE_KEYS.pronunciationLab);
  notify();
}

export function subscribeLabHistory(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || matchesScopedKey(e.key, STORAGE_KEYS.pronunciationLab)) listener();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** The history, re-rendering when a take or drill is recorded (here or in another tab). */
export function useLabHistory(): LabHistory {
  return useSyncExternalStore(subscribeLabHistory, loadLabHistory, loadLabHistory);
}

/** Test seam: forget the in-memory cache and listeners. */
export function resetLabStoreForTests(): void {
  listeners = new Set();
  cache = null;
}
