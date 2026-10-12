/**
 * Token model shared by the sound-alike tables (`classes.ts`, `nearPairs.ts`)
 * and the respeller (`respell.ts`). A token is one whitespace-separated run;
 * its leading and trailing punctuation is kept aside, so a respelling can
 * never change the token count, the spacing or the punctuation.
 */

const APOSTROPHES = /[‘’ʼ`´]/g;
const LEAD = /^["'«“([¿¡]+/;
const TRAIL = /["'»”)\].,;:!?…]+$/;
const ELISION = /^(jusqu|lorsqu|puisqu|qu|[jlmtscnd])'(.+)$/;
const SENTENCE_END = /[.!?…]/;
/** A word starting with one of these can carry a liaison from the word before. `h` and `y` count (conservative). */
const VOWEL_START = /^[aeiouyhàâäéèêëîïôöùûüœæ0-9]/;

export interface Token {
  /** The token exactly as written, punctuation included. */
  readonly raw: string;
  readonly lead: string;
  readonly trail: string;
  /** The word as written (original case and apostrophe), punctuation removed. */
  readonly core: string;
  /** `core` lower-cased, NFC, straight apostrophes: "c'est". */
  readonly lower: string;
  /** Elided prefix including its apostrophe ("c'", "qu'"), or "". */
  readonly prefix: string;
  /** `lower` without `prefix`: "est" for "c'est". */
  readonly word: string;
  /** Trailing `.`, `!`, `?` or `…`. */
  readonly endsSentence: boolean;
  /** Any trailing punctuation: a written pause, so no liaison into the next word. */
  readonly pauseAfter: boolean;
}

/** Lower-case, NFC, straight apostrophes. */
export function normalizeWord(input: string): string {
  return input.normalize('NFC').replace(APOSTROPHES, "'").toLowerCase();
}

export function splitElision(lower: string): { prefix: string; word: string } {
  const m = ELISION.exec(lower);
  return m ? { prefix: `${m[1]}'`, word: m[2] } : { prefix: '', word: lower };
}

export function parseToken(raw: string): Token {
  const lead = LEAD.exec(raw)?.[0] ?? '';
  const rest = raw.slice(lead.length);
  const trail = TRAIL.exec(rest)?.[0] ?? '';
  const core = rest.slice(0, rest.length - trail.length);
  const lower = normalizeWord(core);
  const { prefix, word } = splitElision(lower);
  return {
    raw,
    lead,
    trail,
    core,
    lower,
    prefix,
    word,
    endsSentence: SENTENCE_END.test(trail),
    pauseAfter: trail.length > 0,
  };
}

export function tokenize(text: string): Token[] {
  return text.split(/\s+/).filter(Boolean).map(parseToken);
}

export function startsWithVowelSound(lower: string): boolean {
  return VOWEL_START.test(lower);
}

/** Re-applies the original's capitalisation to a replacement word. */
export function matchCase(original: string, replacement: string): string {
  if (original.length > 1 && original === original.toUpperCase() && original !== original.toLowerCase()) {
    return replacement.toUpperCase();
  }
  const first = original.charAt(0);
  if (first && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}
