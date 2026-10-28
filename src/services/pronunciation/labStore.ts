/**
 * Local persistence for the Pronunciation Lab's history (pronunciation-lab plan
 * §4 `labStore`). A thin fail-safe wrapper over the pure `labHistory` shape:
 * what to keep and how to trim it lives in `domain/pronunciation/lab/`.
 *
 * Kept per take: the sound families heard and an accuracy, with the local day.
 * Kept per monthly check: "N of M words clear" per benchmark sentence. Never a
 * word, sentence, transcript or audio, and never synced or sent anywhere. The
 * Lab writes no XP, Session, mastery, review or Learn evidence (plan §4).
 */

import { localDay } from '../../domain/pronunciation/lab/days';
import {
  appendCheck,
  appendObservations,
  sanitizeLabHistory,
  type LabHistory,
} from '../../domain/pronunciation/lab/labHistory';
import type { MonthlyCheckResult } from '../../domain/pronunciation/lab/monthlyCheck';
import { soundProgress, type SoundProgress } from '../../domain/pronunciation/lab/soundProgress';
import { takeObservations } from '../../domain/pronunciation/lab/takeFamilies';
import type { LabTake } from '../../domain/pronunciation/lab/wordStates';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';

export function getLabHistory(): LabHistory {
  return sanitizeLabHistory(storageGet<unknown>(STORAGE_KEYS.labHistory, null));
}

/** Keeps one whole-sentence take's family evidence. A refused take (no word check) keeps nothing. */
export function recordLabTake(take: LabTake, now: Date = new Date()): void {
  if (take.refused !== null) return;
  const observations = takeObservations(take);
  if (observations.length === 0) return;
  storageSet(STORAGE_KEYS.labHistory, appendObservations(getLabHistory(), observations, localDay(now)));
}

export function saveMonthlyCheck(check: MonthlyCheckResult): void {
  storageSet(STORAGE_KEYS.labHistory, appendCheck(getLabHistory(), check));
}

/** "Your French sounds": the strongest and weakest families from the learner's Lab takes. */
export function getSoundProgress(): SoundProgress {
  return soundProgress(getLabHistory().observations);
}
