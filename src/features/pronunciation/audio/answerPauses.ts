/**
 * The "Flow" line on a Learn answer (pronunciation-lab plan §3.1 item 2):
 * pause statistics measured in the browser on the learner's own recording.
 * No request leaves the device and Azure is never involved — it is the exam
 * report's measurement (`examPronunciation/trim.ts`, computed on the
 * untrimmed audio), reused as is.
 *
 * Best effort: anything that can't be decoded or holds no speech is `null`,
 * and the card simply says nothing about flow.
 */

import { normalizeToWav16kMono, readWavPcm16Mono } from '../../../domain/pronunciation/audioNormalizer';
import { trimSilence, type PauseStats } from '../../../domain/examPronunciation/trim';

/** Longest answer measured. Bounds the transient decode memory, like the exam's turn cap. */
export const ANSWER_MAX_SECONDS = 180;

export async function measureAnswerPauses(blob: Blob): Promise<PauseStats | null> {
  try {
    const normalized = await normalizeToWav16kMono(blob, { maxSeconds: ANSWER_MAX_SECONDS });
    const { samples, sampleRate } = await readWavPcm16Mono(normalized.blob);
    const trimmed = trimSilence(samples, sampleRate);
    return trimmed.hasSpeech ? trimmed.pauses : null;
  } catch {
    return null;
  }
}

/** One stretch of speech on the answer's own clock, in seconds from the start of the recording. */
export interface FlowSpan {
  startS: number;
  endS: number;
}

/**
 * The answer's shape for "How it sounded"'s flow timeline: the pause figures
 * plus where each stretch of speech sat. Same measurement as
 * {@link measureAnswerPauses} (one decode, nothing leaves the device).
 */
export interface AnswerFlow {
  pauses: PauseStats;
  /** Speech stretches in order (the gaps between them are the pauses). */
  spans: FlowSpan[];
  /** First speech to last speech, pauses included. */
  speechSpanS: number;
}

export async function measureAnswerFlow(blob: Blob): Promise<AnswerFlow | null> {
  try {
    const normalized = await normalizeToWav16kMono(blob, { maxSeconds: ANSWER_MAX_SECONDS });
    const { samples, sampleRate } = await readWavPcm16Mono(normalized.blob);
    const trimmed = trimSilence(samples, sampleRate);
    if (!trimmed.hasSpeech) return null;
    const first = trimmed.leadingSilenceS;
    const last = first + trimmed.speechSpanS;
    const spans: FlowSpan[] = [];
    let cursor = first;
    for (const [a, b] of trimmed.pauseRunsS) {
      if (a > cursor) spans.push({ startS: cursor, endS: a });
      cursor = b;
    }
    if (last > cursor) spans.push({ startS: cursor, endS: last });
    return { pauses: trimmed.pauses, spans, speechSpanS: trimmed.speechSpanS };
  } catch {
    return null;
  }
}
