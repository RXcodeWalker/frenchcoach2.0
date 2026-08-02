import { describe, it, expect } from 'vitest';
import {
  PRACTICE_PASS_SCORE,
  PRACTICE_NEAR_MISS_SCORE,
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_MAX_PER_SESSION,
} from '../practiceThresholds';

describe('practiceThresholds', () => {
  it('orders the score bands sensibly: near-miss strictly below pass', () => {
    expect(PRACTICE_NEAR_MISS_SCORE).toBeLessThan(PRACTICE_PASS_SCORE);
  });

  it('scores are within the 0-100 PronunciationAssessment scale', () => {
    expect(PRACTICE_PASS_SCORE).toBeGreaterThan(0);
    expect(PRACTICE_PASS_SCORE).toBeLessThanOrEqual(100);
    expect(PRACTICE_NEAR_MISS_SCORE).toBeGreaterThan(0);
    expect(PRACTICE_NEAR_MISS_SCORE).toBeLessThanOrEqual(100);
  });

  it('allows at least one retry but caps attempts at a small number', () => {
    expect(PRACTICE_MAX_ATTEMPTS).toBeGreaterThanOrEqual(2);
    expect(PRACTICE_MAX_ATTEMPTS).toBeLessThanOrEqual(3);
  });

  it('caps practice steps per session to bound the added session length (R5)', () => {
    expect(PRACTICE_MAX_PER_SESSION).toBeGreaterThan(0);
    expect(PRACTICE_MAX_PER_SESSION).toBeLessThanOrEqual(5);
  });
});
