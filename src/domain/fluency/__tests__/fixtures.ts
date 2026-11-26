import { SPEECH_METRICS_VERSION, type SpeechMetrics } from '../speechMetrics';

/** A plausible measured answer; override what a test is about. */
export function metrics(over: Partial<SpeechMetrics> = {}): SpeechMetrics {
  return {
    metricsVersion: SPEECH_METRICS_VERSION,
    recordedS: 40,
    startDelayS: 1,
    speakingSpanS: 30,
    voicedS: 24,
    pauseCount: 6,
    pausesOver1s: 2,
    pausesOver2s: 0,
    longestPauseS: 1.5,
    totalPauseS: 5,
    wordCount: 50,
    wordsPerMinute: 100,
    articulationWpm: 125,
    wordsPerRun: 7.1,
    ...over,
  };
}
