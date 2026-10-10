/**
 * "Try it first" check (Learn feedback Batch 6b): did the learner's own attempt
 * at a fix land on the correction?
 *
 * It only ever says YES. `match` means the attempt clearly contains the fix;
 * anything else is `unsure`, and the caller then just reveals the answer
 * ("Here's how I'd say it: …") — never "wrong" or "close". That asymmetry is the
 * point: the correction is one valid rewrite, not the only one. « on est
 * allés » for « nous sommes allés », a learner who types only « suis », a
 * straight vs typographic apostrophe — a string-equality check would call each
 * of those a mistake. A false "Yes, that's it" is the opposite risk, so each
 * rule below is deliberately tight.
 *
 * Pure. Never scored, never a belief, XP or analytics input (the caller writes
 * nothing). Imports the same shared helpers as filterCoachFeedback.ts.
 *
 * An attempt `match`es when, after normalisation (case, apostrophes, edge
 * punctuation, whitespace; accents folded unless the quote and correction
 * differ only by accents):
 *  1. it contains the whole correction as a run of whole words; or
 *  2. (spoken answers only) it sounds like the correction — they differ only in
 *     spelling that cannot be heard (isSoundAlike); or
 *  3. it contains every word the correction ADDS to the quote and none of the
 *     words it REMOVES (diffWords). Needs at least one added word, so an attempt
 *     can never match a correction that only deletes.
 */
import { isSoundAlike } from '../../examFeedback/shared/spellingOnly';
import { diffWords } from './buildChanges';
import type { CoachInputMode } from './filterCoachFeedback';

export type FixMatch = 'match' | 'unsure';

const COMBINING_MARKS = /[̀-ͯ]/g;

/** Lower-cased whole words: apostrophes and hyphens stay inside a word (« j'ai », « est-ce »), edges and other punctuation go. */
function words(text: string, keepAccents: boolean): string[] {
  let t = text.normalize('NFC').toLowerCase().replace(/[‘’´`]/g, "'");
  if (!keepAccents) t = t.normalize('NFD').replace(COMBINING_MARKS, '').normalize('NFC');
  return t
    .replace(/[^\p{L}\p{N}'\-\s]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter(Boolean);
}

/** The quote and the correction are the same words once accents are folded, but not before: « mange » → « mangé ». */
function differOnlyByAccents(quote: string, correction: string): boolean {
  const folded = (s: string) => words(s, false).join(' ');
  const exact = (s: string) => words(s, true).join(' ');
  return folded(quote) === folded(correction) && exact(quote) !== exact(correction);
}

/** `needle` appears in `haystack` as a contiguous run of whole words. */
function containsRun(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

export function fixMatch(
  attempt: string,
  quote: string,
  correction: string,
  inputMode: CoachInputMode | undefined,
): FixMatch {
  const keepAccents = differOnlyByAccents(quote, correction);
  const got = words(attempt, keepAccents);
  const want = words(correction, keepAccents);
  if (got.length === 0 || want.length === 0) return 'unsure';

  if (containsRun(got, want)) return 'match';

  if (inputMode === 'speech' && isSoundAlike(attempt, correction)) return 'match';

  const before = words(quote, keepAccents);
  if (before.length > 0) {
    const added: string[] = [];
    const removed: string[] = [];
    for (const op of diffWords(before.join(' '), want.join(' '))) {
      if (op.type === 'equal') continue;
      added.push(...words(op.afterText, keepAccents));
      removed.push(...words(op.beforeText, keepAccents));
    }
    const heard = new Set(got);
    if (added.length > 0 && added.every((w) => heard.has(w)) && removed.every((w) => !heard.has(w))) return 'match';
  }

  return 'unsure';
}

/**
 * Second take (Learn feedback Batch 6c): was the correction said somewhere in
 * a whole re-answer? The retake is spoken and free to restructure, so this is
 * stricter than `fixMatch` where it must be and never a verdict:
 *  1. the whole correction appears as a run of whole words; or
 *  2. the retake sounds like the correction (spoken, so isSoundAlike applies); or
 *  3. every edit the correction makes appears as a run — the changed words
 *     plus the unchanged word on each side — so a lone « suis » elsewhere in a
 *     long answer is not enough.
 * Pure; a `false` means "not heard", never "wrong".
 */
export function fixHeard(retake: string, quote: string, correction: string): boolean {
  const keepAccents = differOnlyByAccents(quote, correction);
  const got = words(retake, keepAccents);
  const want = words(correction, keepAccents);
  if (got.length === 0 || want.length === 0) return false;
  if (containsRun(got, want)) return true;
  if (isSoundAlike(retake, correction)) return true;

  const before = words(quote, keepAccents);
  if (before.length === 0) return false;
  const changed: boolean[] = [];
  for (const op of diffWords(before.join(' '), want.join(' '))) {
    const isChange = op.type !== 'equal';
    changed.push(...words(op.afterText, keepAccents).map(() => isChange));
  }
  if (changed.length !== want.length || !changed.includes(true)) return false;

  for (let i = 0; i < changed.length; ) {
    if (!changed[i]) {
      i++;
      continue;
    }
    let end = i;
    while (end < changed.length && changed[end]) end++;
    if (!containsRun(got, want.slice(Math.max(0, i - 1), Math.min(want.length, end + 1)))) return false;
    i = end;
  }
  return true;
}

/** The learner's exact error words appear, as whole words, in the retake. */
export function quoteHeard(retake: string, quote: string, correction: string): boolean {
  const keepAccents = differOnlyByAccents(quote, correction);
  return containsRun(words(retake, keepAccents), words(quote, keepAccents));
}

/** The error quote is itself part of the correction (« allé » inside « je suis allé »), so hearing it proves nothing. */
export function quoteInsideCorrection(quote: string, correction: string): boolean {
  const keepAccents = differOnlyByAccents(quote, correction);
  return containsRun(words(correction, keepAccents), words(quote, keepAccents));
}

/** A strength's quote appears, as whole words, in the retake. */
export function phraseHeard(retake: string, phrase: string): boolean {
  return containsRun(words(retake, false), words(phrase, false));
}
