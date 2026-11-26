import { describe, expect, it } from 'vitest';
import { FLOW_CHANGE, compareMeasure, measureOf, median, pausesPerMinute } from '../flowMeasures';
import { metrics } from './fixtures';

describe('flow measures', () => {
  it('pauses per minute is over the speaking span, null under a second', () => {
    expect(pausesPerMinute({ pauseCount: 6, speakingSpanS: 30 })).toBe(12);
    expect(pausesPerMinute({ pauseCount: 1, speakingSpanS: 0.5 })).toBeNull();
  });

  it('reads each measure, leaving an unmeasurable one null (no words heard)', () => {
    const m = metrics({ wordsPerMinute: null, wordsPerRun: null });
    expect(measureOf(m, 'wordsPerMinute')).toBeNull();
    expect(measureOf(m, 'pausesPerMinute')).toBe(12);
    expect(measureOf(m, 'longestPauseS')).toBe(1.5);
  });

  it('a small wobble is "about the same" (both floors must be cleared)', () => {
    expect(compareMeasure('wordsPerMinute', 100, 107)?.direction).toBe('same'); // under 8 wpm
    expect(compareMeasure('wordsPerMinute', 200, 209)?.direction).toBe('same'); // under 10 %
    expect(compareMeasure('wordsPerMinute', 100, 112)?.direction).toBe('smoother');
    expect(compareMeasure('wordsPerMinute', 100, 85)?.direction).toBe('lessSmooth');
  });

  it('fewer pauses and a shorter longest pause are smoother', () => {
    expect(compareMeasure('pausesPerMinute', 12, 8)?.direction).toBe('smoother');
    expect(compareMeasure('pausesPerMinute', 8, 12)?.direction).toBe('lessSmooth');
    expect(compareMeasure('longestPauseS', 2.5, 1.2)?.direction).toBe('smoother');
    expect(compareMeasure('wordsPerRun', 5, 7)?.direction).toBe('smoother');
  });

  it('returns null when either side is missing, never a zero comparison', () => {
    expect(compareMeasure('wordsPerMinute', null, 100)).toBeNull();
    expect(compareMeasure('wordsPerMinute', 100, null)).toBeNull();
  });

  it('every cut-off has a positive absolute and relative floor', () => {
    for (const [k, v] of Object.entries(FLOW_CHANGE)) {
      expect(v.absolute, k).toBeGreaterThan(0);
      expect(v.relative, k).toBeGreaterThan(0);
    }
  });

  it('median is robust to one outlier', () => {
    expect(median([100, 102, 98, 300, 101])).toBe(101);
    expect(median([1, 2])).toBe(1.5);
    expect(median([])).toBeNull();
  });
});
