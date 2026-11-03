/**
 * Speaking-flow measurements for one recorded answer (pure).
 *
 * Built on the exam pronunciation silence gate (`examPronunciation/trim.ts`), so
 * "speech" and "pause" mean exactly what they mean there — never a second gate.
 * Every number here is a measurement of the learner's own audio, not a judgement:
 * nothing is marked, and the thresholds are UNVALIDATED heuristics, versioned by
 * `SPEECH_METRICS_VERSION` so a later change can't be silently mixed with older samples.
 *
 * Feeds the local speaking log (`services/fluency/speakingLog.ts`) only.
 */

import type { TrimResult } from '../examPronunciation/trim';

/** Bump when any definition or threshold below changes. */
export const SPEECH_METRICS_VERSION = 1;

/** A silent run at least this long counts as a pause (shorter gaps are breaths between words). */
export const PAUSE_MIN_S = 0.5;
/** A noticeably long pause. */
export const LONG_PAUSE_S = 1;

export interface SpeechMetrics {
  metricsVersion: number;
  /** Whole recording, seconds. */
  recordedS: number;
  /** Silence before the first word — how long the learner took to start. */
  startDelayS: number;
  /** First word to last word, pauses included. */
  speakingSpanS: number;
  /** `speakingSpanS` minus every internal silent run — time spent actually voicing. */
  voicedS: number;
  /** Internal pauses ≥ `PAUSE_MIN_S`. */
  pauseCount: number;
  /** Internal pauses ≥ `LONG_PAUSE_S`. */
  pausesOver1s: number;
  pausesOver2s: number;
  longestPauseS: number;
  /** Sum of internal pauses ≥ `PAUSE_MIN_S`. */
  totalPauseS: number;
  /** Words in the transcript the feedback was about. */
  wordCount: number;
  /** Words per minute over the speaking span (speech rate). Null under one second of speech or no words. */
  wordsPerMinute: number | null;
  /** Words per minute over voiced time only (articulation rate). Null as above. */
  articulationWpm: number | null;
  /** Average words between two pauses ≥ `PAUSE_MIN_S` (mean length of run). Null with no words. */
  wordsPerRun: number | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;

export function countWords(transcript: string): number {
  return transcript.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Null when the recording held no speech — there is nothing to describe. */
export function summarizeSpeech(
  trim: Pick<TrimResult, 'hasSpeech' | 'rawS' | 'internalPausesS' | 'leadingSilenceS' | 'speechSpanS' | 'pauses'>,
  transcript: string,
): SpeechMetrics | null {
  if (!trim.hasSpeech) return null;
  const wordCount = countWords(transcript);
  const pauses = trim.internalPausesS.filter((p) => p >= PAUSE_MIN_S);
  const allSilenceS = trim.internalPausesS.reduce((a, b) => a + b, 0);
  const voicedS = Math.max(0, trim.speechSpanS - allSilenceS);
  const rate = (seconds: number) => (wordCount > 0 && seconds >= 1 ? r1((wordCount / seconds) * 60) : null);
  return {
    metricsVersion: SPEECH_METRICS_VERSION,
    recordedS: r2(trim.rawS),
    startDelayS: r2(trim.leadingSilenceS),
    speakingSpanS: r2(trim.speechSpanS),
    voicedS: r2(voicedS),
    pauseCount: pauses.length,
    pausesOver1s: pauses.filter((p) => p >= LONG_PAUSE_S).length,
    pausesOver2s: trim.pauses.pausesOver2s,
    longestPauseS: r2(trim.pauses.longestPauseS),
    totalPauseS: r2(pauses.reduce((a, b) => a + b, 0)),
    wordCount,
    wordsPerMinute: rate(trim.speechSpanS),
    articulationWpm: rate(voicedS),
    wordsPerRun: wordCount > 0 ? r1(wordCount / (pauses.length + 1)) : null,
  };
}
