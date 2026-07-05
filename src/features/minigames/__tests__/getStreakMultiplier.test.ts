import { describe, it, expect } from 'vitest';
import {
  getStreakMultiplier,
  DEFAULT_STREAK_TIERS,
} from '../utils/getStreakMultiplier';

describe('getStreakMultiplier', () => {
  describe('standard tiers (no 5×)', () => {
    it('returns 1 below tier 3', () => {
      expect(getStreakMultiplier(0)).toBe(1);
      expect(getStreakMultiplier(2)).toBe(1);
    });

    it('returns 1.5 at streak 3', () => {
      expect(getStreakMultiplier(3)).toBe(1.5);
      expect(getStreakMultiplier(4)).toBe(1.5);
    });

    it('returns 2 at streak 5', () => {
      expect(getStreakMultiplier(5)).toBe(2);
      expect(getStreakMultiplier(9)).toBe(2);
    });

    it('returns 3 at streak 10+', () => {
      expect(getStreakMultiplier(10)).toBe(3);
      expect(getStreakMultiplier(19)).toBe(3);
    });
  });

  describe('DEFAULT_STREAK_TIERS (RapidFire 5×)', () => {
    it('returns 5 at streak 20+', () => {
      expect(getStreakMultiplier(20, DEFAULT_STREAK_TIERS)).toBe(5);
      expect(getStreakMultiplier(50, DEFAULT_STREAK_TIERS)).toBe(5);
    });

    it('returns 3 at streak 10–19', () => {
      expect(getStreakMultiplier(10, DEFAULT_STREAK_TIERS)).toBe(3);
      expect(getStreakMultiplier(19, DEFAULT_STREAK_TIERS)).toBe(3);
    });
  });

  it('uses STANDARD_STREAK_TIERS by default', () => {
    expect(getStreakMultiplier(10)).toBe(3);
    expect(getStreakMultiplier(20)).toBe(3);
  });

  it('respects custom tier ordering (highest minStreak first)', () => {
    const custom = [
      { minStreak: 5, multiplier: 10 },
      { minStreak: 2, multiplier: 2 },
    ];
    expect(getStreakMultiplier(5, custom)).toBe(10);
    expect(getStreakMultiplier(3, custom)).toBe(2);
  });
});
