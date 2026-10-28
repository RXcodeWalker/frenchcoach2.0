/**
 * Pronunciation Lab — French spelling → expected phonemes (pure).
 *
 * Why this exists: for fr-FR, Azure's scripted assessment returns an accuracy
 * score and timing for every phoneme of the reference word, but the phoneme's
 * *name* comes back empty (every one of the 1,799 phonemes in the exam
 * calibration fixtures has `Phoneme: ""`; `docs/systems/exam-pronunciation.md`
 * records the same: "phoneme names are en-US only"). So "which sound was weak"
 * cannot be read off Azure's reply. Instead the target word is split here into
 * spelling units, each with the phoneme(s) French spelling predicts, and
 * `soundFamilies.ts` lines those up with Azure's phoneme list — but only when
 * the counts match exactly, so a wrong guess here costs evidence, never
 * invents it.
 *
 * Where French spelling is ambiguous (a final -e that may or may not be said,
 * -ent that is a nasal vowel in "souvent" but silent in "ils parlent", an i
 * before a vowel that is /j/ or /ij/), a unit carries every option; the
 * aligner keeps the variant whose phoneme count matches Azure's, and gives up
 * if two matching variants disagree about which sound is where.
 *
 * Coverage is everyday IGCSE vocabulary, not the whole language: irregular
 * words go in `LEXICON`, loanwords return null (Azure reads them in English).
 * `__tests__/graphemes.test.ts` measures the phoneme-count agreement against
 * real Azure fr-FR replies.
 */

import { normalizeWord } from '../../examPronunciation/fairness';
import type { SoundFamilyId } from './types';

export interface PhonemeOption {
  /** Expected phonemes, IPA. Empty = the letters are silent. */
  ipa: readonly string[];
  /** Families every phoneme of this option belongs to beyond the IPA table (the /w a/ of "oi", the /j/ of "ill"). */
  phonemeTags?: readonly SoundFamilyId[];
  /** Families this unit carries with no phoneme of its own (a silent final, an elision, a liaison). */
  wordTags?: readonly SoundFamilyId[];
}

export interface GraphemeUnit {
  /** The letters, as in the normalised word (empty for a liaison, which sits between words). */
  text: string;
  /** Offsets into `SegmentedWord.word`. */
  start: number;
  end: number;
  /** options[0] is the most likely reading. */
  options: readonly PhonemeOption[];
  /** A whole irregular word from `LEXICON`: its letters can't be pointed at one by one. */
  lexical?: boolean;
}

export interface SegmentedWord {
  /** `normalizeWord(raw)`: lowercase, NFC, straight apostrophe, edge punctuation stripped. */
  word: string;
  units: GraphemeUnit[];
}

export interface WordContext {
  previous?: string | null;
  next?: string | null;
}

export interface PhonemeSlot {
  ipa: string;
  unitIndex: number;
  tags: readonly SoundFamilyId[];
}

export interface WordVariant {
  phonemes: PhonemeSlot[];
  wordTags: ReadonlyArray<{ family: SoundFamilyId; unitIndex: number }>;
}

const VOWELS = 'aeiouyàâäéèêëîïôöùûüœæ';
const FRONT = 'eiyéèêëîï';
const SILENT_FINAL_LETTERS = 'tdspxzg';

export function isVowelLetter(c: string | undefined): boolean {
  return c !== undefined && c !== '' && VOWELS.includes(c);
}

function isConsonantLetter(c: string | undefined): boolean {
  return c !== undefined && /\p{L}/u.test(c) && !VOWELS.includes(c);
}

function ipa(spaced: string): string[] {
  return spaced.split(' ').filter(Boolean);
}

/** Whole-word readings that spelling rules get wrong. Families come from the IPA table only. */
const LEXICON: Record<string, string[]> = {
  est: ['ɛ', 'e'],
  et: ['e'],
  es: ['ɛ', 'e'],
  les: ['l e', 'l ɛ'],
  des: ['d e', 'd ɛ'],
  mes: ['m e', 'm ɛ'],
  tes: ['t e', 't ɛ'],
  ses: ['s e', 's ɛ'],
  ces: ['s e', 's ɛ'],
  "aujourd'hui": ['o ʒ u ʁ d ɥ i'],
  monsieur: ['m ə s j ø'],
  messieurs: ['m e s j ø'],
  femme: ['f a m', 'f a m ə'],
  femmes: ['f a m', 'f a m ə'],
  second: ['s ə g ɔ̃'],
  seconde: ['s ə g ɔ̃ d', 's ə g ɔ̃ d ə'],
  oignon: ['ɔ ɲ ɔ̃'],
  ville: ['v i l', 'v i l ə'],
  villes: ['v i l', 'v i l ə'],
  village: ['v i l a ʒ', 'v i l a ʒ ə'],
  mille: ['m i l', 'm i l ə'],
  million: ['m i l j ɔ̃'],
  tranquille: ['t ʁ ɑ̃ k i l', 't ʁ ɑ̃ k i l ə'],
  fils: ['f i s'],
  pays: ['p e i'],
  eu: ['y'],
  six: ['s i s'],
  dix: ['d i s'],
  huit: ['ɥ i t'],
  sept: ['s ɛ t'],
  neuf: ['n œ f'],
  cinq: ['s ɛ̃ k'],
  vingt: ['v ɛ̃'],
  plus: ['p l y', 'p l y s'],
  tous: ['t u', 't u s'],
  août: ['u', 'u t'],
  oui: ['w i'],
  yeux: ['j ø'],
  œil: ['œ j'],
  œuf: ['œ f'],
  clef: ['k l e'],
  album: ['a l b ɔ m'],
  examen: ['ɛ g z a m ɛ̃'],
  automne: ['o t ɔ n'],
  hier: ['j ɛ ʁ'],
  fier: ['f j ɛ ʁ'],
  hiver: ['i v ɛ ʁ'],
  mer: ['m ɛ ʁ'],
  fer: ['f ɛ ʁ'],
  cher: ['ʃ ɛ ʁ'],
  super: ['s y p ɛ ʁ'],
  gentil: ['ʒ ɑ̃ t i'],
  outil: ['u t i'],
  dessus: ['d ə s y'],
  dessous: ['d ə s u'],
  bus: ['b y s'],
  sud: ['s y d'],
  ouest: ['w ɛ s t'],
  tennis: ['t e n i s'],
  mars: ['m a ʁ s'],
  ours: ['u ʁ s'],
  sens: ['s ɑ̃ s'],
  gaz: ['g a z'],
  net: ['n ɛ t'],
  but: ['b y t', 'b y'],
  faisons: ['f ə z ɔ̃'],
  faisait: ['f ə z ɛ'],
  faisais: ['f ə z ɛ'],
  maïs: ['m a i s'],
  hélas: ['e l a s'],
};

/** Azure reads these in English; no French spelling rule applies. */
const LOANWORDS = new Set([
  'week-end', 'weekend', 'football', 'foot', 'sandwich', 'parking', 'shopping', 'email', 'mail', 'internet',
  'ok', 'okay', 'cool', 'hamburger', 'pizza', 'netflix', 'youtube', 'instagram', 'tiktok', 'smartphone',
  'jean', 'jeans', 'basket', 'rugby', 'golf', 'hockey', 'camping', 'job', 'stop', 'fun', 'look', 'selfie',
  'wifi', 'web', 'blog', 'chat', 'snack', 'fast-food', 'baby-sitting', 'jogging', 'pull', 'jazz', 'sport',
]);

/** Final -c is silent in these. */
const SILENT_C = new Set(['blanc', 'franc', 'tabac', 'estomac', 'porc', 'banc', 'flanc', 'tronc']);

/** Elided forms (apostrophe) → what is said. */
const ELISION_PREFIXES: Record<string, string> = {
  l: 'l', j: 'ʒ', m: 'm', t: 't', s: 's', n: 'n', d: 'd', c: 's', qu: 'k',
  jusqu: 'ʒ y s k', lorsqu: 'l ɔ ʁ s k', puisqu: 'p ɥ i s k', quoiqu: 'k w a k',
};

/** A following -ent is a silent verb ending. */
const VERB_SUBJECTS = new Set(['ils', 'elles', "qu'ils", "qu'elles"]);

/** Words after which liaison into a vowel sound is obligatory, with the linking consonant. */
export const LIAISON_TRIGGERS: Readonly<Record<string, string>> = {
  les: 'z', des: 'z', ces: 'z', mes: 'z', tes: 'z', ses: 'z', nos: 'z', vos: 'z', leurs: 'z', aux: 'z',
  ils: 'z', elles: 'z', nous: 'z', vous: 'z', deux: 'z', trois: 'z', six: 'z', dix: 'z', très: 'z',
  dans: 'z', chez: 'z', un: 'n', mon: 'n', ton: 'n', son: 'n', on: 'n', en: 'n',
};

/** h aspiré (no liaison, no elision) and vowel-initial words that block liaison anyway. */
const NO_LIAISON_STEMS = [
  'haricot', 'héros', 'hibou', 'hockey', 'honte', 'huit', 'hasard', 'haut', 'hall', 'hamburger', 'handicap',
  'hanche', 'harpe', 'hache', 'haine', 'hamster', 'hareng', 'hérisson', 'hêtre', 'hollande', 'homard',
  'hongrie', 'hors', 'housse', 'hurler', 'hutte', 'huitième',
];
const NO_LIAISON_WORDS = new Set(['oui', 'onze', 'onzième', 'yaourt', 'yoga']);

/** True when `word` begins with a vowel sound that liaison/elision can link into. */
export function startsWithVowelSound(raw: string): boolean {
  const w = normalizeWord(raw);
  if (!w || NO_LIAISON_WORDS.has(w)) return false;
  if (NO_LIAISON_STEMS.some((stem) => w.startsWith(stem))) return false;
  return isVowelLetter(w[0]) || w[0] === 'h';
}

function opt(ipaList: readonly string[], phonemeTags?: SoundFamilyId[], wordTags?: SoundFamilyId[]): PhonemeOption {
  const o: { ipa: readonly string[]; phonemeTags?: SoundFamilyId[]; wordTags?: SoundFamilyId[] } = { ipa: ipaList };
  if (phonemeTags && phonemeTags.length > 0) o.phonemeTags = phonemeTags;
  if (wordTags && wordTags.length > 0) o.wordTags = wordTags;
  return o;
}

/** A vowel letter that is a vowel sound here: the u of qu, and of gu before e/i, is not. */
function isVowelAt(part: string, i: number): boolean {
  const c = part[i];
  if (!isVowelLetter(c)) return false;
  if (c === 'u' && (part[i - 1] === 'q' || (part[i - 1] === 'g' && FRONT.includes(part[i + 1] ?? '')))) return false;
  return true;
}

function vowelGroups(part: string): number {
  let groups = 0;
  for (let i = 0; i < part.length; i++) {
    if (isVowelAt(part, i) && !isVowelAt(part, i - 1)) groups += 1;
  }
  return groups;
}

/** Index where the trailing run of silent final consonants starts (part.length when there is none). */
function silentRunStart(part: string): number {
  let i = part.length;
  const silent = SILENT_C.has(part) ? `${SILENT_FINAL_LETTERS}c` : SILENT_FINAL_LETTERS;
  while (i > 0 && silent.includes(part[i - 1])) i -= 1;
  // A word that is nothing but consonants (an abbreviation) is not "silent".
  return i === 0 ? part.length : i;
}

/**
 * Splits one hyphen/apostrophe-free part. `offset` places the units in the
 * whole word; `verbContext` makes a final -ent silent.
 */
function segmentPart(s: string, offset: number, verbContext: boolean): GraphemeUnit[] {
  const n = s.length;
  const units: GraphemeUnit[] = [];
  const silentStart = silentRunStart(s);
  const monosyllable = vowelGroups(s) <= 1;
  const at = (i: number, str: string) => s.startsWith(str, i);
  const endsAt = (i: number, str: string) => at(i, str) && i + str.length === n;
  /** `str` at the end of the word, optionally followed by a plural -s/-x. */
  const endsAtPlural = (i: number, str: string) => endsAt(i, str) || ((endsAt(i, `${str}s`) || endsAt(i, `${str}x`)) && at(i, str));
  const push = (i: number, len: number, ...options: PhonemeOption[]) => {
    units.push({ text: s.slice(i, i + len), start: offset + i, end: offset + i + len, options });
    return len;
  };
  /** A nasal vowel: n before a consonant (not n/h) or the end; m before b/p or the end. */
  const nasalAt = (j: number) => {
    const letter = s[j];
    const after = s[j + 1];
    if (letter === 'n') return j + 1 === n || j + 1 >= silentStart || (isConsonantLetter(after) && after !== 'n' && after !== 'h');
    if (letter === 'm') return j + 1 === n || after === 'b' || after === 'p';
    return false;
  };
  /**
   * A nasal vowel, or (as Azure sometimes scores it, with a low second
   * segment when an n is sounded) the vowel plus a nasal tail. Both segments
   * belong to the vowel's family.
   */
  const nasal = (vowel: string): PhonemeOption[] => {
    const family = vowel === 'ɑ̃' ? 'nasalAn' : vowel === 'ɔ̃' ? 'nasalOn' : 'nasalIn';
    return [opt([vowel]), opt([vowel, 'n'], [family])];
  };
  /** The letter after index j is a vowel sound; a final -e, -es or -ent is not. */
  const vowelFollows = (j: number) =>
    isVowelLetter(s[j]) && !(s[j] === 'e' && (j + 1 === n || endsAt(j, 'es') || endsAt(j, 'ent')));

  let i = 0;
  while (i < n) {
    const c = s[i];
    const next = s[i + 1];

    if (i >= silentStart) {
      i += push(i, n - i, opt([], [], ['silentFinal']));
      continue;
    }

    // ── vowel-led units ───────────────────────────────────────────────
    if (at(i, 'eau')) { i += push(i, 3, opt(['o'])); continue; }
    if (endsAt(i, 'aient')) { i += push(i, 5, opt(['ɛ'], [], ['silentFinal'])); continue; }
    // -ent after a vowel (jouent, crient) is always a verb ending; after a consonant only a longer word's.
    if (i > 0 && endsAt(i, 'ent') && (!monosyllable || isVowelAt(s, i - 1))) {
      i += verbContext || isVowelAt(s, i - 1)
        ? push(i, 3, opt([], [], ['silentFinal']))
        : push(i, 3, ...nasal('ɑ̃'), opt([], [], ['silentFinal']));
      continue;
    }
    if (at(i, 'ien') && nasalAt(i + 2)) {
      i += endsAt(i, 'ient') || at(i, 'ienc')
        ? push(i, 3, opt(['j', 'ɛ̃']), opt(['i', 'j', 'ɑ̃']), opt(['j', 'ɑ̃']), opt(['i'], [], ['silentFinal']))
        : push(i, 3, opt(['j', 'ɛ̃']), opt(['j', 'ɛ̃', 'n'], ['nasalIn']));
      continue;
    }
    if (at(i, 'oin') && nasalAt(i + 2)) { i += push(i, 3, opt(['w', 'ɛ̃'], ['oi']), opt(['w', 'ɛ̃', 'n'], ['oi', 'nasalIn'])); continue; }
    if (at(i, 'oy') && isVowelLetter(s[i + 2])) { i += push(i, 2, opt(['w', 'a', 'j'], ['oi'])); continue; }
    if (at(i, 'oi') || at(i, 'oî')) { i += push(i, 2, opt(['w', 'a'], ['oi'])); continue; }
    if (at(i, 'ou') || at(i, 'où') || at(i, 'oû')) {
      const glide = vowelFollows(i + 2) && !at(i + 2, 'ill') && !endsAt(i + 2, 'il');
      i += push(i, 2, opt([glide ? 'w' : 'u']));
      continue;
    }
    if (at(i, 'œu')) { i += push(i, 2, opt(['œ'])); continue; }
    if (at(i, 'eu') || at(i, 'eû')) {
      const closed = isConsonantLetter(s[i + 2]) && i + 2 < silentStart;
      i += push(i, 2, opt([closed ? 'œ' : 'ø']));
      continue;
    }
    if (at(i, 'uill')) { i += push(i, 4, opt(['ɥ', 'i', 'j'], ['gnIll'])); continue; }
    if (at(i, 'ill') && i > 0) {
      i += isVowelLetter(s[i - 1])
        ? push(i, 3, opt(['j'], ['gnIll']))
        : push(i, 3, opt(['i', 'j'], ['gnIll']));
      continue;
    }
    if (endsAtPlural(i, 'il') && i > 0 && 'aeuœ'.includes(s[i - 1])) { i += push(i, 2, opt(['j'], ['gnIll'])); continue; }
    if ((at(i, 'ain') || at(i, 'aim') || at(i, 'ein') || at(i, 'eim')) && nasalAt(i + 2)) {
      i += push(i, 3, ...nasal('ɛ̃'));
      continue;
    }
    if (endsAtPlural(i, 'ail') || at(i, 'aill')) { i += push(i, 1, opt(['a'])); continue; }
    if (endsAtPlural(i, 'eil') || at(i, 'eill')) { i += push(i, 1, opt(['ɛ'])); continue; }
    if (at(i, 'ay') && isVowelLetter(s[i + 2])) { i += push(i, 2, opt(['ɛ', 'j'])); continue; }
    if (at(i, 'ai') || at(i, 'aî') || at(i, 'ei')) { i += push(i, 2, opt(['ɛ'])); continue; }
    if (at(i, 'au')) { i += push(i, 2, opt(['o'])); continue; }
    if (at(i, 'ui')) { i += push(i, 2, opt(['ɥ', 'i'])); continue; }

    if ('aeiouy'.includes(c) && (next === 'n' || next === 'm')) {
      const doubled = i === 0 && c === 'e' && s[i + 2] === next;
      if (nasalAt(i + 1) || doubled) {
        i += push(i, 2, ...nasal(c === 'a' || c === 'e' ? 'ɑ̃' : c === 'o' ? 'ɔ̃' : c === 'u' ? 'œ̃' : 'ɛ̃'));
        continue;
      }
    }

    if (c === 'e') {
      if (n >= 4 && endsAt(i, 'er')) { i += push(i, 2, opt(['e'], [], ['silentFinal'])); continue; }
      if (n >= 5 && endsAt(i, 'ers')) { i += push(i, 3, opt(['e'], [], ['silentFinal'])); continue; }
      if (endsAt(i, 'ez') || endsAt(i, 'ed')) { i += push(i, 2, opt(['e'], [], ['silentFinal'])); continue; }
      if (n >= 3 && (endsAt(i, 'et') || endsAt(i, 'ets'))) { i += push(i, n - i, opt(['ɛ'], [], ['silentFinal'])); continue; }
      if (endsAt(i, 'es')) {
        if (monosyllable && !isVowelAt(s, i - 1)) i += push(i, 2, opt(['e'], [], ['silentFinal']));
        else i += push(i, 2, opt([], [], ['silentFinal']), opt(['ə'], [], ['silentFinal']));
        continue;
      }
      if (i === n - 1) {
        if (monosyllable && !isVowelAt(s, i - 1)) i += push(i, 1, opt(['ə']));
        else i += push(i, 1, opt([]), opt(['ə']));
        continue;
      }
      const a = s[i + 1];
      const b = s[i + 2];
      const cluster = isConsonantLetter(a) && isConsonantLetter(b) && i + 2 < silentStart;
      const softCluster = 'rl'.includes(b ?? '') && 'bcdfgkptv'.includes(a ?? '');
      const digraph = ['ch', 'ph', 'th', 'gn'].includes(`${a}${b}`);
      const closedByFinal = i + 2 === silentStart && isConsonantLetter(a) && 'cflrq'.includes(a);
      if (a === 'x' || (cluster && !softCluster && !digraph) || closedByFinal) {
        i += push(i, 1, opt(['ɛ']));
        continue;
      }
      i += push(i, 1, opt(['ə']), opt([]));
      continue;
    }
    if (at(i, 'éé')) { i += push(i, 2, opt(['e']), opt(['e', 'e'])); continue; }
    if (c === 'é') { i += push(i, 1, opt(['e'])); continue; }
    if (c === 'è' || c === 'ê' || c === 'ë') { i += push(i, 1, opt(['ɛ'])); continue; }
    if (c === 'a' || c === 'à' || c === 'â' || c === 'ä') { i += push(i, 1, opt(['a'])); continue; }
    if (c === 'o' || c === 'ô' || c === 'ö') { i += push(i, 1, opt(['o'])); continue; }
    if (c === 'i' || c === 'î' || c === 'ï') {
      i += vowelFollows(i + 1) ? push(i, 1, opt(['j']), opt(['i', 'j'])) : push(i, 1, opt(['i']));
      continue;
    }
    if (c === 'y') {
      i += i === 0 && vowelFollows(1) ? push(i, 1, opt(['j'])) : push(i, 1, opt(['i']));
      continue;
    }
    if (c === 'u' || c === 'û' || c === 'ü') {
      i += push(i, 1, opt([vowelFollows(i + 1) ? 'ɥ' : 'y']));
      continue;
    }
    if (c === 'œ') { i += push(i, 1, opt(['œ'])); continue; }

    // ── consonant-led units ───────────────────────────────────────────
    if (at(i, 'ch')) { i += push(i, 2, opt(['rln'.includes(s[i + 2] ?? '') && i + 2 < n ? 'k' : 'ʃ'])); continue; }
    if (at(i, 'ck')) { i += push(i, 2, opt(['k'])); continue; }
    if (at(i, 'cc')) { i += FRONT.includes(s[i + 2] ?? '') ? push(i, 2, opt(['k', 's'])) : push(i, 2, opt(['k'])); continue; }
    if (c === 'c') { i += push(i, 1, opt([FRONT.includes(next ?? '') ? 's' : 'k'])); continue; }
    if (c === 'ç') { i += push(i, 1, opt(['s'])); continue; }
    if (at(i, 'ph')) { i += push(i, 2, opt(['f'])); continue; }
    if (at(i, 'th')) { i += push(i, 2, opt(['t'])); continue; }
    if (at(i, 'rh')) { i += push(i, 2, opt(['ʁ'])); continue; }
    if (at(i, 'sh')) { i += push(i, 2, opt(['ʃ'])); continue; }
    if (at(i, 'qu')) { i += push(i, 2, opt(['k'])); continue; }
    if (c === 'q') { i += push(i, 1, opt(['k'])); continue; }
    if (at(i, 'gn')) { i += push(i, 2, opt(['ɲ'])); continue; }
    if (at(i, 'gu') && FRONT.includes(s[i + 2] ?? '')) { i += push(i, 2, opt(['g'])); continue; }
    if (at(i, 'ge') && 'aouâô'.includes(s[i + 2] ?? '_')) { i += push(i, 2, opt(['ʒ'])); continue; }
    if (at(i, 'gg') && FRONT.includes(s[i + 2] ?? '')) { i += push(i, 2, opt(['g', 'ʒ'])); continue; }
    if (c === 'g') { i += push(i, 1 + (next === 'g' ? 1 : 0), opt([FRONT.includes(next ?? '') ? 'ʒ' : 'g'])); continue; }
    if (at(i, 'sc') && FRONT.includes(s[i + 2] ?? '')) { i += push(i, 2, opt(['s'])); continue; }
    if (at(i, 'ss')) { i += push(i, 2, opt(['s'])); continue; }
    if (c === 's') { i += push(i, 1, opt([isVowelLetter(s[i - 1]) && isVowelLetter(next) ? 'z' : 's'])); continue; }
    if (c === 'x') {
      i += i === 1 && s[0] === 'e' && (isVowelLetter(next) || next === 'h')
        ? push(i, 1, opt(['g', 'z']))
        : push(i, 1, opt(['k', 's']));
      continue;
    }
    if (at(i, 'zz')) { i += push(i, 2, opt(['d', 'z'])); continue; }
    if (c === 'h') { i += push(i, 1, opt([])); continue; }
    if (c === 'j') { i += push(i, 1, opt(['ʒ'])); continue; }
    if (c === 'r') { i += push(i, next === 'r' ? 2 : 1, opt(['ʁ'])); continue; }
    if (c === 't' && at(i, 'tion') && !'sx'.includes(s[i - 1] ?? '_')) { i += push(i, 1, opt(['s'])); continue; }
    if (c === 'w') { i += push(i, 1, opt(['w'])); continue; }
    if (c === 'k') { i += push(i, 1, opt(['k'])); continue; }
    if ('bdflmnptvz'.includes(c)) { i += push(i, next === c ? 2 : 1, opt([c])); continue; }

    // Anything else (a letter outside French spelling): one unknown sound.
    i += push(i, 1, opt([c]));
  }
  return units;
}

/**
 * Splits a word into spelling units with their expected phonemes. `context`
 * supplies the neighbouring words: the previous one decides a silent verb
 * -ent, the next one an obligatory liaison. Returns null for anything that is
 * not a plain French word (digits, loanwords, empty).
 */
export function segmentWord(raw: string, context: WordContext = {}): SegmentedWord | null {
  const word = normalizeWord(raw);
  if (!word || /[^\p{L}'-]/u.test(word) || LOANWORDS.has(word)) return null;
  const units: GraphemeUnit[] = [];
  let offset = 0;

  const apostrophe = word.indexOf("'");
  if (apostrophe > 0 && !(word in LEXICON)) {
    const elided = ELISION_PREFIXES[word.slice(0, apostrophe)];
    if (elided) {
      units.push({ text: word.slice(0, apostrophe + 1), start: 0, end: apostrophe + 1, options: [opt(ipa(elided), [], ['elision'])] });
      offset = apostrophe + 1;
    }
  }

  const rest = word.slice(offset);
  const verbContext = context.previous ? VERB_SUBJECTS.has(normalizeWord(context.previous)) : false;
  const parts = rest in LEXICON ? [rest] : rest.split(/(['-])/);
  let cursor = offset;
  for (const part of parts) {
    if (part === '' ) continue;
    if (part === "'" || part === '-') { cursor += 1; continue; }
    const lexical = LEXICON[part];
    if (lexical) {
      units.push({ text: part, start: cursor, end: cursor + part.length, options: lexical.map((r) => opt(ipa(r))), lexical: true });
    } else {
      units.push(...segmentPart(part, cursor, verbContext));
    }
    cursor += part.length;
  }

  const liaison = LIAISON_TRIGGERS[word];
  if (liaison && context.next && startsWithVowelSound(context.next)) {
    units.push({
      text: '',
      start: word.length,
      end: word.length,
      options: [opt([], [], ['liaison']), opt([liaison], [], ['liaison'])],
    });
  }
  return { word, units };
}

/** Every reading of the word (the cartesian product of unit options), at most `max`. */
export function wordVariants(segmented: SegmentedWord, max = 256): WordVariant[] {
  let variants: WordVariant[] = [{ phonemes: [], wordTags: [] }];
  segmented.units.forEach((unit, unitIndex) => {
    const nextVariants: WordVariant[] = [];
    for (const v of variants) {
      for (const o of unit.options) {
        if (nextVariants.length >= max) break;
        nextVariants.push({
          phonemes: [...v.phonemes, ...o.ipa.map((p) => ({ ipa: p, unitIndex, tags: o.phonemeTags ?? [] }))],
          wordTags: [...v.wordTags, ...(o.wordTags ?? []).map((family) => ({ family, unitIndex }))],
        });
      }
    }
    variants = nextVariants;
  });
  return variants;
}
