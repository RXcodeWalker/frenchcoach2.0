/**
 * Version pin for the Lab's cut-offs (pronunciation-lab plan §7): any change
 * to LAB_THRESHOLDS fails here until LAB_THRESHOLDS_VERSION is bumped and
 * LAB_THRESHOLDS_HASH updated in the same commit.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LAB_THRESHOLDS, LAB_THRESHOLDS_HASH, LAB_THRESHOLDS_VERSION } from '../thresholds';

describe('pronunciation lab thresholds version pin', () => {
  it('LAB_THRESHOLDS_VERSION is pronunciation-lab-thresholds-v1', () => {
    expect(LAB_THRESHOLDS_VERSION).toBe('pronunciation-lab-thresholds-v1');
  });

  it('LAB_THRESHOLDS matches the pinned hash', () => {
    const hash = createHash('sha256').update(JSON.stringify(LAB_THRESHOLDS)).digest('hex');
    expect(
      hash,
      `LAB_THRESHOLDS changed — bump LAB_THRESHOLDS_VERSION (currently "${LAB_THRESHOLDS_VERSION}") and update LAB_THRESHOLDS_HASH`,
    ).toBe(LAB_THRESHOLDS_HASH);
  });

  it('keeps the plan §5.1 shape: at most 2 focus words, Clear above Almost', () => {
    expect(LAB_THRESHOLDS.focus.maxWords).toBe(2);
    expect(LAB_THRESHOLDS.word.clearMin).toBeGreaterThan(LAB_THRESHOLDS.word.almostMin);
  });
});
