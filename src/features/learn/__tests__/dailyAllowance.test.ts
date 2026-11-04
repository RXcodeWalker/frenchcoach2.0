import { describe, expect, it } from 'vitest';
import { LEARN_ANSWERS_PER_DAY, dailySessionLength, learnDailyLimit } from '../dailyAllowance';

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

describe('Premium daily limit', () => {
  it('a Premium account is capped by its own limit, not the free 3', () => {
    expect(dailySessionLength(25, 5, 30)).toBe(5);
    expect(dailySessionLength(null, 5, 30)).toBe(5);
    expect(dailySessionLength(2, 5, 30)).toBe(2);
  });

  it("only the server's premium flag widens the limit (never a guest's looser backend cap)", () => {
    expect(learnDailyLimit({ limit: 30, premium: true })).toBe(30);
    expect(learnDailyLimit({ limit: 5, premium: false })).toBe(LEARN_ANSWERS_PER_DAY);
    expect(learnDailyLimit({ limit: 5 })).toBe(LEARN_ANSWERS_PER_DAY);
    expect(learnDailyLimit(null)).toBe(LEARN_ANSWERS_PER_DAY);
  });
});
