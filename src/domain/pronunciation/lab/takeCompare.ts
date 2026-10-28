/**
 * Pronunciation Lab — first take vs best take for one sentence
 * (pronunciation-lab plan §3.2 step 4: "7 → 10 words clear"). Pure.
 *
 * Takes are only compared on the same target sentence: comparing different
 * sentences mostly measures how hard each sentence is (plan §3.3). Refused
 * takes (freeform, non-Azure, unassessable) are left out.
 */

import type { LabWordState } from './types';
import { takeWords, type LabTake } from './wordStates';

export interface TakeComparison {
  /** Index (into the input) of the first usable take and of the best one. */
  firstIndex: number;
  bestIndex: number;
  firstClear: number;
  bestClear: number;
  /** Words in the sentence. */
  total: number;
  /** Token indices that are better in the best take than in the first. */
  improved: number[];
  /** True when the best take is a different, better take than the first. */
  improvedOverFirst: boolean;
}

/** Higher is better; unknown is not comparable. */
const RANK: Partial<Record<LabWordState, number>> = { clear: 3, almost: 2, practise: 1, missed: 0 };

function sameSentence(a: string, b: string): boolean {
  const norm = (text: string) => text.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Compares `takes` (oldest first) of one sentence. The best take has the most
 * clear words, then the fewest Practise/Not heard, then is the latest.
 * Null when there is no usable take.
 */
export function compareTakes(takes: readonly LabTake[]): TakeComparison | null {
  const firstIndex = takes.findIndex((t) => t.refused === null);
  if (firstIndex === -1) return null;
  const first = takes[firstIndex];
  let bestIndex = firstIndex;
  takes.forEach((take, i) => {
    if (i <= firstIndex || take.refused !== null || !sameSentence(take.targetText, first.targetText)) return;
    if (take.counts.total !== first.counts.total) return;
    const best = takes[bestIndex];
    const lows = (t: LabTake) => t.counts.practise + t.counts.missed;
    if (take.counts.clear > best.counts.clear || (take.counts.clear === best.counts.clear && lows(take) <= lows(best))) {
      bestIndex = i;
    }
  });
  const best = takes[bestIndex];
  const firstWords = takeWords(first);
  const improved = takeWords(best)
    .filter((w, i) => {
      const before = RANK[firstWords[i]?.state ?? 'unknown'];
      const after = RANK[w.state];
      return before !== undefined && after !== undefined && after > before;
    })
    .map((w) => w.tokenIndex);
  return {
    firstIndex,
    bestIndex,
    firstClear: first.counts.clear,
    bestClear: best.counts.clear,
    total: first.counts.total,
    improved,
    improvedOverFirst: bestIndex !== firstIndex && best.counts.clear > first.counts.clear,
  };
}
