import { STORAGE_KEYS, storageGet, storageSet } from '../../services/persistence/storage';
import type { RunEntry } from './run';
import type { RapidFireWord, WordSet } from './wordBank';

/**
 * The cards the learner has missed, kept on this device so a later sprint can
 * be played over just those. A card is identified by its English prompt (the
 * same key `wordBank.ts` merges on), not its generated id, which changes
 * whenever the bank does.
 *
 * Rules, applied in the order the answers were given:
 *   wrong / skipped  the card joins the list (or its miss count grows)
 *   correct          the card leaves it — recall is what the list is for
 *   almost           no change: a typo is neither a miss nor a clear
 *
 * Versioned payload like the bests: an unreadable or unknown-version value
 * reads as "nothing missed yet". Never XP, never synced.
 */
export interface MissedCard {
  misses: number;
  lastMissedAt: string;
}

export interface RapidFireMissedV1 {
  version: 1;
  cards: Record<string, MissedCard>;
}

/** Fewest missed cards that make a sprint worth starting. */
export const MIN_MISSED_FOR_SPRINT = 5;

const EMPTY: RapidFireMissedV1 = { version: 1, cards: {} };

export const missedKey = (word: Pick<RapidFireWord, 'prompt'>): string => word.prompt.trim().toLowerCase();

export function readMissed(): RapidFireMissedV1 {
  const raw = storageGet<unknown>(STORAGE_KEYS.rapidFireMissed, EMPTY);
  if (raw && typeof raw === 'object' && (raw as RapidFireMissedV1).version === 1) {
    const cards = (raw as RapidFireMissedV1).cards;
    if (cards && typeof cards === 'object') return { version: 1, cards };
  }
  return EMPTY;
}

/** Folds a finished run's answers into the missed list. */
export function recordMissed(log: RunEntry[], now: () => string = () => new Date().toISOString()): void {
  if (log.length === 0) return;
  const cards = { ...readMissed().cards };
  for (const entry of log) {
    const key = missedKey(entry.word);
    if (entry.kind === 'wrong' || entry.kind === 'skipped') {
      cards[key] = { misses: (cards[key]?.misses ?? 0) + 1, lastMissedAt: now() };
    } else if (entry.kind === 'correct') {
      delete cards[key];
    }
  }
  storageSet(STORAGE_KEYS.rapidFireMissed, { version: 1, cards } satisfies RapidFireMissedV1);
}

/** The missed cards that belong to `set`, most-missed first. */
export function missedInSet(set: WordSet): RapidFireWord[] {
  const { cards } = readMissed();
  return set.words
    .filter(w => cards[missedKey(w)])
    .sort((a, b) => cards[missedKey(b)].misses - cards[missedKey(a)].misses);
}
