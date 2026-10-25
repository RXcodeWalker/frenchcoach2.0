import { describe, expect, it } from 'vitest';
import { LEARN_ANSWERS_PER_DAY, dailySessionLength } from '../dailyAllowance';

describe('dailySessionLength (3 AI-marked Learn answers a day)', () => {
  it('is the answers left today, never more than the daily number or the questions built', () => {
    expect(LEARN_ANSWERS_PER_DAY).toBe(3);
    expect(dailySessionLength(3, 5)).toBe(3);
    expect(dailySessionLength(2, 5)).toBe(2);
    expect(dailySessionLength(0, 5)).toBe(0);
    expect(dailySessionLength(3, 1)).toBe(1);
    expect(dailySessionLength(10, 20)).toBe(3);
  });

  it('unknown (null) means the daily number', () => {
    expect(dailySessionLength(null, 5)).toBe(3);
  });
});
