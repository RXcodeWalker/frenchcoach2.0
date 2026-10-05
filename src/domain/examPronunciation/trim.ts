/**
 * Exam-mode pronunciation analysis — client-side silence trimming (pure).
 *
 * Azure bills (and the monthly F0 allowance counts) audio *time*, including
 * silence, so each turn is trimmed before upload: leading/trailing silence is
 * cut (keeping a small pad so word onsets aren't clipped) and any silence
 * inside the turn is capped at 600 ms. This module has no I/O and no Web Audio;
 * it works on 16 kHz mono Float32 PCM, which is what `normalizeToWav16kMono`
 * produces.
 *
 * Three things the plan relies on, and why they are here:
 *  - Pause statistics (pauses over 2 s, longest pause) are computed on the
 *    UNTRIMMED audio. Trimming removes exactly the evidence a fluency note
 *    needs, so they must be measured first. Only *internal* pauses count:
 *    silence before the first and after the last word is the candidate
 *    reaching for / releasing the mic, not hesitation.
 *  - Azure's own fluency score is ignored downstream, because trimming inflates
 *    it (the plan's fairness rule); that is enforced in Batch 5, not here.
 *  - Azure's word offsets are relative to the *trimmed* clip. Playing "you" back
 *    slices the original in-memory blob, so `segments` records where every kept
 *    stretch came from and `trimmedToOriginalS` maps an in-clip offset back.
 *
 * Silence detection is a plain frame-RMS gate. Every number in TRIM_CONFIG is a
 * heuristic tuned on synthetic PCM — UNVALIDATED until the `rawS`/`trimmedS`
 * telemetry from real exams (`exam_pronunciation_audio_measured`) has been read.
 */

export const TRIM_CONFIG = {
  /** RMS analysis window. */
  frameMs: 20,
  /** Context kept around the first/last speech frame so onsets and decays survive. */
  edgePadMs: 150,
  /** Longest silence kept between two stretches of speech. */
  maxInternalSilenceMs: 600,
  /** An internal pause at least this long is counted in `pausesOver2s`. */
  longPauseMs: 2000,
  /** A frame is speech if its RMS is at least max(absoluteFloorRms, relativeToLoudFrames × the 95th-percentile frame RMS). */
  absoluteFloorRms: 0.004,
  relativeToLoudFrames: 0.08,
} as const;

/** One kept stretch of the original audio, in seconds. */
export interface TrimSegment {
  origStartS: number;
  origEndS: number;
  /** Where this stretch begins in the trimmed clip. */
  trimmedStartS: number;
}

export interface PauseStats {
  /** Internal pauses of at least `TRIM_CONFIG.longPauseMs`. */
  pausesOver2s: number;
  /** Longest internal pause, 0 when there is none. Frame-resolution (20 ms). */
  longestPauseS: number;
}

export interface TrimResult {
  /** The trimmed PCM; a fresh array, never a view of the input. Empty when `hasSpeech` is false. */
  samples: Float32Array;
  sampleRate: number;
  /** Length of the input. */
  rawS: number;
  /** Length of `samples`. This is the figure that is billed. */
  trimmedS: number;
  /** False when no frame cleared the speech gate — nothing worth sending. */
  hasSpeech: boolean;
  /** Computed before trimming. */
  pauses: PauseStats;
  segments: TrimSegment[];
}

function frameRms(samples: Float32Array, start: number, end: number): number {
  let sum = 0;
  for (let i = start; i < end; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / Math.max(1, end - start));
}

function percentile95(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
}

export function trimSilence(samples: Float32Array, sampleRate: number): TrimResult {
  const rawS = samples.length / sampleRate;
  const frameLen = Math.max(1, Math.round((sampleRate * TRIM_CONFIG.frameMs) / 1000));
  const frameCount = Math.ceil(samples.length / frameLen);

  const noPauses: PauseStats = { pausesOver2s: 0, longestPauseS: 0 };
  const empty: TrimResult = {
    samples: new Float32Array(0), sampleRate, rawS, trimmedS: 0, hasSpeech: false, pauses: noPauses, segments: [],
  };
  if (frameCount === 0) return empty;

  const rms: number[] = new Array(frameCount);
  for (let f = 0; f < frameCount; f++) {
    rms[f] = frameRms(samples, f * frameLen, Math.min(samples.length, (f + 1) * frameLen));
  }
  const threshold = Math.max(TRIM_CONFIG.absoluteFloorRms, TRIM_CONFIG.relativeToLoudFrames * percentile95(rms));
  const isSpeech = rms.map((v) => v >= threshold);

  const firstSpeech = isSpeech.indexOf(true);
  if (firstSpeech === -1) return empty;
  const lastSpeech = isSpeech.lastIndexOf(true);

  // Internal silent runs, as [startFrame, endFrame). Measured on the raw audio.
  const internalRuns: Array<[number, number]> = [];
  let f = firstSpeech;
  while (f <= lastSpeech) {
    if (isSpeech[f]) { f += 1; continue; }
    const runStart = f;
    while (!isSpeech[f]) f += 1; // terminates: lastSpeech is speech
    internalRuns.push([runStart, f]);
  }

  const frameS = frameLen / sampleRate;
  const pauseDurations = internalRuns.map(([a, b]) => (b - a) * frameS);
  const pauses: PauseStats = {
    pausesOver2s: pauseDurations.filter((d) => d * 1000 >= TRIM_CONFIG.longPauseMs).length,
    longestPauseS: pauseDurations.length > 0 ? Math.max(...pauseDurations) : 0,
  };

  // Keep ranges, in sample indices.
  const pad = Math.round((TRIM_CONFIG.edgePadMs * sampleRate) / 1000);
  const maxInternal = Math.round((TRIM_CONFIG.maxInternalSilenceMs * sampleRate) / 1000);
  const half = Math.floor(maxInternal / 2);
  const start = Math.max(0, firstSpeech * frameLen - pad);
  const end = Math.min(samples.length, (lastSpeech + 1) * frameLen + pad);

  const ranges: Array<[number, number]> = [];
  let cursor = start;
  for (const [a, b] of internalRuns) {
    const runStart = a * frameLen;
    const runEnd = Math.min(samples.length, b * frameLen);
    if (runEnd - runStart > maxInternal) {
      ranges.push([cursor, runStart + half]);
      cursor = runEnd - half;
    }
  }
  ranges.push([cursor, end]);

  const total = ranges.reduce((n, [a, b]) => n + (b - a), 0);
  const trimmed = new Float32Array(total);
  const segments: TrimSegment[] = [];
  let written = 0;
  for (const [a, b] of ranges) {
    trimmed.set(samples.subarray(a, b), written);
    segments.push({ origStartS: a / sampleRate, origEndS: b / sampleRate, trimmedStartS: written / sampleRate });
    written += b - a;
  }

  return { samples: trimmed, sampleRate, rawS, trimmedS: total / sampleRate, hasSpeech: true, pauses, segments };
}

/**
 * Maps an offset inside the trimmed clip (what Azure reports) back to the same
 * moment in the original recording. Offsets past the end clamp to the last kept
 * stretch's end; before the start clamp to the first stretch's start.
 */
export function trimmedToOriginalS(segments: readonly TrimSegment[], trimmedS: number): number {
  if (segments.length === 0) return trimmedS;
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (trimmedS >= seg.trimmedStartS) {
      const into = Math.min(trimmedS - seg.trimmedStartS, seg.origEndS - seg.origStartS);
      return seg.origStartS + into;
    }
  }
  return segments[0].origStartS;
}
