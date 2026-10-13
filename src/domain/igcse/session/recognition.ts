/**
 * Exam answers marked from batch ASR (session-transcript-v2) — the pure parts:
 * which candidate turns are spoken answers a recogniser can read, how a
 * recognition record becomes the utterance's text, and the per-word confidence
 * derived from Whisper's segment signals.
 *
 * Deliberately free of services and of the feedback-only pronunciation feature
 * (nothing in the scored pipeline may reference it): the speech-turn predicate
 * below is a copy of that feature's `isSpeechTurn`, kept identical by
 * `speechTurnParity.test.ts` (which lives on the feature's side).
 */

import type { RecognitionSegment, UtteranceRecognition } from '../stt/types';
import type { ConductLogEntry } from './types';

/**
 * What the batch recogniser's context prompt holds for an exam answer: the
 * question the examiner had just asked (main, alternative, second part or
 * further question), nothing else — never an expected answer or a word list.
 * Recorded on each batch reading and in the envelope; bump it when the prompt
 * starts carrying anything else.
 */
export const EXAM_ASR_PROMPT_VERSION = 'exam-asr-prompt-v1';

/**
 * A candidate turn the batch recogniser should read: a spoken (not typed)
 * answer the engine treated as an answer. A repeat request, a clarification, an
 * English aside, "je ne sais pas" or an empty turn is not (those are either
 * blanked from the scored text or not pronunciation/recognition evidence).
 */
export function isBatchAsrTurn(entry: ConductLogEntry): entry is Extract<ConductLogEntry, { kind: 'candidate' }> {
  if (entry.kind !== 'candidate') return false;
  if (entry.inputMode === 'text') return false;
  if (entry.requestedRepeat) return false;
  if (entry.intent !== undefined && entry.intent !== 'answer') return false;
  return entry.transcript.trim().length > 0;
}

/** The text a recognition record puts into the scored transcript. */
export function selectedRecognitionText(recognition: UtteranceRecognition): string {
  return recognition.selected === 'primary' && recognition.primary ? recognition.primary.text : recognition.secondary.text;
}

/**
 * The record for a spoken answer whose recording never reached the batch
 * recogniser (no blob kept): the live captions stand, reason 'no-audio'.
 */
export function noAudioRecognition(liveText: string): UtteranceRecognition {
  return {
    secondary: { source: 'web-speech-live', text: liveText },
    selected: 'secondary',
    fallbackReason: 'no-audio',
  };
}

/**
 * Per-word confidence for a Whisper-read answer: exp(avgLogprob) of the segment
 * each word falls in, clamped to 0..1. Words are assigned to segments in order,
 * in proportion to each segment's own word count (the answer text is the
 * provider's top-level text, which need not split exactly like the segments).
 * UNVALIDATED: exp(avgLogprob) is a geometric-mean token probability, not a
 * calibrated confidence. It feeds only the envelope's transcriptConfidence
 * summary — never a mark, a guardrail or the judge prompt.
 *
 * Returns undefined when no segment carries an avgLogprob (caller keeps 1).
 */
export function wordConfidences(wordCount: number, segments: readonly RecognitionSegment[]): number[] | undefined {
  if (wordCount <= 0) return undefined;
  const weighted = segments
    .map((s) => ({
      words: s.text.trim().length > 0 ? s.text.trim().split(/\s+/).length : 0,
      confidence: s.avgLogprob === null ? null : Math.min(1, Math.max(0, Math.exp(s.avgLogprob))),
    }))
    .filter((s) => s.words > 0);
  if (weighted.length === 0 || weighted.every((s) => s.confidence === null)) return undefined;

  const total = weighted.reduce((sum, s) => sum + s.words, 0);
  const out: number[] = [];
  let upTo = 0;
  for (const seg of weighted) {
    upTo += seg.words;
    const end = Math.round((upTo / total) * wordCount);
    while (out.length < end) out.push(seg.confidence ?? 1);
  }
  while (out.length < wordCount) out.push(weighted[weighted.length - 1].confidence ?? 1);
  return out;
}
