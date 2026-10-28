/**
 * Pronunciation Lab — what to tell a learner about each sound family
 * (pronunciation-lab plan §3.2 step 4, §3.3 "Sound guide", §4). Pure, static.
 *
 * Plain English for a 14–16-year-old: what the sound is, where the mouth goes,
 * a few example words and (where French has one) a minimal pair. Never a
 * verdict — a tip says how to make the sound, not what the learner did wrong.
 *
 * Example words and pairs are static authored French, written exactly as the
 * Lab plays them (lowercase, the normalised word; a liaison example is the
 * two-word group), so Stage 4's recorded lexicon can catalogue these strings
 * as they are (`voiceKey` hashes case).
 */

import type { SoundFamilyId } from './types';

export interface SoundTip {
  /** Short plain-English name, e.g. "The French R". */
  name: string;
  /** One or two sentences: where the mouth goes. */
  tip: string;
  /** 4–6 example words (or two-word groups for liaison), easiest first. */
  examples: readonly string[];
  /** Two words that differ only in this sound, for ear training (Stage 5); null when French has no handy one. */
  minimalPair: readonly [string, string] | null;
}

export const SOUND_TIPS: Readonly<Record<SoundFamilyId, SoundTip>> = {
  frenchR: {
    name: 'The French R',
    tip: 'Made at the back of your throat, not with the tip of your tongue. Keep the tongue tip down behind your bottom teeth and make a soft, light gargle.',
    examples: ['rouge', 'rue', 'très', 'frère', 'partir'],
    minimalPair: null,
  },
  uOu: {
    name: 'U and OU',
    tip: 'For u, say "ee", then round your lips tightly as if to whistle — keep your tongue forward. For ou, round your lips like the "oo" in "food".',
    examples: ['tu', 'tout', 'rue', 'roue', 'dessus', 'dessous'],
    minimalPair: ['tu', 'tout'],
  },
  nasalAn: {
    name: 'Nasal AN / EN',
    tip: 'Open your mouth as for "ah" and let some air go through your nose. Stop before any "n" sound.',
    examples: ['dans', 'grand', 'enfant', 'temps', 'chambre'],
    minimalPair: ['vent', 'vin'],
  },
  nasalOn: {
    name: 'Nasal ON',
    tip: 'Round your lips as for "oh" and let some air go through your nose. Stop before any "n" sound.',
    examples: ['bon', 'mon', 'nom', 'maison', 'onze'],
    minimalPair: ['bon', 'banc'],
  },
  nasalIn: {
    name: 'Nasal IN / UN / AIN',
    tip: 'Spread your lips a little, as for the "e" in "bed", and let some air go through your nose. No "n" at the end.',
    examples: ['vin', 'pain', 'matin', 'bien', 'un'],
    minimalPair: ['vin', 'vent'],
  },
  eAccents: {
    name: 'É and È',
    tip: 'é is short and closed, with smiling lips — like the start of "ay" in "say", without sliding. è, ê and ai are more open, like the "e" in "bed".',
    examples: ['été', 'café', 'très', 'mère', 'fête'],
    minimalPair: ['les', 'lait'],
  },
  eu: {
    name: 'EU',
    tip: 'Round your lips as for "oh", then say "ay" behind them. Keep your lips rounded the whole time.',
    examples: ['deux', 'peu', 'bleu', 'heure', 'jeune'],
    minimalPair: ['deux', 'des'],
  },
  silentFinal: {
    name: 'Silent last letters',
    tip: 'Most last consonants — s, t, d, x, z, p — are not said: petit sounds like "peti". A last e is silent too, but it makes the letter before it heard: petite ends in a "t".',
    examples: ['petit', 'grand', 'trois', 'chez', 'beaucoup'],
    minimalPair: ['petit', 'petite'],
  },
  liaison: {
    name: 'Liaison',
    tip: 'When a word ending in a silent letter comes before a vowel, that letter is said at the start of the next word: les amis sounds like "lé-za-mi".',
    examples: ['les amis', 'vous avez', 'nous allons', 'un enfant', 'deux heures'],
    minimalPair: ['ils sont', 'ils ont'],
  },
  elision: {
    name: "L', J', D' and C'",
    tip: "Before a vowel or a silent h, words like le, la, je, de and ce drop their vowel and join the next word. Say l'école or j'aime as one word.",
    examples: ["l'école", "j'aime", "c'est", "d'accord", "l'hôtel"],
    minimalPair: null,
  },
  gnIll: {
    name: 'GN and ILL',
    tip: 'gn is like the "ny" in "canyon". ill (as in fille, famille, travailler) is like the "y" in "yes" — not an "l".',
    examples: ['montagne', 'gagner', 'fille', 'famille', 'travailler'],
    minimalPair: null,
  },
  oi: {
    name: 'OI',
    tip: 'oi is said "wa": moi sounds like "mwa". oin adds the nasal of vin: loin, moins.',
    examples: ['moi', 'trois', 'soir', 'voiture', 'loin'],
    minimalPair: null,
  },
};

/** When the family behind a focus word can't be named: a tip that never guesses one. */
export const GENERAL_TIP =
  'Listen to it slowly a couple of times, then copy it — the vowel sounds and where the word stops.';

/**
 * The tip for a focus word. U vs OU is two different mouths, so the word's
 * own spelling picks the half that applies; every other family has one tip.
 */
export function tipFor(family: SoundFamilyId | null, word = ''): string {
  if (family === null) return GENERAL_TIP;
  if (family === 'uOu') {
    const lower = word.normalize('NFC').toLowerCase();
    if (/o[uùû]/.test(lower)) return 'ou — round your lips like the "oo" in "food".';
    if (/[uû]/.test(lower)) return 'u — say "ee", then round your lips tightly as if to whistle. Keep your tongue forward.';
  }
  return SOUND_TIPS[family].tip;
}
