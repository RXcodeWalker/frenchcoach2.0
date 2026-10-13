/**
 * Category B near sound-alike pairs (owner decision, transcription-accuracy
 * plan Phase 4): AUDIBLY different words that a strong accent, fast speech or
 * a recogniser easily confuses. Unlike Category A they are never respelled.
 *
 * How marking will use them (later stages, not wired yet):
 *  - the two recognisers disagree on such a word, or only one recogniser
 *    heard the turn → benefit of the doubt, the error is not counted;
 *  - both recognisers clearly agree on the wrong word → it counts;
 *  - either way the feedback says "this might have been X; make sure you
 *    say it". It is never silently excused.
 *
 * The owner fixed un/en, ont/sont, le/les and du/de. The other entries are
 * the same vowel contrast (schwa vs [e]: le/les → de/des, ce/ces, me/mes,
 * te/tes, se/ses, je/j'ai; nasal [ɑ̃] vs [ɔ̃]: en/on), approved by the owner
 * on 2026-10-13. Any change here changes marks once wired: bump
 * HOMOPHONE_TABLE_VERSION (`version.ts`).
 */

import { parseToken } from './text';

export interface NearPair {
  readonly id: string;
  readonly a: string;
  readonly b: string;
  /** Why the pair is confusable, in plain English. */
  readonly note: string;
}

function pair(a: string, b: string, note: string): NearPair {
  return Object.freeze({ id: `${a}~${b}`, a, b, note });
}

export const NEAR_PAIRS: readonly NearPair[] = Object.freeze([
  pair('un', 'en', 'nasal vowels [œ̃] / [ɑ̃]'),
  pair('en', 'on', 'nasal vowels [ɑ̃] / [ɔ̃]'),
  pair('ont', 'sont', 'a weak or swallowed [s]'),
  pair('le', 'les', 'schwa / [e]'),
  pair('de', 'des', 'schwa / [e]'),
  pair('ce', 'ces', 'schwa / [e]'),
  pair('me', 'mes', 'schwa / [e]'),
  pair('te', 'tes', 'schwa / [e]'),
  pair('se', 'ses', 'schwa / [e]'),
  pair('je', "j'ai", 'schwa / [e]'),
  pair('du', 'de', 'rounded [y] / schwa'),
]);

/** The Category B pair the two words form (order-insensitive; case and punctuation ignored), or null. */
export function nearPairOf(a: string, b: string): NearPair | null {
  const x = parseToken(a).lower;
  const y = parseToken(b).lower;
  if (!x || !y || x === y) return null;
  return NEAR_PAIRS.find((p) => (p.a === x && p.b === y) || (p.a === y && p.b === x)) ?? null;
}
