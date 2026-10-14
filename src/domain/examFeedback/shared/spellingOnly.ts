/**
 * Sound-alike filter (Phase 3 plan, "Shared invariants"). A SPOKEN answer
 * cannot contain an error that exists only in spelling, so the model's report
 * of one ("chose" for "choses", "il mange" for "ils mangent", a missing accent)
 * is an artefact of the transcript, not something the candidate said. A TYPED
 * answer keeps every such error.
 *
 * Built on the marker's own tables (transcription-accuracy stage 7): "sounds
 * the same" is decided by `igcse/stt/homophones/` (Category A classes with
 * their liaison check), the single source of truth the scorer and Learn's
 * confirm screen also use. Category B pairs (un/en, ont/sont, le/les…) are
 * audible and are NOT dropped here. On top of the tables, the only extra rule
 * is the accent fold:
 *  - case, punctuation and non-final accents are folded ("prefere" = "préfère");
 *  - a word-final `é` / `ée` is NOT folded: it is audible ("j'ai mange" →
 *    "j'ai mangé" is a real past-participle error).
 *
 * Deliberately narrow — when unsure, the error is KEPT, because deleting an
 * audible error is worse than showing an inaudible one ("petit" → "petite").
 */

import { soundsIdenticalInContext } from '../../igcse/stt/homophones/classes';
import { tokenize } from '../../igcse/stt/homophones/text';
import { canonicalizeForMatch } from '../../igcse/text/normalize';

/** Structurally the STT layer's `CandidateInputMode`, restated so this module imports nothing but the text normalizer and the homophone tables. */
type SpokenOrTyped = 'speech' | 'text';

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const FINAL_AUDIBLE_E_ACUTE = /^(.*?)(é|ée)$/;

function foldAccents(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').normalize('NFC');
}

/** Non-final accents folded; a word-final é / ée kept (it is audible). */
function foldWord(word: string): string {
  const m = FINAL_AUDIBLE_E_ACUTE.exec(word);
  return m ? foldAccents(m[1]) + m[2] : foldAccents(word);
}

/** The correction is the quote again (modulo case and edge punctuation): there is no error to show. */
export function isCorrectionIdentical(quote: string, correction: string): boolean {
  return canonicalizeForMatch(quote) === canonicalizeForMatch(correction);
}

function tokensSoundAlike(q: ReturnType<typeof tokenize>, c: ReturnType<typeof tokenize>): boolean {
  if (q.length === 0 || q.length !== c.length) return false;
  return q.every((t, i) => {
    if (foldWord(t.lower) === foldWord(c[i].lower)) return true;
    const pause = t.pauseAfter || c[i].pauseAfter;
    const nq = q[i + 1]?.lower;
    const nc = c[i + 1]?.lower;
    return soundsIdenticalInContext(t.lower, c[i].lower, nq, pause) && soundsIdenticalInContext(t.lower, c[i].lower, nc, pause);
  });
}

const withApostropheAsSpace = (text: string) => text.replace(/['’]/g, ' ');

/**
 * The quote and its correction differ only in ways that cannot be heard (see
 * module header): same number of words, and each differing word is the same
 * after the accent fold or sounds the same in its place (Category A). A
 * recogniser that writes "c est" for "c'est" is the same sound, so the words
 * are also compared with every apostrophe read as a space.
 */
export function isSoundAlike(quote: string, correction: string): boolean {
  const live = (text: string) => tokenize(text).filter((t) => t.lower);
  return (
    tokensSoundAlike(live(quote), live(correction)) ||
    tokensSoundAlike(live(withApostropheAsSpace(quote)), live(withApostropheAsSpace(correction)))
  );
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
