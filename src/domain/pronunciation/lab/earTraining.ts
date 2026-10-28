/**
 * Pronunciation Lab — ear training rounds (pronunciation-lab plan §3.3 "Ear
 * training"). Pure: the randomness comes in as a function so a round is
 * reproducible in tests.
 *
 * A question plays one word of a minimal pair and asks which it was. It is
 * listen-only (no Azure, no recording from the learner) and every word has a
 * native recording (`minimalPairs.ts` is catalogued by the recording script),
 * so hearing a contrast before producing it costs nothing.
 */

import { MINIMAL_PAIRS, type MinimalPair } from './minimalPairs';
import type { SoundFamilyId } from './types';

/** Questions in a round (fewer when a sound has fewer pairs than that, see `buildEarRound`). */
export const EAR_ROUND_SIZE = 6;

export interface EarQuestion {
  family: SoundFamilyId;
  /** The two words, in the order the buttons show them (shuffled, so position gives nothing away). */
  options: readonly [string, string];
  /** The word that is played; one of `options`. */
  answer: string;
}

export type Rng = () => number;

/** Families that have at least one pair, in `MINIMAL_PAIRS` order. */
export function earFamilies(): SoundFamilyId[] {
  return [...new Set(MINIMAL_PAIRS.map((p) => p.family))];
}

/** The pairs for one sound, or all of them. */
export function pairsFor(family: SoundFamilyId | 'all'): MinimalPair[] {
  return family === 'all' ? [...MINIMAL_PAIRS] : MINIMAL_PAIRS.filter((p) => p.family === family);
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A round of up to `size` questions. Each pair is asked once before any pair is
 * asked again (then with the other word played), and the same pair is never
 * asked twice running. A sound with only two pairs gives a round of four.
 */
export function buildEarRound(pairs: readonly MinimalPair[], rng: Rng = Math.random, size: number = EAR_ROUND_SIZE): EarQuestion[] {
  if (pairs.length === 0 || size <= 0) return [];
  const total = Math.min(size, pairs.length * 2);
  const questions: EarQuestion[] = [];
  const playedFirst = new Map<MinimalPair, 0 | 1>();
  let pass = 0;
  let previous: MinimalPair | null = null;
  while (questions.length < total) {
    let order = shuffled(pairs, rng);
    if (order.length > 1 && order[0] === previous) order = [...order.slice(1), order[0]];
    for (const pair of order) {
      if (questions.length >= total) break;
      const first = playedFirst.get(pair) ?? (rng() < 0.5 ? 0 : 1);
      playedFirst.set(pair, first);
      const playedIndex = pass === 0 ? first : ((1 - first) as 0 | 1);
      const answer = pair.words[playedIndex];
      const options = (rng() < 0.5 ? [pair.words[0], pair.words[1]] : [pair.words[1], pair.words[0]]) as [string, string];
      questions.push({ family: pair.family, options, answer });
      previous = pair;
    }
    pass += 1;
  }
  return questions;
}

/** "4 of 6 right". */
export function roundScoreLine(correct: number, total: number): string {
  return `${correct} of ${total} right`;
}
