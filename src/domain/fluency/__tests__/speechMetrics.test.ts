import { describe, expect, it } from 'vitest';
import { countWords, summarizeSpeech, SPEECH_METRICS_VERSION } from '../speechMetrics';
import { trimSilence } from '../../examPronunciation/trim';

const RATE = 16000;
/** Tone for `on` seconds, silence for `off` seconds, alternating, starting with `lead` of silence. */
function pcm(lead: number, parts: Array<[on: number, off: number]>): Float32Array {
  const total = lead + parts.reduce((n, [a, b]) => n + a + b, 0);
  const out = new Float32Array(Math.round(total * RATE));
  let t = Math.round(lead * RATE);
  for (const [on, off] of parts) {
    const end = t + Math.round(on * RATE);
    for (let i = t; i < end; i++) out[i] = 0.3 * Math.sin((2 * Math.PI * 220 * i) / RATE);
    t = end + Math.round(off * RATE);
  }
  return out;
}

describe('countWords', () => {
  it('counts words, not punctuation', () => {
    expect(countWords("  J'aime le foot , et toi ? ")).toBe(5);
    expect(countWords('')).toBe(0);
  });
});

describe('summarizeSpeech', () => {
  it('returns null without speech', () => {
    expect(summarizeSpeech(trimSilence(new Float32Array(RATE), RATE), 'bonjour')).toBeNull();
  });

  it('measures start delay, pauses and rates from the real gate', () => {
    // 1 s silence, 2 s speech, 0.3 s gap, 2 s speech, 1.5 s gap, 2 s speech, 2.5 s gap, 1 s speech
    const trim = trimSilence(pcm(1, [[2, 0.3], [2, 1.5], [2, 2.5], [1, 0.5]]), RATE);
    const m = summarizeSpeech(trim, 'un deux trois quatre cinq six sept huit neuf dix onze douze')!;
    expect(m.metricsVersion).toBe(SPEECH_METRICS_VERSION);
    expect(m.startDelayS).toBeCloseTo(1, 1);
    expect(m.speakingSpanS).toBeCloseTo(11.3, 1);
    expect(m.voicedS).toBeCloseTo(7, 1);
    expect(m.pauseCount).toBe(2); // the 0.3 s gap is a breath
    expect(m.pausesOver1s).toBe(2);
    expect(m.pausesOver2s).toBe(1);
    expect(m.longestPauseS).toBeCloseTo(2.5, 1);
    expect(m.totalPauseS).toBeCloseTo(4, 1);
    expect(m.wordCount).toBe(12);
    expect(m.wordsPerMinute).toBeCloseTo((12 / 11.3) * 60, 0);
    expect(m.articulationWpm).toBeCloseTo((12 / 7) * 60, 0);
    expect(m.wordsPerRun).toBe(4);
  });

  it('gives no rate for an empty transcript', () => {
    const m = summarizeSpeech(trimSilence(pcm(0.2, [[2, 0.2]]), RATE), '')!;
    expect(m.wordsPerMinute).toBeNull();
    expect(m.wordsPerRun).toBeNull();
  });
});
