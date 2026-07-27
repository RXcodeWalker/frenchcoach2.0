import { describe, it, expect } from 'vitest';
import { isUnscored, displayScore, averageRealScores } from '../scoring';
import type { FeedbackV2 } from '../../types';

function makeFeedback(overrides: Partial<FeedbackV2> = {}): Pick<FeedbackV2, 'unscored' | 'scores'> {
  return {
    scores: { overall: 6, communication: 6, language: 6, fluency: 6 },
    ...overrides,
  };
}

describe('isUnscored', () => {
  it('is true only when unscored === "no_llm_offline"', () => {
    expect(isUnscored(makeFeedback({ unscored: 'no_llm_offline' }))).toBe(true);
  });

  it('is false when unscored is absent', () => {
    expect(isUnscored(makeFeedback())).toBe(false);
  });

  it('is false for a genuinely scored 0 — the discriminant is the flag, never the score value', () => {
    expect(isUnscored(makeFeedback({ scores: { overall: 0, communication: 0, language: 0, fluency: 0 } }))).toBe(false);
  });
});

describe('displayScore', () => {
  it('returns the formatted score for a graded attempt', () => {
    expect(displayScore(makeFeedback({ scores: { overall: 7.25, communication: 7, language: 7, fluency: 7 } }))).toBe('7.3');
  });

  it('returns null for an unscored attempt, never "0.0"', () => {
    expect(displayScore(makeFeedback({
      scores: { overall: 0, communication: 0, language: 0, fluency: 0 },
      unscored: 'no_llm_offline',
    }))).toBeNull();
  });

  it('returns "0.0" for a genuinely graded 0 — not conflated with unscored', () => {
    expect(displayScore(makeFeedback({ scores: { overall: 0, communication: 0, language: 0, fluency: 0 } }))).toBe('0.0');
  });
});

describe('averageRealScores', () => {
  it('averages only the non-null entries', () => {
    expect(averageRealScores([8, null, 4])).toBe(6);
  });

  it('returns null when every entry is null — never a fabricated 0', () => {
    expect(averageRealScores([null, null])).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(averageRealScores([])).toBeNull();
  });

  it('ignores non-finite values defensively', () => {
    expect(averageRealScores([10, NaN, 2])).toBe(6);
  });
});
