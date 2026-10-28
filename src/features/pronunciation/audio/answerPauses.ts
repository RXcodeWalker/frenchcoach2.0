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
