import { describe, it, expect } from 'vitest';
import { trimSilence, trimmedToOriginalS, TRIM_CONFIG } from '../trim';

const SR = 16_000;

/** A steady 220 Hz tone — loud enough to clear the speech gate. */
function tone(seconds: number, amplitude = 0.3): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i++) out[i] = amplitude * Math.sin((2 * Math.PI * 220 * i) / SR);
  return out;
}
function silence(seconds: number, noise = 0): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  if (noise > 0) for (let i = 0; i < out.length; i++) out[i] = noise * (((i * 7919) % 200) / 100 - 1);
  return out;
}
function concat(...parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const pad = TRIM_CONFIG.edgePadMs / 1000;
const cap = TRIM_CONFIG.maxInternalSilenceMs / 1000;

describe('trimSilence', () => {
  it('cuts leading and trailing silence, keeping only the edge pad', () => {
    const r = trimSilence(concat(silence(2), tone(1.5), silence(3)), SR);
    expect(r.hasSpeech).toBe(true);
    expect(r.rawS).toBeCloseTo(6.5, 3);
    expect(r.trimmedS).toBeCloseTo(1.5 + 2 * pad, 1);
    expect(r.samples.length / SR).toBeCloseTo(r.trimmedS, 5);
  });

  it('caps a long internal silence at 600 ms', () => {
    const r = trimSilence(concat(tone(1), silence(3), tone(1)), SR);
    expect(r.trimmedS).toBeCloseTo(2 + cap, 1);
  });

  it('leaves an internal silence shorter than the cap untouched', () => {
    const r = trimSilence(concat(tone(1), silence(0.4), tone(1)), SR);
    expect(r.trimmedS).toBeCloseTo(2.4, 1);
    expect(r.segments).toHaveLength(1);
  });

  it('never shortens audio that has no silence to remove beyond the pad', () => {
    const r = trimSilence(tone(2), SR);
    expect(r.trimmedS).toBeCloseTo(2, 1);
  });

  it('computes pause statistics on the untrimmed audio', () => {
    const r = trimSilence(concat(tone(1), silence(3), tone(1), silence(2.2), tone(1), silence(0.5), tone(1)), SR);
    expect(r.pauses.pausesOver2s).toBe(2);
    expect(r.pauses.longestPauseS).toBeCloseTo(3, 1);
    // …even though the trimmed clip no longer contains any pause that long.
    // 4 s of tone + 0.6 + 0.6 capped gaps + the untouched 0.5 s gap.
    expect(r.trimmedS).toBeCloseTo(4 + 2 * cap + 0.5, 1);
  });

  it('does not count leading or trailing silence as a pause', () => {
    const r = trimSilence(concat(silence(5), tone(1), silence(5)), SR);
    expect(r.pauses).toEqual({ pausesOver2s: 0, longestPauseS: 0 });
  });

  it('reports a clip with no internal gap as having no pauses', () => {
    expect(trimSilence(tone(2), SR).pauses).toEqual({ pausesOver2s: 0, longestPauseS: 0 });
  });

  it('treats low-level background noise as silence', () => {
    const r = trimSilence(concat(silence(2, 0.001), tone(1), silence(2, 0.001)), SR);
    expect(r.trimmedS).toBeCloseTo(1 + 2 * pad, 1);
  });

  it('returns an empty, hasSpeech=false result for pure silence', () => {
    const r = trimSilence(silence(3), SR);
    expect(r.hasSpeech).toBe(false);
    expect(r.samples.length).toBe(0);
    expect(r.trimmedS).toBe(0);
    expect(r.rawS).toBeCloseTo(3, 3);
    expect(r.segments).toEqual([]);
  });

  it('handles an empty input', () => {
    const r = trimSilence(new Float32Array(0), SR);
    expect(r.hasSpeech).toBe(false);
    expect(r.rawS).toBe(0);
  });

  it('never mutates its input and returns a fresh array', () => {
    const input = concat(silence(1), tone(1), silence(1));
    const copy = input.slice();
    const r = trimSilence(input, SR);
    expect(input).toEqual(copy);
    expect(r.samples.buffer).not.toBe(input.buffer);
  });

  it('preserves the speech samples themselves (concatenated kept stretches)', () => {
    const speech = tone(1);
    const r = trimSilence(concat(silence(2), speech, silence(2)), SR);
    // The tone must appear contiguously inside the output.
    const startAt = Math.round(pad * SR);
    expect(r.samples[startAt + 1000]).toBeCloseTo(speech[1000], 5);
  });
});

describe('trimmedToOriginalS', () => {
  it('maps an offset before any cut to the same original time, offset by the removed lead-in', () => {
    const r = trimSilence(concat(silence(2), tone(1)), SR);
    // Trimmed clip starts `pad` before the speech, which began at t=2 in the original.
    expect(trimmedToOriginalS(r.segments, 0)).toBeCloseTo(2 - pad, 1);
    expect(trimmedToOriginalS(r.segments, pad)).toBeCloseTo(2, 1);
  });

  it('maps an offset after a capped pause back across the removed silence', () => {
    // 1 s tone, 3 s gap, 1 s tone: second tone begins at t=4 originally.
    const r = trimSilence(concat(tone(1), silence(3), tone(1)), SR);
    const secondToneTrimmed = 1 + cap; // 1 s tone + capped gap
    expect(trimmedToOriginalS(r.segments, secondToneTrimmed)).toBeCloseTo(4, 1);
    expect(trimmedToOriginalS(r.segments, secondToneTrimmed + 0.5)).toBeCloseTo(4.5, 1);
  });

  it('clamps offsets outside the clip', () => {
    const r = trimSilence(concat(silence(1), tone(1), silence(1)), SR);
    expect(trimmedToOriginalS(r.segments, -1)).toBeCloseTo(r.segments[0].origStartS, 5);
    const last = r.segments[r.segments.length - 1];
    expect(trimmedToOriginalS(r.segments, 999)).toBeCloseTo(last.origEndS, 5);
  });

  it('is the identity when there are no segments', () => {
    expect(trimmedToOriginalS([], 1.25)).toBe(1.25);
  });
});
