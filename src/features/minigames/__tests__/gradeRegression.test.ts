/**
 * Phase E — grade letter regression fixtures.
 * Mirrors pre-migration inline thresholds from RapidFire, SpeedSpeaking,
 * SurvivalMode, and SpeakingArena finished screens.
 */
import { describe, it, expect } from 'vitest';
import { gradeFromStats, RUBRICS } from '../utils/gradeFromStats';
import type { BaseRunStats } from '../types';

function stats(overrides: Partial<BaseRunStats> = {}): BaseRunStats {
  return {
    score: 0,
    correctAnswers: 0,
    totalAnswered: 0,
    maxStreak: 0,
    accuracy: 0,
    ...overrides,
  };
}

describe('grade regression fixtures (Phase E)', () => {
  describe('rapidFire', () => {
    const rubric = RUBRICS.rapidFire;

    it('S at 90%+ acc, streak 10+, 15+ answered', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 14, totalAnswered: 15, maxStreak: 10 }),
          rubric
        ).grade
      ).toBe('S');
    });

    it('A at 89% acc with streak 10 (was S gate)', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 13, totalAnswered: 15, maxStreak: 10 }),
          rubric
        ).grade
      ).toBe('A');
    });

    it('A at 80%+ acc and streak 5+', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 8, totalAnswered: 10, maxStreak: 5 }),
          rubric
        ).grade
      ).toBe('A');
    });

    it('B at 65%+ with 5+ answered', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 4, totalAnswered: 5, maxStreak: 2 }),
          rubric
        ).grade
      ).toBe('B');
    });

    it('C at 40%+ acc', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 2, totalAnswered: 5, maxStreak: 1 }),
          rubric
        ).grade
      ).toBe('C');
    });

    it('D below 40% acc', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 1, totalAnswered: 10, maxStreak: 1 }),
          rubric
        ).grade
      ).toBe('D');
    });
  });

  describe('speedSpeaking', () => {
    const rubric = RUBRICS.speedSpeaking;

    it('S requires 12+ answered (11 answered → A)', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 11, totalAnswered: 11, maxStreak: 10 }),
          rubric
        ).grade
      ).toBe('A');
      expect(
        gradeFromStats(
          stats({ correctAnswers: 11, totalAnswered: 12, maxStreak: 10 }),
          rubric
        ).grade
      ).toBe('S');
    });

    it('B requires 4+ answered', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 3, totalAnswered: 3, maxStreak: 2 }),
          rubric
        ).grade
      ).toBe('C');
      expect(
        gradeFromStats(
          stats({ correctAnswers: 3, totalAnswered: 4, maxStreak: 2 }),
          rubric
        ).grade
      ).toBe('B');
    });
  });

  describe('survival', () => {
    const rubric = RUBRICS.survival;

    it('S at level 15 and 90%+ acc', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 9, totalAnswered: 10, level: 15 }),
          rubric,
          'survival'
        ).grade
      ).toBe('S');
    });

    it('A at level 8 and 80%+ acc', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 8, totalAnswered: 10, level: 8 }),
          rubric
        ).grade
      ).toBe('A');
    });

    it('B at level 4 and 65%+ acc', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 3, totalAnswered: 4, level: 4 }),
          rubric
        ).grade
      ).toBe('B');
    });
  });

  describe('speakingArena', () => {
    const rubric = RUBRICS.speakingArena;

    it('S at wave 5, 20+ answered, 90%+ acc', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 18, totalAnswered: 20, wave: 5 }),
          rubric
        ).grade
      ).toBe('S');
    });

    it('A at wave 3 and 80%+ acc', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 8, totalAnswered: 10, wave: 3 }),
          rubric
        ).grade
      ).toBe('A');
    });

    it('B at wave 2 and 65%+ acc', () => {
      expect(
        gradeFromStats(
          stats({ correctAnswers: 2, totalAnswered: 3, wave: 2 }),
          rubric
        ).grade
      ).toBe('B');
    });
  });
});
