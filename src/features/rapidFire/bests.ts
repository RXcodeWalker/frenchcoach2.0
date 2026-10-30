import { STORAGE_KEYS, storageGet, storageSet } from '../../services/persistence/storage';
import type { RunSummary } from './run';

/**
 * Personal bests per word set, kept on this device (account-scoped like every
 * other storage key). A versioned payload, as Emoji Master's bests are: an
 * unreadable or unknown-version value reads as "no bests yet" and is replaced
 * on the next record, never thrown on.
 */
export interface SetBest {
  score: number;
  maxStreak: number;
  correct: number;
  updatedAt: string;
}

export interface RapidFireBestsV1 {
  version: 1;
  sets: Record<string, SetBest>;
}

const EMPTY: RapidFireBestsV1 = { version: 1, sets: {} };

export function readBests(): RapidFireBestsV1 {
  const raw = storageGet<unknown>(STORAGE_KEYS.rapidFireBests, EMPTY);
  if (raw && typeof raw === 'object' && (raw as RapidFireBestsV1).version === 1) {
    const sets = (raw as RapidFireBestsV1).sets;
    if (sets && typeof sets === 'object') return { version: 1, sets };
  }
  return EMPTY;
}

export function getBest(setId: string): SetBest | undefined {
  const best = readBests().sets[setId];
  return best && typeof best.score === 'number' ? best : undefined;
}

export interface BestUpdate {
  /** The best before this run (undefined on a first run). */
  previous?: SetBest;
  isNewBest: boolean;
}

/**
 * Records a finished sprint. A drill, a run the learner abandoned and a run
 * with no points never touch the bests.
 */
export function recordRun(setId: string, summary: RunSummary, now: () => string = () => new Date().toISOString()): BestUpdate {
  const previous = getBest(setId);
  if (summary.mode !== 'sprint' || summary.endReason === 'quit' || summary.score <= 0) {
    return { previous, isNewBest: false };
  }
  const isNewBest = !previous || summary.score > previous.score;
  const bests = readBests();
  storageSet(STORAGE_KEYS.rapidFireBests, {
    version: 1,
    sets: {
      ...bests.sets,
      [setId]: {
        score: Math.max(previous?.score ?? 0, summary.score),
        maxStreak: Math.max(previous?.maxStreak ?? 0, summary.maxStreak),
        correct: Math.max(previous?.correct ?? 0, summary.correct),
        updatedAt: isNewBest ? now() : previous?.updatedAt ?? now(),
      },
    },
  } satisfies RapidFireBestsV1);
  return { previous, isNewBest };
}
