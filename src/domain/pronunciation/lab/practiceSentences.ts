/**
 * Pronunciation Lab — which sentences the Lab home offers to practise
 * (pronunciation-lab plan §3.3 "Practise a sentence"). Pure.
 *
 * Every offered sentence comes out of `splitSentences`, the one splitter the
 * recording script uses (`sentences.ts`), so a model-answer sentence always has
 * a native recording; a sentence from the learner's notebook is AI-corrected
 * text, which Stage 4b's cached endpoint records on first play. Only sentences
 * short enough to say in one go (and long enough to be a sentence) are offered.
 */

import { splitSentences } from './sentences';
import { soundFeatures, tokenizeSentence } from './textFeatures';
import type { SoundFamilyId } from './types';

/** Product decision, not a measurement: a Lab sentence is one breath, not a paragraph. */
export const PRACTICE_SENTENCE = {
  minWords: 3,
  maxWords: 20,
} as const;

/** The sentences of `text` that are a good length to practise, in order. */
export function practiceSentencesOf(text: string): string[] {
  return splitSentences(text).filter((s) => {
    const words = tokenizeSentence(s).length;
    return words >= PRACTICE_SENTENCE.minWords && words <= PRACTICE_SENTENCE.maxWords;
  });
}

/** Whether `sentence` has a spelling-level example of `family` (the same rules as "watch out for"). */
export function sentenceHasFamily(sentence: string, family: SoundFamilyId): boolean {
  return soundFeatures(sentence).some((f) => f.family === family);
}

export type Rng = () => number;

/** A small deterministic generator (mulberry32), so a picker draw can be named by one number. */
export function seededRng(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Up to `limit` distinct practice sentences from `texts`, in a shuffled order,
 * optionally only those with `family` in them. Stops reading texts as soon as
 * it has enough, so a sound filter over the whole question bank stays cheap.
 */
export function pickPracticeSentences(
  texts: readonly string[],
  options: { family?: SoundFamilyId | null; limit: number; rng?: Rng },
): string[] {
  const rng = options.rng ?? Math.random;
  const order = [...texts];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of order) {
    for (const sentence of practiceSentencesOf(text)) {
      if (seen.has(sentence)) continue;
      if (options.family && !sentenceHasFamily(sentence, options.family)) continue;
      seen.add(sentence);
      out.push(sentence);
      if (out.length >= options.limit) return out;
    }
  }
  return out;
}
