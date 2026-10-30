import { describe, it, expect } from 'vitest';
import { buildSessionCompletion, isFixedLengthMode, missedQuestionIds } from '../scoring';
import type { EmojiAnswerHistoryEntry } from '../types';

function entry(questionId: string, isCorrect: boolean): EmojiAnswerHistoryEntry {
  return {
    questionId,
    emojis: '🍎',
    french: 'la pomme',
    english: 'the apple',
    promptKind: 'emoji',
    userAnswer: 'x',
    correctAnswer: 'la pomme',
    isCorrect,
  };
}

describe('scoring', () => {
  it('builds a SessionCompletion that carries no XP', () => {
    const session = buildSessionCompletion({
      mode: 'blitz',
      endReason: 'timeout',
      modeScore: 12,
      correctAnswers: 12,
      totalAnswered: 15,
      maxStreak: 6,
      history: [],
    });
    expect(session).toMatchObject({ mode: 'blitz', modeScore: 12, isRetry: false });
    expect(Object.keys(session).filter((k) => /xp/i.test(k))).toEqual([]);
  });

  it('marks a retry round', () => {
    const session = buildSessionCompletion({
      mode: 'classic',
      endReason: 'completed',
      modeScore: 2,
      correctAnswers: 2,
      totalAnswered: 2,
      maxStreak: 2,
      history: [],
      isRetry: true,
    });
    expect(session.isRetry).toBe(true);
  });

  it('lists each missed word once, in the order first missed', () => {
    const history = [entry('a', false), entry('b', true), entry('c', false), entry('a', false)];
    expect(missedQuestionIds(history)).toEqual(['a', 'c']);
    expect(missedQuestionIds([entry('a', true)])).toEqual([]);
  });

  it('knows which modes have a fixed list of words', () => {
    expect(['classic', 'reverse', 'hardcore'].every((m) => isFixedLengthMode(m as never))).toBe(true);
    expect(isFixedLengthMode('blitz')).toBe(false);
    expect(isFixedLengthMode('arena')).toBe(false);
  });
});
