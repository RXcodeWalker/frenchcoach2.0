import { describe, expect, it } from 'vitest';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from './fixtures';
import { countWords, responseCountsByQuestion } from '../counts';

describe('countWords', () => {
  it('counts words in a normal response', () => {
    expect(countWords('Je vais a Paris demain')).toBe(5);
  });

  it('handles empty or whitespace-only response as 0', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('responseCountsByQuestion', () => {
  it('counts words per turn and role-play task', () => {
    const rows = responseCountsByQuestion(EVIDENCE_GOLDEN_TRANSCRIPT);
    const target = rows.find((row) => row.questionId === 'topic1:q1');
    expect(target?.wordCount).toBe(7);
    expect(target?.responseCount).toBe(1);
  });

  it('aggregates totals across all questions', () => {
    const rows = responseCountsByQuestion(EVIDENCE_GOLDEN_TRANSCRIPT);
    const totalWords = rows.reduce((sum, row) => sum + row.wordCount, 0);
    expect(rows.length).toBe(9);
    expect(totalWords).toBeGreaterThan(20);
  });
});
