import { describe, it, expect } from 'vitest';
import { computeDepth } from '../computeDepth';

/** Repeats a filler word to hit an exact word count without tripping any marker. */
function words(n: number): string {
  return Array.from({ length: n }, () => 'chat').join(' ');
}

describe('computeDepth — the two documented inversions', () => {
  it('short answer with two major errors and a missed demand -> deep', () => {
    expect(
      computeDepth({
        transcript: words(20),
        errorCount: 2,
        demandSatisfaction: 'not_attempted',
        responseTier: 2,
      }),
    ).toBe('deep');
  });

  it('long, clean, demand-satisfying answer -> brief', () => {
    expect(
      computeDepth({
        transcript: words(80),
        errorCount: 0,
        demandSatisfaction: 'met',
        responseTier: 3,
      }),
    ).toBe('brief');
  });
});

describe('computeDepth — tier gates', () => {
  it('tier 0 (no answer) is always brief', () => {
    expect(computeDepth({ transcript: '', errorCount: 0, responseTier: 0 })).toBe('brief');
  });

  it('tier 1 (1-3 words) is always brief, even with a missed demand', () => {
    expect(
      computeDepth({ transcript: 'oui', errorCount: 0, demandSatisfaction: 'not_attempted', responseTier: 1 }),
    ).toBe('brief');
  });
});

describe('computeDepth — density and demand fit', () => {
  it('high error density alone (>=3) -> deep, even on a longer answer', () => {
    expect(
      computeDepth({ transcript: words(50), errorCount: 3, demandSatisfaction: 'met', responseTier: 3 }),
    ).toBe('deep');
  });

  it('missed demand alone (not_attempted) -> deep, even with zero errors', () => {
    expect(
      computeDepth({ transcript: words(50), errorCount: 0, demandSatisfaction: 'not_attempted', responseTier: 3 }),
    ).toBe('deep');
  });

  it('short answer with zero errors is not force-escalated to deep', () => {
    expect(
      computeDepth({ transcript: words(10), errorCount: 0, demandSatisfaction: 'unknown', responseTier: 2 }),
    ).not.toBe('deep');
  });

  it('moderate length, low density, unknown demand fit -> standard', () => {
    expect(
      computeDepth({ transcript: words(45), errorCount: 1, demandSatisfaction: 'unknown', responseTier: 3 }),
    ).toBe('standard');
  });

  it('no demands on this question (undefined) still resolves via length/density alone', () => {
    expect(computeDepth({ transcript: words(80), errorCount: 0, responseTier: 3 })).toBe('brief');
    expect(computeDepth({ transcript: words(15), errorCount: 1, responseTier: 2 })).toBe('deep');
  });

  it('long answer that is also error-dense is not treated as brief', () => {
    expect(
      computeDepth({ transcript: words(70), errorCount: 4, demandSatisfaction: 'met', responseTier: 3 }),
    ).toBe('deep');
  });
});
