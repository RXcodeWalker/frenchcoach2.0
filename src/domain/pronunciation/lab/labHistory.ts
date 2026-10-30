/**
 * Pronunciation Lab — the learner's local history (pronunciation-lab plan §3.3,
 * §4 `labStore`). Pure: the shape, its validation and the updates. The storage
 * read/write lives in `features/pronunciation/labStore.ts`.
 *
 * What is kept per check, and nothing else — no audio, no sentence text, no
 * transcript, no Azure payload:
 *  - sound-family observations (`takeObservations`): family, accuracy 0–100
 *    (internal, never displayed as a number), basis and the local day, oldest
 *    first, at most `HISTORY_LIMITS.observationsPerFamily` per family — "Your
 *    sounds" only ever reads the recent ones (`LAB_THRESHOLDS.family`);
 *  - the tricky-words table (`trickyWords.ts`): single words with counts;
 *  - the monthly-check results (`monthlyCheck.ts`): "N of M words clear" per
 *    benchmark sentence, oldest first, at most `HISTORY_LIMITS.checks`.
 *
 * Only a scripted Azure check of a target the learner was trying to say can
 * add to it (a refused take adds nothing; a free Learn answer is never a Lab
 * take). The history is local to this device and account: never synced, never
 * in a request body or an analytics property (`labStorePrivacy.test.ts`).
 */

import { normalizeWord } from '../../examPronunciation/fairness';
import {
  SCORED_FAMILIES,
  familyStatuses,
  type DatedObservation,
  type FamilyStatus,
  type ScoredFamilyId,
} from './soundFamilies';
import type { MonthlyCheckResult } from './monthlyCheck';
import { sanitizeCheck } from './monthlyCheck';
import { takeObservations } from './takeFamilies';
import { noteWord, pruneEntries, type TrickyEntries, type TrickyEntry, type TrickyStatus } from './trickyWords';
import { takeWords, type DrillVerdict, type LabTake } from './wordStates';

export const LAB_HISTORY_VERSION = 1;

/** Storage bounds, not measurements. 60 > `LAB_THRESHOLDS.family.recentObservations`, so trimming never changes a status. */
export const HISTORY_LIMITS = {
  observationsPerFamily: 60,
  /** Three years of monthly checks. */
  checks: 36,
} as const;

export interface LabHistory {
  version: typeof LAB_HISTORY_VERSION;
  /** Oldest first. */
  observations: DatedObservation[];
  words: TrickyEntries;
  /** Oldest first. */
  checks: MonthlyCheckResult[];
}

export function emptyLabHistory(): LabHistory {
  return { version: LAB_HISTORY_VERSION, observations: [], words: {}, checks: [] };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TRICKY_STATUSES: readonly TrickyStatus[] = ['watching', 'tricky', 'cleared'];
const isFamily = (v: unknown): v is ScoredFamilyId => typeof v === 'string' && (SCORED_FAMILIES as readonly string[]).includes(v);

function parseObservation(raw: unknown): DatedObservation | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!isFamily(o.family)) return null;
  if (typeof o.accuracy !== 'number' || !Number.isFinite(o.accuracy) || o.accuracy < 0 || o.accuracy > 100) return null;
  if (o.basis !== 'phoneme' && o.basis !== 'word') return null;
  if (typeof o.day !== 'string' || !DAY.test(o.day)) return null;
  return { family: o.family, accuracy: o.accuracy, basis: o.basis, day: o.day };
}

function parseEntry(raw: unknown): TrickyEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const e = raw as Record<string, unknown>;
  if (!TRICKY_STATUSES.includes(e.status as TrickyStatus)) return null;
  if (typeof e.practiseCount !== 'number' || !Number.isInteger(e.practiseCount) || e.practiseCount < 0) return null;
  if (typeof e.clearRun !== 'number' || !Number.isInteger(e.clearRun) || e.clearRun < 0) return null;
  if (typeof e.lastDay !== 'string' || !DAY.test(e.lastDay)) return null;
  const lastClearDay = e.lastClearDay;
  if (lastClearDay !== null && !(typeof lastClearDay === 'string' && DAY.test(lastClearDay))) return null;
  return {
    status: e.status as TrickyStatus,
    practiseCount: e.practiseCount,
    clearRun: e.clearRun,
    lastDay: e.lastDay,
    lastClearDay: lastClearDay as string | null,
  };
}

/** Reads whatever storage held: anything malformed is dropped, a wrong shape is an empty history. */
export function parseLabHistory(raw: unknown): LabHistory {
  if (typeof raw !== 'object' || raw === null) return emptyLabHistory();
  const r = raw as Record<string, unknown>;
  if (r.version !== LAB_HISTORY_VERSION) return emptyLabHistory();
  const observations = Array.isArray(r.observations)
    ? r.observations.map(parseObservation).filter((o): o is DatedObservation => o !== null)
    : [];
  const words: TrickyEntries = {};
  if (typeof r.words === 'object' && r.words !== null && !Array.isArray(r.words)) {
    for (const [word, value] of Object.entries(r.words)) {
      const entry = parseEntry(value);
      if (entry && word.trim()) words[word] = entry;
    }
  }
  const checks = Array.isArray(r.checks)
    ? r.checks.map(sanitizeCheck).filter((c): c is MonthlyCheckResult => c !== null).slice(-HISTORY_LIMITS.checks)
    : [];
  return { version: LAB_HISTORY_VERSION, observations, words, checks };
}

/** Keeps the newest `observationsPerFamily` of each family, order preserved. */
function trimObservations(observations: readonly DatedObservation[]): DatedObservation[] {
  const counts = new Map<string, number>();
  const keep = new Array<boolean>(observations.length).fill(false);
  for (let i = observations.length - 1; i >= 0; i--) {
    const n = (counts.get(observations[i].family) ?? 0) + 1;
    counts.set(observations[i].family, n);
    keep[i] = n <= HISTORY_LIMITS.observationsPerFamily;
  }
  return observations.filter((_, i) => keep[i]);
}

/**
 * The history after one whole-sentence take. A refused take changes nothing.
 * Words are noted as Practise or Clear (Almost and the rest are not evidence).
 */
export function addTake(history: LabHistory, take: LabTake, day: string): LabHistory {
  if (take.refused) return history;
  const fresh = takeObservations(take).map((o): DatedObservation => ({ ...o, day }));
  let words = history.words;
  for (const item of takeWords(take)) {
    if (item.state === 'practise') words = noteWord(words, normalizeWord(item.text), 'practise', day);
    else if (item.state === 'clear') words = noteWord(words, normalizeWord(item.text), 'clear', day);
  }
  if (fresh.length === 0 && words === history.words) return history;
  return {
    ...history,
    observations: trimObservations([...history.observations, ...fresh]),
    words: pruneEntries(words, day),
  };
}

/**
 * The history after a one-word drill (a focus word, or a card in the tricky
 * deck): "Try again" is a miss, "Clear" a clear day; Almost / unknown change
 * nothing. A drill adds no family observation (one word is too small a sample).
 */
export function addDrill(history: LabHistory, word: string, verdict: DrillVerdict, day: string): LabHistory {
  const evidence = verdict === 'tryAgain' ? 'practise' : verdict === 'clear' ? 'clear' : null;
  if (!evidence) return history;
  const words = noteWord(history.words, normalizeWord(word), evidence, day);
  if (words === history.words) return history;
  return { ...history, words: pruneEntries(words, day) };
}

/** The history after a saved monthly check (oldest dropped past `HISTORY_LIMITS.checks`). */
export function addCheck(history: LabHistory, check: MonthlyCheckResult): LabHistory {
  return { ...history, checks: [...history.checks, check].slice(-HISTORY_LIMITS.checks) };
}

/** "Your sounds": the status of each scored family. */
export function historyStatuses(history: LabHistory): Record<ScoredFamilyId, FamilyStatus> {
  return familyStatuses(history.observations);
}
