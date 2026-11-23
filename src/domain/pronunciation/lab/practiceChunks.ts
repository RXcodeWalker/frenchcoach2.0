/**
 * Pronunciation Lab — cutting a long corrected answer into sentences to say
 * one at a time. Pure.
 *
 * Learn's "Say it better" text is 30–70 words (the backend asks for it), but the
 * Lab practises one breath at a time: one sentence, a handful of words, "N of M
 * words clear". So the corrected answer is cut with `splitSentences` (the
 * recording script's own splitter), and a sentence that is still too long is
 * cut again at its commas — never mid-clause, never rewritten. A piece with no
 * comma to cut at stays whole; a longer take is better than a broken sentence.
 */

import { splitSentences } from './sentences';
import { tokenizeSentence } from './textFeatures';

/** Product decision, not a measurement: the most words one Lab sentence should hold. */
export const CHUNK_MAX_WORDS = 20;
/** Product decision: a comma cut never leaves a piece shorter than this many words. */
export const CHUNK_MIN_WORDS = 3;

const wordCount = (text: string) => tokenizeSentence(text).length;

/** Cuts one long sentence at its commas into pieces of at most `CHUNK_MAX_WORDS`, none under `CHUNK_MIN_WORDS`. */
function cutAtCommas(sentence: string): string[] {
  if (wordCount(sentence) <= CHUNK_MAX_WORDS) return [sentence];
  const parts = sentence.split(/(?<=,)\s+/u).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return [sentence];

  const pieces: string[] = [];
  let current = '';
  for (const part of parts) {
    const joined = current ? `${current} ${part}` : part;
    if (current && wordCount(joined) > CHUNK_MAX_WORDS && wordCount(current) >= CHUNK_MIN_WORDS) {
      pieces.push(current);
      current = part;
    } else {
      current = joined;
    }
  }
  if (current) {
    // A short tail joins the piece before it rather than standing alone.
    if (pieces.length > 0 && wordCount(current) < CHUNK_MIN_WORDS) pieces[pieces.length - 1] += ` ${current}`;
    else pieces.push(current);
  }
  // A closing comma is not part of what is said: the last piece ends on its own punctuation.
  return pieces.map((p, i) => (i < pieces.length - 1 ? p.replace(/,$/u, '') : p));
}

/**
 * The pieces of `text` to practise, in reading order. One piece for a short
 * answer; empty only when `text` has no letters. Every piece is text taken from
 * `text`, so a recorded sentence (a model answer's) is still found by its key.
 */
export function practiceChunks(text: string): string[] {
  return splitSentences(text).flatMap(cutAtCommas);
}
