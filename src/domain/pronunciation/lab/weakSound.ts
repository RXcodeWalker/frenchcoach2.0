/**
 * Pronunciation Lab — which sound inside a drilled word scored lowest, so a
 * "Try again" / "Almost" can say where to listen ("the « r »") instead of
 * nothing. Pure.
 *
 * fr-FR Azure gives each phoneme an accuracy but no phoneme name, so the
 * phonemes are lined up with the spelling (`graphemes.ts`) exactly as
 * `wordFamilyObservations` does: only when every matching reading of the word
 * has as many phonemes as Azure scored. The letters are named only when every
 * matching reading puts the weakest phoneme on the same letters (and the word
 * is not a whole irregular `LEXICON` entry); the sound family only when every
 * reading agrees on it. Anything less certain says nothing — a hint is never
 * guessed.
 *
 * It names the weakest scored sound, never what the learner said instead
 * (Azure does not report that for French). The only cut-off is the Lab's own
 * Clear line (`LAB_THRESHOLDS.word.clearMin`): a word whose every sound
 * reached it gets no hint. UNVALIDATED, like every Lab cut-off.
 */

import type { PronunciationWordResult } from '../types';
import { segmentWord, wordVariants } from './graphemes';
import { SCORED_FAMILIES, familiesForPhoneme, type ScoredFamilyId } from './soundFamilies';
import { LAB_THRESHOLDS } from './thresholds';
import type { SoundFamilyId } from './types';
import { takeWords, type LabTake } from './wordStates';

export interface WeakSound {
  /** The drilled word the sound is in, normalised (as `segmentWord` writes it). */
  word: string;
  /** The letters that make the sound ("r", "ou", "an"); null when they can't be pointed at. */
  letters: string | null;
  /** The sound family, when the sound belongs to one; null otherwise. */
  family: ScoredFamilyId | null;
  /** Internal ordering only; never displayed. */
  accuracy: number;
}

const isScored = (f: SoundFamilyId): f is ScoredFamilyId => (SCORED_FAMILIES as readonly SoundFamilyId[]).includes(f);

function intersect<T>(sets: ReadonlyArray<readonly T[]>): T[] {
  if (sets.length === 0) return [];
  return sets[0].filter((x) => sets.every((s) => s.includes(x)));
}

/** The weakest lined-up sound of one Azure word, or null when it can't be placed. */
export function weakSoundInWord(word: PronunciationWordResult): WeakSound | null {
  if (word.accuracyScore === null || word.errorType === 'skipped' || word.errorType === 'extra' || word.nearChunkBoundary) return null;
  const phonemes = word.phonemes ?? [];
  if (phonemes.length === 0) return null;
  const segmented = segmentWord(word.word);
  if (!segmented) return null;
  const matching = wordVariants(segmented).filter((v) => v.phonemes.length === phonemes.length);
  if (matching.length === 0) return null;

  let position = -1;
  let lowest = Infinity;
  phonemes.forEach((p, i) => {
    if (p.accuracyScore !== null && p.accuracyScore < lowest) {
      lowest = p.accuracyScore;
      position = i;
    }
  });
  if (position < 0 || lowest >= LAB_THRESHOLDS.word.clearMin) return null;

  const units = new Set(matching.map((v) => v.phonemes[position].unitIndex));
  const unit = units.size === 1 ? segmented.units[[...units][0]] : undefined;
  const letters = unit && !unit.lexical && unit.text ? unit.text : null;
  const families = intersect(matching.map((v) => familiesForPhoneme(v.phonemes[position].ipa, v.phonemes[position].tags))).filter(isScored);
  const family = families.length === 1 ? families[0] : null;
  if (letters === null && family === null) return null;
  return { word: segmented.word, letters, family, accuracy: lowest };
}

/** The weakest placeable sound across a drill take (one word, or a two-word liaison group); null when none. */
export function weakestSound(take: LabTake): WeakSound | null {
  if (take.refused) return null;
  let best: WeakSound | null = null;
  for (const item of takeWords(take)) {
    for (const source of item.source) {
      const weak = weakSoundInWord(source);
      if (weak && (best === null || weak.accuracy < best.accuracy)) best = weak;
    }
  }
  return best;
}
