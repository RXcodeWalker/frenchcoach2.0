/**
 * Pronunciation Lab — "sounds roughly like" for one word. Pure.
 *
 * A focus word used to get only its sound family's general tip ("round your
 * lips…"). A beginner can't always map that onto the word in front of them, so
 * this gives the word itself an English-letters cue: « bon » → "boh(n)",
 * « jardin » → "zhahr-deh(n)".
 *
 * It is built from the same spelling units as everything else in the Lab
 * (`graphemes.ts`) and is deliberately timid. It reads each unit's first
 * (most likely) reading, and only when every other reading of that unit is a
 * minor variant of it — a said "n" after a nasal vowel, a schwa that may or may
 * not be pronounced, é/è. A unit with a real alternative (the -ent of
 * "souvent" vs "ils parlent", an optional liaison) gives no cue at all, as does
 * any sound without an English cue below. A cue is a teaching aid, never a
 * verdict on the learner and never a score.
 */

import { segmentWord, type GraphemeUnit } from './graphemes';

const VOWEL_CUES: Readonly<Record<string, string>> = {
  a: 'ah', ɑ: 'ah', i: 'ee', e: 'ay', ɛ: 'eh', ə: 'uh', o: 'oh', ɔ: 'o', u: 'oo', y: 'ew', ø: 'uh', œ: 'uh',
  // A nasal vowel: the "(n)" means the n is NOT said.
  ɑ̃: 'ah(n)', ɔ̃: 'oh(n)', ɛ̃: 'eh(n)', œ̃: 'uh(n)',
};
const CONSONANT_CUES: Readonly<Record<string, string>> = {
  b: 'b', d: 'd', f: 'f', g: 'g', k: 'k', l: 'l', m: 'm', n: 'n', p: 'p', s: 's', t: 't', v: 'v', z: 'z',
  ʃ: 'sh', ʒ: 'zh', ɲ: 'ny', ʁ: 'r', j: 'y', w: 'w', ɥ: 'w',
};

const nfc = (table: Readonly<Record<string, string>>) =>
  new Map(Object.entries(table).map(([ipa, cue]) => [ipa.normalize('NFC'), cue]));
const VOWELS = nfc(VOWEL_CUES);
const CONSONANTS = nfc(CONSONANT_CUES);

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((p, i) => p === b[i]);

/** Whether `other` is only a minor variant of `first` (so reading `first` can't mislead). */
function isMinorVariant(first: readonly string[], other: readonly string[]): boolean {
  if (same(first, other)) return true;
  // Nasal vowel with or without a said n/m after it.
  if (other.length === first.length + 1 && same(other.slice(0, -1), first) && /^[nm]$/.test(other[other.length - 1])) return true;
  if (first.length === other.length + 1 && same(first.slice(0, -1), other) && /^[nm]$/.test(first[first.length - 1])) return true;
  // A schwa that may be dropped.
  if (first.length + other.length === 1 && [...first, ...other][0] === 'ə') return true;
  // é / è somewhere in the word and nothing else different.
  return (
    first.length === other.length &&
    first.every((p, i) => p === other[i] || (['e', 'ɛ'].includes(p) && ['e', 'ɛ'].includes(other[i])))
  );
}

/** The phonemes of a unit's first reading, or null when a real alternative makes any reading a guess. */
function firstReading(unit: GraphemeUnit): readonly string[] | null {
  const [first, ...rest] = unit.options;
  if (!first) return null;
  return rest.every((o) => isMinorVariant(first.ipa, o.ipa)) ? first.ipa : null;
}

/** Cues in order, with whether each is a vowel. Null when any sound has no cue. */
function cuesOf(word: string): Array<{ cue: string; vowel: boolean }> | null {
  const segmented = segmentWord(word);
  if (!segmented) return null;
  const out: Array<{ cue: string; vowel: boolean }> = [];
  for (const unit of segmented.units) {
    const reading = firstReading(unit);
    if (reading === null) return null;
    for (const raw of reading) {
      const ipa = raw.normalize('NFC');
      const vowel = VOWELS.get(ipa);
      if (vowel !== undefined) {
        out.push({ cue: vowel, vowel: true });
        continue;
      }
      const consonant = CONSONANTS.get(ipa);
      if (consonant === undefined) return null;
      out.push({ cue: consonant, vowel: false });
    }
  }
  return out;
}

/**
 * Syllables from cues: each vowel closes one. Of a cluster of consonants between
 * two vowels the first stays with the earlier syllable and the rest start the
 * next; a single consonant starts the next; trailing consonants stay put.
 */
function syllables(cues: ReadonlyArray<{ cue: string; vowel: boolean }>): string[] | null {
  const out: string[] = [];
  let pending = '';
  let cluster: string[] = [];
  for (const { cue, vowel } of cues) {
    if (!vowel) {
      cluster.push(cue);
      continue;
    }
    if (out.length === 0) {
      pending = cluster.join('') + cue;
    } else {
      // Between two vowels: split the cluster.
      const stay = cluster.length >= 2 ? cluster.slice(0, 1).join('') : '';
      const go = cluster.length >= 2 ? cluster.slice(1).join('') : cluster.join('');
      out[out.length - 1] += stay;
      pending = go + cue;
    }
    out.push(pending);
    cluster = [];
  }
  if (out.length === 0) return null;
  out[out.length - 1] += cluster.join('');
  return out;
}

/** The cue for `word` ("boh(n)", "zhahr-deh(n)", "tew"), or null when it can't be given honestly. */
export function respellWord(word: string): string | null {
  const cues = cuesOf(word);
  if (!cues) return null;
  const parts = syllables(cues);
  if (!parts) return null;
  const cue = parts.join('-');
  // A cue that only repeats the spelling teaches nothing.
  const plain = (s: string) => s.replace(/[-()]/g, '');
  const spelled = segmentWord(word)?.word ?? '';
  return plain(cue) === spelled ? null : cue;
}
