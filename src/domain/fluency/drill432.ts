/**
 * The 4-3-2 drill (pure): the same answer three times, in 60 s, then 45 s,
 * then 30 s (fluency-trainer §3). Say the same answer again in less time, and
 * the planning load drops each round, so the learner can put their effort into
 * flow. This module only describes what changed between the rounds. It never
 * marks the French.
 *
 * Classic 4/3/2 (Nation, 1989) uses 4, 3 and 2 minutes. The rounds here are
 * shortened to fit an IGCSE answer and a phone screen. The ratio is the same.
 *
 * UNVALIDATED: `KEPT_WORDS_WARN` and the change cut-offs in `flowMeasures.ts`
 * are product heuristics. They have not been checked against real recordings.
 */

import { SPEECH_METRICS_VERSION, type SpeechMetrics } from './speechMetrics';
import { compareMeasure, measureOf, type FlowChange, type FlowMeasure, median } from './flowMeasures';

/** Bump when the round lengths, record shape or summary rules change. */
export const DRILL_VERSION = 1;

/** Round time limits, seconds, in order. */
export const DRILL_ROUNDS_S = [60, 45, 30] as const;

/** A short "get ready" countdown before each round, so nobody starts mid-breath. */
export const GET_READY_S = 3;

/**
 * Under this share of round 1's words, a faster last round may only mean the
 * learner said less (fluency-trainer §3.3). UNVALIDATED.
 */
export const KEPT_WORDS_WARN = 0.6;

/** Drills needed on each side before the first-take trend is shown. */
export const MIN_DRILLS_FOR_TREND = 3;

export const DRILL_MEASURES: FlowMeasure[] = ['wordsPerMinute', 'pausesPerMinute', 'wordsPerRun', 'longestPauseS'];

export interface DrillRoundResult {
  /** This round's time limit, seconds. */
  limitS: number;
  /** Null when the recording held no speech or could not be measured. */
  metrics: SpeechMetrics | null;
  /** The learner pressed stop before the time ran out. */
  stoppedEarly: boolean;
}

/** One finished (or partly finished) drill, as stored on this device. Numbers and ids only. */
export interface DrillRecord {
  id: string;
  /** ISO time the drill finished. */
  at: string;
  drillVersion: number;
  /** A Learn question id, or null for a free prompt. */
  questionId: string | null;
  topicKey: string | null;
  rounds: DrillRoundResult[];
}

export type DrillHeadline = 'smoother' | 'mixed' | 'same' | 'lessSmooth' | 'notEnough';

export interface DrillSummary {
  /** Index of the rounds compared (the first and last rounds that were measured). */
  from: number | null;
  to: number | null;
  /** Measures that could be compared, in `DRILL_MEASURES` order. */
  changes: FlowChange[];
  /** Words said in the compared rounds (from the live captions). Null when no words were heard. */
  words: { before: number; after: number } | null;
  /** The last round said much less, so its speed may not be like-for-like. */
  saidMuchLess: boolean;
  headline: DrillHeadline;
}

function comparable(m: SpeechMetrics | null): m is SpeechMetrics {
  return m !== null && m.metricsVersion === SPEECH_METRICS_VERSION;
}

/** Compares the first measured round with the last measured round. */
export function summarizeDrill(rounds: DrillRoundResult[]): DrillSummary {
  const measured = rounds.map((r, i) => (comparable(r.metrics) ? i : -1)).filter((i) => i >= 0);
  if (measured.length < 2) {
    return { from: null, to: null, changes: [], words: null, saidMuchLess: false, headline: 'notEnough' };
  }
  const from = measured[0];
  const to = measured[measured.length - 1];
  const a = rounds[from].metrics as SpeechMetrics;
  const b = rounds[to].metrics as SpeechMetrics;
  const changes = DRILL_MEASURES
    .map((m) => compareMeasure(m, measureOf(a, m), measureOf(b, m)))
    .filter((c): c is FlowChange => c !== null);
  const words = a.wordCount > 0 || b.wordCount > 0 ? { before: a.wordCount, after: b.wordCount } : null;
  const saidMuchLess = !!words && words.before > 0 && words.after / words.before < KEPT_WORDS_WARN;
  const up = changes.filter((c) => c.direction === 'smoother').length;
  const down = changes.filter((c) => c.direction === 'lessSmooth').length;
  const headline: DrillHeadline = changes.length === 0
    ? 'notEnough'
    : up > 0 && down > 0 ? 'mixed' : up > 0 ? 'smoother' : down > 0 ? 'lessSmooth' : 'same';
  return { from, to, changes, words, saidMuchLess, headline };
}

export interface FirstTakeTrend {
  /** Compared drills on each side. */
  drills: number;
  change: FlowChange;
}

/**
 * The real test of the drill is whether the FIRST take (no rehearsal) gets
 * smoother over weeks. Compares the median round-1 speech rate of the latest
 * drills with the drills before them (fluency-trainer §3.4). Null until there
 * are `MIN_DRILLS_FOR_TREND` drills on each side with words heard.
 */
export function firstTakeTrend(records: DrillRecord[], measure: FlowMeasure = 'wordsPerMinute'): FirstTakeTrend | null {
  const values = [...records]
    .filter((r) => r.drillVersion === DRILL_VERSION)
    .sort((x, y) => x.at.localeCompare(y.at))
    .map((r) => r.rounds.find((round) => round.limitS === DRILL_ROUNDS_S[0])?.metrics ?? null)
    .filter(comparable)
    .map((m) => measureOf(m, measure))
    .filter((v): v is number => v !== null);
  const n = Math.min(Math.floor(values.length / 2), 5);
  if (n < MIN_DRILLS_FOR_TREND) return null;
  const recent = values.slice(-n);
  const earlier = values.slice(-2 * n, -n);
  const change = compareMeasure(measure, median(earlier), median(recent));
  return change ? { drills: n, change } : null;
}
