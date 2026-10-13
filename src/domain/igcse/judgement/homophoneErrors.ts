/**
 * Stage 6 (transcription-accuracy plan, Phase 4): the owner's sound-alike
 * rules, applied to the Quality of Language judge's error list after it is
 * parsed. Deterministic; the judge's reply is never rewritten, only sorted.
 *
 * Each listed error is one of:
 *  - 'inaudible' (Category A): on a spoken answer, the quote and its
 *    correction differ only in spellings that sound the same where they stand
 *    (stt/homophones/classes.ts, liaison included). A spoken answer cannot
 *    show such an error, so it is never penalised.
 *  - 'ambiguousNear' (Category B): every difference is Category A or a
 *    Category B pair (un/en, ont/sont…), and each Category B word sits inside
 *    one of the answer's `nearHomophone` spans for that pair — the two
 *    recognisers disagreed on it, or only one recogniser read the answer.
 *    Benefit of the doubt; the feedback still names the word.
 *  - 'counted': anything else — a clearly different word, a Category B word
 *    both recognisers agreed on, a typed answer, a quote that cannot be placed
 *    in its answer, an error the judge listed with an identical correction.
 *    When unsure, the error counts: lean against under-marking only where it
 *    is reasonably obvious what was meant.
 *
 * Excused errors leave the counted list. If any were excused, the QoL call is
 * asked once more, told they are not errors (prompt.ts `notErrors`), and the
 * re-run's mark is the one kept (`resolveQolHomophones`). Nothing here can
 * raise a mark on its own; a re-run that still lists an excused error, or a
 * re-ask that failed, is reported by guardrails/homophoneErrors.ts.
 */

import { soundsIdenticalInContext } from '../stt/homophones/classes';
import { nearPairOf } from '../stt/homophones/nearPairs';
import { tokenize, type Token } from '../stt/homophones/text';
import { canonicalizeForMatch } from '../text/normalize';
import type {
  ConversationTurn,
  ExcusedQolError,
  ExcuseReason,
  QolError,
  QualityOfLanguageAssessment,
  SpeakingTranscript,
} from './types';

export type QolErrorClass = ExcuseReason | 'counted';

export interface QolErrorClassification {
  verdict: QolErrorClass;
  /** Category B pair ids behind an 'ambiguousNear' verdict; [] otherwise. */
  nearPairIds: string[];
}

const COUNTED: QolErrorClassification = { verdict: 'counted', nearPairIds: [] };

/** A word of the answer with its whitespace-token index (the index AmbiguousSpan uses). */
interface Word {
  token: Token;
  index: number;
}

function words(text: string): Word[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw, index) => ({ token: tokenize(raw)[0], index }))
    .filter((w) => w.token.lower !== '');
}

function findTurn(transcript: SpeakingTranscript, error: QolError): ConversationTurn | undefined {
  return transcript.topicConversations
    .find((c) => c.conversationId === error.source)
    ?.turns.find((t) => t.turnId === error.turnId);
}

/** Every position where the quote's words occur, in order, among the answer's words. */
function occurrences(answer: readonly Word[], quote: readonly Token[]): number[] {
  const found: number[] = [];
  for (let i = 0; i + quote.length <= answer.length; i += 1) {
    if (quote.every((q, k) => answer[i + k].token.lower === q.lower)) found.push(i);
  }
  return found;
}

/** Whether this word of the answer is inside a nearHomophone span carrying the pair. */
function uncertainAt(turn: ConversationTurn, index: number, pairId: string): boolean {
  return (turn.ambiguousSpans ?? []).some(
    (s) => s.kind === 'nearHomophone' && s.start <= index && index < s.end && s.pairIds.includes(pairId),
  );
}

/**
 * Verdict for the quote placed at answer word `at` (or not placed: `at` null).
 * Unplaced, only Category A can be judged, with the liaison context the quote
 * itself gives.
 */
function verdictAt(
  turn: ConversationTurn,
  answer: readonly Word[],
  at: number | null,
  quote: readonly Token[],
  correction: readonly Token[],
): QolErrorClassification {
  const pairIds: string[] = [];
  let differences = 0;
  for (let k = 0; k < quote.length; k += 1) {
    const q = quote[k];
    const c = correction[k];
    if (q.lower === c.lower) continue;
    differences += 1;
    const last = k === quote.length - 1;
    const following = at === null ? undefined : answer[at + k + 1];
    const placed = at === null ? undefined : answer[at + k];
    const pause = q.pauseAfter || c.pauseAfter || (last && !!placed?.token.pauseAfter);
    const nextQ = last ? following?.token.lower : quote[k + 1].lower;
    const nextC = last ? following?.token.lower : correction[k + 1].lower;
    if (soundsIdenticalInContext(q.lower, c.lower, nextQ, pause) && soundsIdenticalInContext(q.lower, c.lower, nextC, pause)) {
      continue;
    }
    const pair = nearPairOf(q.lower, c.lower);
    if (pair && placed && uncertainAt(turn, placed.index, pair.id)) {
      pairIds.push(pair.id);
      continue;
    }
    return COUNTED;
  }
  if (differences === 0) return COUNTED;
  return pairIds.length > 0 ? { verdict: 'ambiguousNear', nearPairIds: [...new Set(pairIds)] } : { verdict: 'inaudible', nearPairIds: [] };
}

/** Sorts one QoL error (see the module header). */
export function classifyQolError(error: QolError, transcript: SpeakingTranscript): QolErrorClassification {
  const turn = findTurn(transcript, error);
  if (!turn || turn.inputMode === 'text') return COUNTED;
  const quote = tokenize(error.quote).filter((t) => t.lower !== '');
  const correction = tokenize(error.correction).filter((t) => t.lower !== '');
  if (quote.length === 0 || quote.length !== correction.length) return COUNTED;

  const answer = words(turn.candidateResponse);
  const placements = occurrences(answer, quote);
  const verdicts = placements.length > 0
    ? placements.map((at) => verdictAt(turn, answer, at, quote, correction))
    : [verdictAt(turn, answer, null, quote, correction)];
  // The quote may occur more than once: any one placement that excuses it is enough.
  return verdicts.find((v) => v.verdict === 'inaudible') ?? verdicts.find((v) => v.verdict === 'ambiguousNear') ?? COUNTED;
}

export interface QolErrorSplit {
  counted: QolError[];
  excused: ExcusedQolError[];
}

export function splitQolErrors(errors: readonly QolError[], transcript: SpeakingTranscript): QolErrorSplit {
  const split: QolErrorSplit = { counted: [], excused: [] };
  for (const error of errors) {
    const { verdict, nearPairIds } = classifyQolError(error, transcript);
    if (verdict === 'counted') split.counted.push(error);
    else split.excused.push({ ...error, reason: verdict, nearPairIds });
  }
  return split;
}

/**
 * - 'not-needed': nothing was excused, the first reply stands untouched.
 * - 'applied': the QoL call was asked once more without the excused errors; its mark stands.
 * - 'failed': the re-ask could not produce a valid reply; the first reply's mark stands
 *   (with the excused errors taken out of its list) and the guardrail reports it.
 */
export type HomophoneReAskOutcome = 'not-needed' | 'applied' | 'failed';

export interface QolHomophoneResolution {
  /** The QoL assessment that stands. Its `errors` are the counted ones only. */
  qualityOfLanguage: QualityOfLanguageAssessment;
  /** Every excused error — first reply, then any new ones in the re-run — without duplicates. */
  excusedErrors: ExcusedQolError[];
  reAsk: HomophoneReAskOutcome;
  /** Excused errors the re-run listed anyway: the kept mark may still carry their penalty. */
  excusedInReAsk: number;
  /** The first reply's mark (audit and logs only). */
  firstMark: number;
}

function errorKey(e: QolError): string {
  return [e.source, e.turnId, canonicalizeForMatch(e.quote), canonicalizeForMatch(e.correction)].join('\u0000');
}

/**
 * The pure part of the resolution: given the first QoL reply and the re-run's
 * reply (or 'failed'), what stands. `rerun` is only read when the first reply
 * had excused errors.
 */
export function settleQolHomophones(
  first: QualityOfLanguageAssessment,
  transcript: SpeakingTranscript,
  rerun: QualityOfLanguageAssessment | 'failed',
): QolHomophoneResolution {
  const firstSplit = splitQolErrors(first.errors, transcript);
  if (firstSplit.excused.length === 0) {
    return { qualityOfLanguage: first, excusedErrors: [], reAsk: 'not-needed', excusedInReAsk: 0, firstMark: first.mark };
  }
  if (rerun === 'failed') {
    return {
      qualityOfLanguage: { ...first, errors: firstSplit.counted },
      excusedErrors: firstSplit.excused,
      reAsk: 'failed',
      excusedInReAsk: 0,
      firstMark: first.mark,
    };
  }
  const rerunSplit = splitQolErrors(rerun.errors, transcript);
  const seen = new Set(firstSplit.excused.map(errorKey));
  return {
    qualityOfLanguage: { ...rerun, errors: rerunSplit.counted },
    excusedErrors: [...firstSplit.excused, ...rerunSplit.excused.filter((e) => !seen.has(errorKey(e)))],
    reAsk: 'applied',
    excusedInReAsk: rerunSplit.excused.length,
    firstMark: first.mark,
  };
}

/**
 * The whole step: sorts the first reply's errors and, if any were excused,
 * re-asks ONCE (the caller's `reAsk` runs the QoL call with `notErrors`, with
 * its usual validation retries). Any failure of the re-ask is 'failed', never
 * a failed attempt: the first reply was valid, and the guardrail flags it.
 */
export async function resolveQolHomophones(
  first: QualityOfLanguageAssessment,
  transcript: SpeakingTranscript,
  reAsk: (notErrors: readonly ExcusedQolError[]) => Promise<QualityOfLanguageAssessment>,
  onReAskFailure?: (err: unknown) => void,
): Promise<QolHomophoneResolution> {
  const { excused } = splitQolErrors(first.errors, transcript);
  if (excused.length === 0) return settleQolHomophones(first, transcript, 'failed');
  let rerun: QualityOfLanguageAssessment | 'failed';
  try {
    rerun = await reAsk(excused);
  } catch (err) {
    onReAskFailure?.(err);
    rerun = 'failed';
  }
  return settleQolHomophones(first, transcript, rerun);
}
