/**
 * Pronunciation Lab — sound-family evidence from one take (pronunciation-lab
 * plan §5.2). Pure.
 *
 * `takeObservations` is what the Lab's local history keeps per take (Stage 5's
 * `labStore`); `familiesInTake` is what the focus-word chooser asks ("which
 * sound is the weak one in this word?"). A refused (freeform, non-Azure,
 * unassessable) take gives nothing.
 */

import { SCORED_FAMILIES, stableWordFamilies, wordFamilyObservations, type FamilyObservation } from './soundFamilies';
import type { SoundFamilyId } from './types';
import { takeWords, type LabTake } from './wordStates';

export interface TokenFamilies {
  observations: FamilyObservation[];
  /** The family behind the word's weakest measured sound; null when none can be named. */
  weakest: SoundFamilyId | null;
}

export function familiesInTake(take: LabTake): Map<number, TokenFamilies> {
  const out = new Map<number, TokenFamilies>();
  if (take.refused) return out;
  const words = takeWords(take);
  words.forEach((item, i) => {
    const context = { previous: words[i - 1]?.text ?? null, next: words[i + 1]?.text ?? null };
    const observations = item.source.flatMap((w) => wordFamilyObservations(w, context).observations);
    let weakest: SoundFamilyId | null = null;
    const byPhoneme = observations.filter((o) => o.basis === 'phoneme');
    const pool = byPhoneme.length > 0 ? byPhoneme : observations;
    if (pool.length > 0) {
      weakest = pool.reduce((low, o) => (o.accuracy < low.accuracy ? o : low)).family;
    } else {
      const scored = stableWordFamilies(item.text, context).filter((f) => (SCORED_FAMILIES as readonly SoundFamilyId[]).includes(f));
      if (scored.length === 1) weakest = scored[0];
    }
    out.set(item.tokenIndex, { observations, weakest });
  });
  return out;
}

/** Every family observation in the take, in sentence order. */
export function takeObservations(take: LabTake): FamilyObservation[] {
  return [...familiesInTake(take).values()].flatMap((t) => t.observations);
}
