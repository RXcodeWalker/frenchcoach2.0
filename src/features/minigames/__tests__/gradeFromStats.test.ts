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

describe('gradeFromStats', () => {
  describe('rapidFire rubric', () => {
    it('awards S at boundary (90% acc, streak 10, 15 answered)', () => {
      const result = gradeFromStats(
        stats({
          correctAnswers: 14,
          totalAnswered: 15,
          maxStreak: 10,
        }),
        RUBRICS.rapidFire,
        'rapidFire'
      );
      expect(result.grade).toBe('S');
      expect(result.accuracy).toBe(93);
    });

    it('downgrades S to A when accuracy is 89%', () => {
      const result = gradeFromStats(
        stats({
          correctAnswers: 13,
          totalAnswered: 15,
          maxStreak: 10,
        }),
        RUBRICS.rapidFire
      );
      expect(result.grade).toBe('A');
    });

    it('awards A at 80% acc and streak 5', () => {
      const result = gradeFromStats(
        stats({ correctAnswers: 8, totalAnswered: 10, maxStreak: 5 }),
        RUBRICS.rapidFire
      );
      expect(result.grade).toBe('A');
    });

    it('awards B at 65% with 5+ answered', () => {
      const result = gradeFromStats(
        stats({ correctAnswers: 4, totalAnswered: 5, maxStreak: 2 }),
        RUBRICS.rapidFire
      );
      expect(result.grade).toBe('B');
    });

    it('defaults to D below thresholds', () => {
      const result = gradeFromStats(
        stats({ correctAnswers: 1, totalAnswered: 10, maxStreak: 1 }),
        RUBRICS.rapidFire
      );
      expect(result.grade).toBe('D');
    });
  });

  describe('survival rubric', () => {
    it('awards S at level 15 and 90% accuracy', () => {
      const result = gradeFromStats(
        stats({ correctAnswers: 9, totalAnswered: 10, level: 15 }),
        RUBRICS.survival,
        'survival'
      );
      expect(result.grade).toBe('S');
      expect(result.gradeColor).toContain('orange');
      expect(result.message).toBe('LEGENDARY SURVIVOR!');
    });

    it('awards A at level 8', () => {
      const result = gradeFromStats(
        stats({ correctAnswers: 8, totalAnswered: 10, level: 8 }),
        RUBRICS.survival,
        'survival'
      );
      expect(result.grade).toBe('A');
    });
  });

  describe('speedSpeaking rubric', () => {
    it('requires 12 answered for S-rank', () => {
      const almost = gradeFromStats(
        stats({
          correctAnswers: 11,
          totalAnswered: 11,
          maxStreak: 10,
        }),
        RUBRICS.speedSpeaking
      );
      expect(almost.grade).toBe('A');

      const sRank = gradeFromStats(
        stats({
          correctAnswers: 11,
          totalAnswered: 12,
          maxStreak: 10,
        }),
        RUBRICS.speedSpeaking
      );
      expect(sRank.grade).toBe('S');
    });
  });

  describe('speakingArena rubric', () => {
    it('requires wave 5 and 20 answered for S-rank', () => {
      const result = gradeFromStats(
        stats({
          correctAnswers: 18,
          totalAnswered: 20,
          wave: 5,
        }),
        RUBRICS.speakingArena
      );
      expect(result.grade).toBe('S');
    });

    it('awards A at wave 3 and 80% accuracy', () => {
      const result = gradeFromStats(
        stats({ correctAnswers: 8, totalAnswered: 10, wave: 3 }),
        RUBRICS.speakingArena
      );
      expect(result.grade).toBe('A');
    });
  });

  describe('emojiMaster rubric', () => {
    it('awards S for high accuracy, streak, and volume', () => {
      const result = gradeFromStats(
        stats({
          correctAnswers: 10,
          totalAnswered: 10,
          maxStreak: 8,
        }),
        RUBRICS.emojiMaster,
        'emojiMaster'
      );
      expect(result.grade).toBe('S');
      expect(result.accuracy).toBe(100);
    });

    it('falls to D below C threshold', () => {
      const result = gradeFromStats(
        stats({ correctAnswers: 1, totalAnswered: 10, maxStreak: 1 }),
        RUBRICS.emojiMaster
      );
      expect(result.grade).toBe('D');
    });
  });
});
