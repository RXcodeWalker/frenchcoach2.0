import { describe, it, expect } from 'vitest';
import { buildSessionCompletion, computeXpAwarded } from '../scoring';

describe('scoring', () => {
  it('returns 0 XP on quit', () => {
    expect(
      computeXpAwarded({
        mode: 'classic',
        endReason: 'quit',
        correctAnswers: 10,
        maxStreak: 10,
      })
    ).toBe(0);
  });

  it('applies mode multipliers and streak bonus', () => {
    // classic: (5*10 + floor(5/5)*20) * 1 = 70
    expect(
      computeXpAwarded({
        mode: 'classic',
        endReason: 'completed',
        correctAnswers: 5,
        maxStreak: 5,
      })
    ).toBe(70);

    // hardcore: 70 * 1.5 = 105
    expect(
      computeXpAwarded({
        mode: 'hardcore',
        endReason: 'completed',
        correctAnswers: 5,
        maxStreak: 5,
      })
    ).toBe(105);
  });

  it('adds victory bonus only for arena victory', () => {
    const defeat = computeXpAwarded({
      mode: 'arena',
      endReason: 'defeat',
      correctAnswers: 4,
      maxStreak: 4,
    });
    const victory = computeXpAwarded({
      mode: 'arena',
      endReason: 'victory',
      correctAnswers: 4,
      maxStreak: 4,
    });
    expect(victory - defeat).toBe(50);
  });

  it('builds SessionCompletion with xpAwarded', () => {
    const session = buildSessionCompletion({
      mode: 'blitz',
      endReason: 'timeout',
      modeScore: 12,
      correctAnswers: 12,
      totalAnswered: 15,
      maxStreak: 6,
      history: [],
    });
    expect(session.xpAwarded).toBe(
      computeXpAwarded({
        mode: 'blitz',
        endReason: 'timeout',
        correctAnswers: 12,
        maxStreak: 6,
      })
    );
  });
});
