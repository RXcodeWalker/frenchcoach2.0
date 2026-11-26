/**
 * Shared flow measures and their "is this a real change?" cut-offs (pure).
 * Spec: docs/systems/fluency-trainer.md (`fluency-trainer §N` in code).
 *
 * Everything here describes HOW SMOOTHLY someone spoke — speed and pauses —
 * never whether the French was right. Nothing here is a mark, band or grade.
 *
 * UNVALIDATED: every cut-off in `FLOW_CHANGE` is a product heuristic chosen so
 * ordinary take-to-take wobble reads as "about the same". None has been checked
 * against real learner recordings. A change is a `FLOW_MEASURES_VERSION` bump.
 */

import type { SpeechMetrics } from './speechMetrics';

/** Bump when a definition or cut-off below changes. */
export const FLOW_MEASURES_VERSION = 1;

/** The four measures the trainer shows, in display order. */
export type FlowMeasure = 'wordsPerMinute' | 'pausesPerMinute' | 'wordsPerRun' | 'longestPauseS';

/** Which way is "smoother" for each measure. */
export const SMOOTHER_WHEN: Record<FlowMeasure, 'higher' | 'lower'> = {
  wordsPerMinute: 'higher',
  pausesPerMinute: 'lower',
  wordsPerRun: 'higher',
  longestPauseS: 'lower',
};

/**
 * A difference counts only when it clears BOTH the absolute and the relative
 * floor (fluency-trainer §4). UNVALIDATED heuristics.
 */
export const FLOW_CHANGE: Record<FlowMeasure, { absolute: number; relative: number }> = {
  wordsPerMinute: { absolute: 8, relative: 0.1 },
  pausesPerMinute: { absolute: 1.5, relative: 0.2 },
  wordsPerRun: { absolute: 1, relative: 0.15 },
  longestPauseS: { absolute: 0.5, relative: 0.2 },
};

/** Answers shorter than this (first word to last) are too short to say anything about flow. */
export const MIN_SPEAKING_SPAN_S = 3;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Pauses (≥ 0.5 s) per minute of speaking. Null under one second of speech. */
export function pausesPerMinute(m: Pick<SpeechMetrics, 'pauseCount' | 'speakingSpanS'>): number | null {
  return m.speakingSpanS >= 1 ? r1((m.pauseCount / m.speakingSpanS) * 60) : null;
}

/** One measure of one answer; null when it can't be measured (e.g. no words heard). */
export function measureOf(m: SpeechMetrics, measure: FlowMeasure): number | null {
  switch (measure) {
    case 'wordsPerMinute': return m.wordsPerMinute;
    case 'pausesPerMinute': return pausesPerMinute(m);
    case 'wordsPerRun': return m.wordsPerRun;
    case 'longestPauseS': return m.longestPauseS;
  }
}

export type FlowDirection = 'smoother' | 'same' | 'lessSmooth';

export interface FlowChange {
  measure: FlowMeasure;
  before: number;
  after: number;
  direction: FlowDirection;
}

/** Compares two readings of one measure. Null when either side is missing. */
export function compareMeasure(measure: FlowMeasure, before: number | null, after: number | null): FlowChange | null {
  if (before === null || after === null) return null;
  const diff = after - before;
  const { absolute, relative } = FLOW_CHANGE[measure];
  const base = Math.max(Math.abs(before), 1e-9);
  const real = Math.abs(diff) >= absolute && Math.abs(diff) / base >= relative;
  const direction: FlowDirection = !real
    ? 'same'
    : (diff > 0) === (SMOOTHER_WHEN[measure] === 'higher')
      ? 'smoother'
      : 'lessSmooth';
  return { measure, before, after, direction };
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 100) / 100;
}
