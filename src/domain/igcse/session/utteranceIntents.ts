/**
 * S10 C4 — whole-utterance intent classifier (pure, no I/O). Distinguishes a
 * real answer from the three non-answer conducts the examiner engine needs to
 * route differently: "I don't know", a repeat request, and English (non-French).
 * Precision over recall — an ambiguous or substantive utterance defaults to
 * 'answer' rather than risk swallowing a real response. Anchored on the whole
 * normalized utterance (not a substring search), so a longer answer that merely
 * *contains* "je ne sais pas" stays 'answer'.
 */

import { normalizeForMatch } from '../text/normalize';

export type UtteranceIntent = 'answer' | 'dont_know' | 'repeat_request' | 'clarification_request' | 'non_french';

/**
 * Clarification vs. repeat (Change B): a repeat request asks the examiner to say
 * the SAME question again ("répète") — a clarification request asks what a word
 * or the question MEANS ("que veut dire…", "c'est quoi…"). Both route the engine
 * to the same authentic-Cambridge verbatim REPEAT (the examiner never explains),
 * but they are distinct intents so the scored-transcript blanking and the debug
 * trigger can tell them apart. Precision-first, like the other lists: a longer
 * substantive answer that merely contains "je ne comprends pas le mot…" stays an
 * answer via the whole-utterance anchor.
 */
const CLARIFICATION_REQUEST_PATTERNS: RegExp[] = [
  /^ça veut dire quoi( .+)?$/,
  /^que veut dire( .+)?$/,
  /^qu'?est-ce que ça (veut dire|signifie)( .+)?$/,
  /^c'?est quoi( .+)?$/,
  /^je ne comprends pas le mot( .+)?$/,
  /^je (ne )?connais pas (ce|le) mot( .+)?$/,
];

/**
 * Strips leading fillers ("euh", "ben", "bah", "alors") and trailing/leading
 * punctuation noise for whole-utterance matching. Exported so the deterministic
 * conversational-memory selector (conductEngine.ts, Change C) reuses the exact
 * same filler-stripping rule when it picks a verbatim callback span.
 */
export function stripFillers(normalized: string): string {
  return normalized
    .replace(/^(euh+|ben|bah|alors|donc|enfin)[\s,]+/g, '')
    .replace(/[.!?…]+$/g, '')
    .trim();
}

const DONT_KNOW_PATTERNS: RegExp[] = [
  /^je (ne )?sais pas$/,
  /^je (ne )?sais pas trop$/,
  /^j'?ai aucune idée$/,
  /^aucune idée$/,
  /^je (ne )?comprends pas$/,
  /^je ne comprends pas la question$/,
  /^(sais pas|nsp)$/,
];

const REPEAT_REQUEST_PATTERNS: RegExp[] = [
  /^(peux-tu|pouvez-vous|tu peux) répéter/,
  /^(peux-tu|pouvez-vous|tu peux) répéter( la question)?( s'?il (te|vous) plaît)?$/,
  /^(répète|répétez)(,)? ?(s'?il (te|vous) plaît)?$/,
  /^pardon\s*\??$/,
  /^comment\s*\??$/,
  /^encore une fois\s*\??$/,
  /^quoi\s*\??$/,
];

const NON_FRENCH_PATTERNS: RegExp[] = [
  /^what\??$/,
  /^i don'?t know$/,
  /^i do not know$/,
  /^can you repeat(( that)|( the question))?\??$/,
  /^sorry\??$/,
  /^pardon me\??$/,
  /^what does that mean\??$/,
  /^i don'?t understand$/,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Classifies a whole candidate utterance. Returns 'answer' for anything that
 * isn't a confident, whole-utterance match against the dont_know/repeat_request/
 * non_french lists — including longer utterances that merely contain one of
 * those phrases alongside substantive content.
 */
export function classifyUtteranceIntent(transcript: string): UtteranceIntent {
  const normalized = stripFillers(normalizeForMatch(transcript));
  if (normalized.length === 0) return 'answer';

  if (matchesAny(normalized, NON_FRENCH_PATTERNS)) return 'non_french';
  // Clarification before dont_know/repeat: "je ne comprends pas le mot X" is a
  // more specific clarification, not the bare "je ne comprends pas" non-answer.
  if (matchesAny(normalized, CLARIFICATION_REQUEST_PATTERNS)) return 'clarification_request';
  if (matchesAny(normalized, REPEAT_REQUEST_PATTERNS)) return 'repeat_request';
  if (matchesAny(normalized, DONT_KNOW_PATTERNS)) return 'dont_know';
  return 'answer';
}
