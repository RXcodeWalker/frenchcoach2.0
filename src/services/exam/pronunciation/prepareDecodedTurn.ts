/**
 * Exam-mode pronunciation analysis — the decoded half of turn preparation
 * (exam-pronunciation plan §4). Pure: 16 kHz mono Float32 PCM in, the trimmed
 * upload WAV plus the measurements sent with it out.
 *
 * Split out of `client.ts` so the Batch 7 calibration prep script
 * (`scripts/examPronunciation/prepareCalibration.ts`) trims and measures
 * calibration clips with exactly the code a real exam turn goes through; the
 * browser-only decode/resample step stays in `client.ts`.
 */

import { encodePcm16Wav } from '../../../domain/pronunciation/audioNormalizer';
import { trimSilence, type TrimSegment } from '../../../domain/examPronunciation/trim';

/** A sample at or beyond this magnitude counts as clipped. */
export const CLIP_LEVEL = 0.999;

export interface PreparedTurnAudio {
  wav: Blob;
  rawS: number;
  segments: TrimSegment[];
  pausesOver2s: number;
  longestPauseS: number;
  clippedRatio: number;
}

/** Clipping measured and pauses taken on the untrimmed audio, then trimmed. null = no speech. */
export function prepareDecodedTurn(samples: Float32Array, sampleRate: number): PreparedTurnAudio | null {
  let clipped = 0;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) >= CLIP_LEVEL) clipped += 1;
  const trimmed = trimSilence(samples, sampleRate);
  if (!trimmed.hasSpeech) return null;
  return {
    wav: encodePcm16Wav(trimmed.samples, sampleRate),
    rawS: Math.round(trimmed.rawS * 1000) / 1000,
    segments: trimmed.segments,
    pausesOver2s: trimmed.pauses.pausesOver2s,
    longestPauseS: Math.round(trimmed.pauses.longestPauseS * 1000) / 1000,
    clippedRatio: samples.length > 0 ? Math.round((clipped / samples.length) * 10_000) / 10_000 : 0,
  };
}
