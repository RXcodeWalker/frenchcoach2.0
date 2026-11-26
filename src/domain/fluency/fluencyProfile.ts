/**
 * The fluency view's numbers, from Learn's speaking log (pure; fluency-trainer §2).
 *
 * Each spoken Learn answer is one sample of flow: speed, pauses, how long the
 * learner took to start. This module turns the log into:
 *  - "now": the median of the latest answers (a median, so one bad take can't swing it),
 *  - a trend: latest answers vs the ones before. Only shown once both sides have
 *    `MIN_TREND_SAMPLES`, and a difference counts only past `FLOW_CHANGE`,
 *  - a per-answer series for the chart,
 *  - per-topic speech rate, to suggest where to drill.
 *
 * Only samples on the current `SPEECH_METRICS_VERSION` are used. Mixing
 * definitions would make a trend out of a code change. Nothing here is a mark.
 * Window sizes are UNVALIDATED.
 */

import { SPEECH_METRICS_VERSION, type SpeechMetrics } from './speechMetrics';
import {
  MIN_SPEAKING_SPAN_S,
  compareMeasure,
  measureOf,
  median,
  pausesPerMinute,
  type FlowChange,
  type FlowMeasure,
} from './flowMeasures';

/** What the view needs from a speaking-log row (`services/fluency/speakingLog.ts`'s `SpeakingSample` fits). */
export interface FlowSample extends SpeechMetrics {
  at: string;
  topicKey: string | null;
}

/** Answers in each window of the trend. */
export const TREND_WINDOW = 10;
/** Fewest answers on each side before a trend is claimed. UNVALIDATED. */
export const MIN_TREND_SAMPLES = 5;
/** Fewest answers in a topic before it gets a speech rate of its own. */
export const MIN_TOPIC_SAMPLES = 3;
/** Answers drawn on the chart. */
export const SERIES_MAX = 30;

export const PROFILE_MEASURES: FlowMeasure[] = ['wordsPerMinute', 'pausesPerMinute', 'wordsPerRun', 'longestPauseS'];

export interface SeriesPoint {
  at: string;
  wordsPerMinute: number | null;
  pausesPerMinute: number | null;
}

export interface TopicFlow {
  topicKey: string;
  wordsPerMinute: number;
  answers: number;
}

export interface FluencyProfile {
  /** Samples used (current metrics version, long enough to say something). */
  measured: number;
  /** Rows in the log at all. */
  logged: number;
  /** Median of the latest window, per measure (null when not measurable, e.g. no words heard). */
  now: Record<FlowMeasure, number | null>;
  /** Median start delay of the latest window, seconds. */
  startDelayS: number | null;
  /** Answers in the latest window. */
  nowAnswers: number;
  /** Latest window vs the one before; null until both have `MIN_TREND_SAMPLES`. */
  trend: { answers: number; changes: FlowChange[] } | null;
  series: SeriesPoint[];
  /** Topics with enough answers, fastest first. */
  topics: TopicFlow[];
  /** The topic with the slowest speech rate, when at least two topics have enough answers. */
  slowestTopic: string | null;
}

export function eligibleSamples<T extends FlowSample>(samples: T[]): T[] {
  return samples
    .filter((s) => s.metricsVersion === SPEECH_METRICS_VERSION && s.speakingSpanS >= MIN_SPEAKING_SPAN_S)
    .sort((a, b) => a.at.localeCompare(b.at));
}

function medianOf(samples: FlowSample[], measure: FlowMeasure): number | null {
  return median(samples.map((s) => measureOf(s, measure)).filter((v): v is number => v !== null));
}

export function buildFluencyProfile(samples: FlowSample[]): FluencyProfile {
  const used = eligibleSamples(samples);
  const latest = used.slice(-TREND_WINDOW);
  const now = Object.fromEntries(PROFILE_MEASURES.map((m) => [m, medianOf(latest, m)])) as Record<FlowMeasure, number | null>;

  // Split the most recent answers into two equal windows (up to TREND_WINDOW each).
  const half = Math.min(TREND_WINDOW, Math.floor(used.length / 2));
  let trend: FluencyProfile['trend'] = null;
  if (half >= MIN_TREND_SAMPLES) {
    const recent = used.slice(-half);
    const earlier = used.slice(-2 * half, -half);
    const changes = PROFILE_MEASURES
      .map((m) => compareMeasure(m, medianOf(earlier, m), medianOf(recent, m)))
      .filter((c): c is FlowChange => c !== null);
    trend = { answers: half, changes };
  }

  const byTopic = new Map<string, FlowSample[]>();
  for (const s of used) {
    if (!s.topicKey) continue;
    byTopic.set(s.topicKey, [...(byTopic.get(s.topicKey) ?? []), s]);
  }
  const topics: TopicFlow[] = [...byTopic.entries()]
    .map(([topicKey, list]) => ({ topicKey, answers: list.length, wordsPerMinute: medianOf(list, 'wordsPerMinute') }))
    .filter((t): t is TopicFlow => t.answers >= MIN_TOPIC_SAMPLES && t.wordsPerMinute !== null)
    .sort((a, b) => b.wordsPerMinute - a.wordsPerMinute);

  return {
    measured: used.length,
    logged: samples.length,
    now,
    startDelayS: median(latest.map((s) => s.startDelayS)),
    nowAnswers: latest.length,
    trend,
    series: used.slice(-SERIES_MAX).map((s) => ({
      at: s.at,
      wordsPerMinute: s.wordsPerMinute,
      pausesPerMinute: pausesPerMinute(s),
    })),
    topics,
    slowestTopic: topics.length >= 2 ? topics[topics.length - 1].topicKey : null,
  };
}
