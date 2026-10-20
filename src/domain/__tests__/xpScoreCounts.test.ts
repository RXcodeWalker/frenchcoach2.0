import { describe, it, expect } from 'vitest';
import { computeXPGain, computeParticipationXPGain, scoreGemBonus } from '../xp';

// learn-marking §8.2 — below Exam standard an answer earns no score bonus XP
// and no score gem bonus (owner decision, 2026-10-18).
describe('computeXPGain scoreCounts', () => {
  it('defaults to counting the score (every existing caller unchanged)', () => {
    expect(computeXPGain(9, 2)).toEqual(computeXPGain(9, 2, { scoreCounts: true }));
    expect(computeXPGain(9, 2)).toEqual({ gain: 10 + 14 + 4, gemsGain: 2 + 5 });
  });

  it('a score that does not count earns exactly participation XP and gems', () => {
    for (const score of [0, 5, 8, 10]) {
      for (const streak of [0, 3, 9]) {
        expect(computeXPGain(score, streak, { scoreCounts: false })).toEqual(computeParticipationXPGain(streak));
      }
    }
  });

  it('scoreGemBonus is +5 at 8 or more, only when the score counts', () => {
    expect(scoreGemBonus(8)).toBe(5);
    expect(scoreGemBonus(7.9)).toBe(0);
    expect(scoreGemBonus(10, false)).toBe(0);
  });
});
