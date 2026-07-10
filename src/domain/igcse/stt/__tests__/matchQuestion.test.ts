import { describe, it, expect } from 'vitest';
import { matchQuestion } from '../assemble/matchQuestion';
import type { SessionQuestionSet } from '../types';

const QUESTION_SET: SessionQuestionSet = {
  questionSetId: 'qs-1',
  questions: [
    {
      questionId: 'q1',
      part: 'topic1',
      mainText: "Qu'est-ce que tu aimes faire le week-end ?",
      alternativeTexts: ['Que fais-tu pendant le week-end ?'],
    },
    {
      questionId: 'q2',
      part: 'topic1',
      mainText: 'Quelle est ta matière préférée au collège ?',
      alternativeTexts: [],
    },
  ],
};

describe('matchQuestion', () => {
  it('exact match returns the main variant at score 1', () => {
    const result = matchQuestion("Qu'est-ce que tu aimes faire le week-end ?", QUESTION_SET);
    expect(result).toEqual({ questionId: 'q1', variant: 'main', score: 1 });
  });

  it('accent-stripped-equivalent text still matches (via shared normalizer)', () => {
    const result = matchQuestion('quest-ce que tu aimes faire le week-end ?', QUESTION_SET);
    expect(result?.questionId).toBe('q1');
  });

  it('curly-apostrophe transcript matches straight-apostrophe question text', () => {
    const result = matchQuestion('Qu’est-ce que tu aimes faire le week-end ?', QUESTION_SET);
    expect(result?.questionId).toBe('q1');
    expect(result?.variant).toBe('main');
  });

  it('matches an alternative variant', () => {
    const result = matchQuestion('Que fais-tu pendant le week-end ?', QUESTION_SET);
    expect(result).toEqual({ questionId: 'q1', variant: 'alternative', score: 1 });
  });

  it('returns null below threshold', () => {
    const result = matchQuestion('Il fait beau aujourd’hui.', QUESTION_SET);
    expect(result).toBeNull();
  });

  it('adversarial: a candidate utterance echoing the question text still scores as a match (matching is symmetric — role gating happens in labelSpeakers, not here)', () => {
    const result = matchQuestion("Qu'est-ce que tu aimes faire le week-end ? Moi j'aime lire.", QUESTION_SET);
    expect(result?.questionId).toBe('q1');
  });
});
