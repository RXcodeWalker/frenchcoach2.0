import type { QuestionDemands } from '../../../domain/learn/demand/types';
import { countWords, findMarker } from '../../../services/coaching/diagnosticEngine';

/**
 * "Predict your feedback" (Learn feedback Batch 6b): while the feedback is
 * generated, up to two one-tap yes/no self-checks drawn from what the question
 * itself asks for (`Question.demands`) — no AI call. When the feedback lands,
 * each answered check can earn ONE calibration line, built from what the
 * deterministic markers actually found in the answer.
 *
 * Pure. Predictions are session state: never stored, never a belief input.
 *
 * Calibration only ever confirms what was found:
 *  - said "no", found it → "You thought you didn't …, but you did: « … »."
 *  - said "yes", found it → a short confirmation with the quote.
 *  - nothing found → NO line. "Not detected" is not "absent" (the markers are
 *    presence-reliable only), and the feedback itself covers what is missing.
 * A marker line always carries the quote it found, verbatim from the answer.
 * The length check has no quote; it states the exact word count instead.
 */

export type PredictionCheckId = 'reason' | 'tense' | 'length';
export type PredictionAnswer = 'yes' | 'no';
type Frame = 'past' | 'future';

export interface PredictionCheck {
  id: PredictionCheckId;
  prompt: string;
  /** For `tense`: which time frames the question asks about (never empty). */
  frames?: Frame[];
}

export interface CalibrationLine {
  id: PredictionCheckId;
  answer: PredictionAnswer;
  text: string;
  /** The words found, verbatim from the answer. Absent on a length line. */
  quote?: string;
}

/** Past this many words an answer is clearly more than two sentences of A2 French (UNVALIDATED app heuristic). */
export const LONG_ANSWER_WORDS = 30;
const MAX_CHECKS = 2;

const FRAME_LABEL: Record<Frame, string> = { past: 'the past', future: 'the future' };

const LENGTH_CHECK: PredictionCheck = { id: 'length', prompt: 'Did you say more than 2 sentences?' };

function tenseCheck(frames: Frame[]): PredictionCheck {
  const label = frames.length === 2 ? 'the past or the future' : FRAME_LABEL[frames[0]];
  return { id: 'tense', prompt: `Did you talk about ${label}?`, frames };
}

/**
 * The checks to offer, most specific first, at most two: a reason when the
 * question asks to explain or justify; the tense when it asks about the past or
 * future (about a quarter of questions); the length check fills what is left.
 * A plain describe-in-the-present question therefore gets just the length check.
 */
export function predictionChecks(
  demands: Pick<QuestionDemands, 'cognitiveDemand' | 'timeFrames'> | null | undefined,
): PredictionCheck[] {
  const checks: PredictionCheck[] = [];
  if (demands && (demands.cognitiveDemand === 'explain' || demands.cognitiveDemand === 'justify')) {
    checks.push({ id: 'reason', prompt: 'Did you give a reason?' });
  }
  const frames = (['past', 'future'] as const).filter((f) => demands?.timeFrames.includes(f));
  if (frames.length > 0) checks.push(tenseCheck(frames));
  checks.push(LENGTH_CHECK);
  return checks.slice(0, MAX_CHECKS);
}

const quoted = (q: string) => `« ${q} »`;

function reasonLine(answer: PredictionAnswer, transcript: string): CalibrationLine | null {
  const hit = findMarker(transcript, 'justification');
  if (!hit) return null;
  const text =
    answer === 'no'
      ? `You thought you didn't give a reason, but you did: ${quoted(hit.quote)}.`
      : `You gave a reason: ${quoted(hit.quote)}.`;
  return { id: 'reason', answer, text, quote: hit.quote };
}

function tenseLine(answer: PredictionAnswer, frames: Frame[], transcript: string): CalibrationLine | null {
  for (const frame of frames) {
    const hit = findMarker(transcript, frame);
    if (!hit) continue;
    const label = FRAME_LABEL[frame];
    const text =
      answer === 'no'
        ? `You thought you didn't use ${label}, but you did: ${quoted(hit.quote)}.`
        : `You used ${label}: ${quoted(hit.quote)}.`;
    return { id: 'tense', answer, text, quote: hit.quote };
  }
  return null;
}

function lengthLine(answer: PredictionAnswer, transcript: string): CalibrationLine | null {
  const words = countWords(transcript);
  if (words < LONG_ANSWER_WORDS) return null;
  const text =
    answer === 'no'
      ? `You thought it was two sentences or fewer, but you said ${words} words.`
      : `You said ${words} words.`;
  return { id: 'length', answer, text };
}

/**
 * At most one line per answered check, in the order the checks were offered.
 * An unanswered check earns nothing.
 */
export function calibrationLines(
  checks: readonly PredictionCheck[],
  answers: Partial<Record<PredictionCheckId, PredictionAnswer>>,
  transcript: string,
): CalibrationLine[] {
  const lines: CalibrationLine[] = [];
  for (const check of checks) {
    const answer = answers[check.id];
    if (!answer) continue;
    const line =
      check.id === 'reason'
        ? reasonLine(answer, transcript)
        : check.id === 'tense'
          ? tenseLine(answer, check.frames ?? [], transcript)
          : lengthLine(answer, transcript);
    if (line) lines.push(line);
  }
  return lines;
}
