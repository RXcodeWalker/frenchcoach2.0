/**
 * Sound-alike filter (Phase 3 plan, "Shared invariants"). A SPOKEN answer
 * cannot contain an error that exists only in spelling, so the model's report
 * of one ("chose" for "choses", "au jeux" for "aux jeux", a missing accent)
 * is an artefact of the transcript, not something the candidate said. A TYPED
 * answer keeps every such error.
 *
 * Deliberately narrow — when unsure, the error is KEPT, because deleting an
 * audible error is worse than showing an inaudible one:
 *  - case, punctuation and non-final accents are folded;
 *  - a word-final `é` / `ée` is NOT folded: it is audible ("j'ai mange" →
 *    "j'ai mangé" is a real past-participle error);
 *  - a word-final silent `s`/`x` is stripped only where the stem keeps 3+
 *    letters (chose/choses, jeu/jeux) plus au/aux. Shorter stems are left
 *    alone: le/les, de/des, il/ils differ in sound or in number heard.
 *  - it does NOT strip final `e`/`t`/`ent`: "petit" → "petite" is audible.
 *    What this narrow rule misses ("il mange"/"ils mangent") is the prompt's
 *    job, not this filter's.
 */

import { canonicalizeForMatch } from '../../igcse/text/normalize';

/** Structurally the STT layer's `CandidateInputMode`, restated so this module imports nothing but the text normalizer. */
type SpokenOrTyped = 'speech' | 'text';

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const FINAL_AUDIBLE_E_ACUTE = /^(.*?)(é|ée)$/;

function stripSilentPlural(word: string): string {
  if (word === 'aux') return 'au';
  if (/[sx]$/.test(word) && word.length - 1 >= 3) return word.slice(0, -1);
  return word;
}

function foldAccents(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').normalize('NFC');
}

function foldWord(word: string): string {
  const stem = stripSilentPlural(word);
  const m = FINAL_AUDIBLE_E_ACUTE.exec(stem);
  return m ? foldAccents(m[1]) + m[2] : foldAccents(stem);
}

function soundForm(text: string): string[] {
  return canonicalizeForMatch(text)
    .replace(/['’]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(foldWord);
}

/** The correction is the quote again (modulo case and edge punctuation): there is no error to show. */
export function isCorrectionIdentical(quote: string, correction: string): boolean {
  return canonicalizeForMatch(quote) === canonicalizeForMatch(correction);
}

/** The quote and its correction differ only in ways that cannot be heard (see module header). */
export function isSoundAlike(quote: string, correction: string): boolean {
  const a = soundForm(quote);
  const b = soundForm(correction);
  return a.length > 0 && a.length === b.length && a.every((w, i) => w === b[i]);
}

/**
 * Whether an error should be dropped before display. An identical correction
 * is always dropped; a sound-alike one only on a spoken turn. An unknown input
 * mode is treated as typed (keeps the error).
 */
export function shouldDropSpellingOnlyError(
  quote: string,
  correction: string,
  inputMode: SpokenOrTyped | undefined,
): boolean {
  if (isCorrectionIdentical(quote, correction)) return true;
  return inputMode === 'speech' && isSoundAlike(quote, correction);
}
