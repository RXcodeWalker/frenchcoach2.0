/**
 * Pronunciation Lab — minimal pairs for ear training (pronunciation-lab plan
 * §3.3 "Ear training", §4.2). Pure, static, authored.
 *
 * Each pair is two real French words (or, for liaison, two-word groups) that a
 * learner can confuse because they differ in one sound of the given family.
 * Listen-only: the game plays one of them and asks which was said, so every
 * word here must have a native recording. They are written exactly as the Lab
 * plays them (lowercase; `voiceKey` hashes case), and Stage 4's catalogue
 * records them as they stand (`lexicon.ts`).
 *
 * Two words that sound identical are not a pair (les/lait is close but
 * distinct in careful speech; moi/mois is not a pair). Where the contrast is
 * a final nasal against a plain vowel, the order is [plain, nasal].
 */

import type { SoundFamilyId } from './types';

export interface MinimalPair {
  family: SoundFamilyId;
  /** Two different strings; the game picks which one to play. */
  words: readonly [string, string];
}

export const MINIMAL_PAIRS: readonly MinimalPair[] = [
  // u vs ou
  { family: 'uOu', words: ['tu', 'tout'] },
  { family: 'uOu', words: ['dessus', 'dessous'] },
  { family: 'uOu', words: ['rue', 'roue'] },
  { family: 'uOu', words: ['du', 'doux'] },
  { family: 'uOu', words: ['vu', 'vous'] },
  { family: 'uOu', words: ['pur', 'pour'] },
  // nasal vowels against each other, and against a plain vowel
  { family: 'nasalAn', words: ['vent', 'vont'] },
  { family: 'nasalAn', words: ['sans', 'son'] },
  { family: 'nasalAn', words: ['lent', 'long'] },
  { family: 'nasalOn', words: ['bon', 'banc'] },
  { family: 'nasalOn', words: ['beau', 'bon'] },
  { family: 'nasalOn', words: ['pain', 'pont'] },
  { family: 'nasalIn', words: ['vin', 'vent'] },
  { family: 'nasalIn', words: ['brun', 'brin'] },
  // é vs è
  { family: 'eAccents', words: ['les', 'lait'] },
  { family: 'eAccents', words: ['mes', 'mais'] },
  { family: 'eAccents', words: ['fée', 'fait'] },
  // eu
  { family: 'eu', words: ['deux', 'des'] },
  { family: 'eu', words: ['deux', 'doux'] },
  { family: 'eu', words: ['peu', 'pu'] },
  { family: 'eu', words: ['jeu', 'joue'] },
  // last letters: the e that makes the consonant heard
  { family: 'silentFinal', words: ['petit', 'petite'] },
  { family: 'silentFinal', words: ['grand', 'grande'] },
  { family: 'silentFinal', words: ['chaud', 'chaude'] },
  // liaison: the said consonant is the whole difference
  { family: 'liaison', words: ['ils sont', 'ils ont'] },
  { family: 'liaison', words: ['nous avons', 'nous savons'] },
  // oi vs oin
  { family: 'oi', words: ['loi', 'loin'] },
  { family: 'oi', words: ['moi', 'moins'] },
];

/** Every distinct string the ear-training game can play, in first-seen order. */
export function minimalPairTexts(): string[] {
  return [...new Set(MINIMAL_PAIRS.flatMap((p) => p.words))];
}
