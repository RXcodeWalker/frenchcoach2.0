/**
 * Pronunciation Lab — where a word sits in the learner's own recording, for
 * "▶ You" (pronunciation-lab plan §3.2 step 3). Pure.
 *
 * Azure reports each word's offset and duration within the uploaded clip.
 * When the upload was silence-trimmed (the exam's `trimSilence`), the trim map
 * maps those offsets back to the original in-memory recording — the same
 * `trimmedToOriginalS` the exam report's clips use, imported in place so the
 * exam's fairness hash is untouched. Without a trim map the offsets already
 * are original-recording time.
 *
 * A word near a chunk seam gets no clip: its offsets were re-indexed across
 * the seam and may be off.
 */

import { trimmedToOriginalS, type TrimSegment } from '../../examPronunciation/trim';
import type { PronunciationWordResult } from '../types';
import { LAB_THRESHOLDS } from './thresholds';
import type { ClipWindow } from './types';

export interface ClipWindowOptions {
  /** The trim map of the upload, when it was silence-trimmed. */
  segments?: readonly TrimSegment[];
  /** Length of the original recording; the window is clamped to it. */
  recordingDurationS?: number;
}

type TimedWord = Pick<PronunciationWordResult, 'offsetMs' | 'durationMs' | 'nearChunkBoundary'>;

function toOriginal(segments: readonly TrimSegment[] | undefined, s: number): number {
  return segments && segments.length > 0 ? trimmedToOriginalS(segments, s) : s;
}

/**
 * The padded playback window covering `words` (one word, or a two-word
 * liaison group). Null when any word lacks timing or sits near a seam.
 */
export function clipWindow(words: readonly TimedWord[], options: ClipWindowOptions = {}): ClipWindow | null {
  if (words.length === 0) return null;
  for (const w of words) {
    if (w.nearChunkBoundary || w.offsetMs == null || w.durationMs == null) return null;
    if (!Number.isFinite(w.offsetMs) || !Number.isFinite(w.durationMs) || w.offsetMs < 0 || w.durationMs < 0) return null;
  }
  const { paddingS, minDurationS } = LAB_THRESHOLDS.clip;
  const first = words[0];
  const last = words[words.length - 1];
  let start = toOriginal(options.segments, first.offsetMs! / 1000) - paddingS;
  let end = toOriginal(options.segments, (last.offsetMs! + last.durationMs!) / 1000) + paddingS;
  if (end < start) return null;

  if (end - start < minDurationS) {
    const widen = (minDurationS - (end - start)) / 2;
    start -= widen;
    end += widen;
  }
  if (start < 0) {
    // At the very start of the recording: keep the length by moving the window right.
    end -= start;
    start = 0;
  }
  if (options.recordingDurationS !== undefined && Number.isFinite(options.recordingDurationS)) {
    end = Math.min(end, options.recordingDurationS);
    if (end <= start) return null;
  }
  return { startS: start, endS: end };
}
