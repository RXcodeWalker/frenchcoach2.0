import { describe, it, expect } from 'vitest';
import { segmentUtterances, SILENCE_GAP_THRESHOLD_S } from '../assemble/segmentUtterances';
import type { RawAsrWord, SessionQuestionSet } from '../types';

const QUESTION_SET: SessionQuestionSet = {
  questionSetId: 'qs-1',
  questions: [
    {
      questionId: 'q1',
      part: 'topic1',
      mainText: "Qu'est-ce que tu aimes faire le week-end ?",
      alternativeTexts: [],
    },
  ],
};

function w(text: string, startS: number, endS: number, speakerCluster: string): RawAsrWord {
  return { text, startS, endS, confidence: 1, speakerCluster };
}

describe('segmentUtterances', () => {
  it('splits on speaker change', () => {
    const words = [
      w('Bonjour', 0, 0.5, 'A'),
      w('salut', 0.6, 1.0, 'B'),
    ];
    const result = segmentUtterances(words, QUESTION_SET);
    expect(result).toHaveLength(2);
    expect(result[0].speakerCluster).toBe('A');
    expect(result[1].speakerCluster).toBe('B');
  });

  it('splits on a silence gap at or above the threshold', () => {
    const words = [
      w('Bonjour', 0, 0.5, 'A'),
      w('alors', 0.5 + SILENCE_GAP_THRESHOLD_S, 1.5 + SILENCE_GAP_THRESHOLD_S, 'A'),
    ];
    const result = segmentUtterances(words, QUESTION_SET);
    expect(result).toHaveLength(2);
  });

  it('does not split on a short intra-utterance pause', () => {
    const words = [
      w('Bonjour', 0, 0.5, 'A'),
      w('alors', 0.5 + SILENCE_GAP_THRESHOLD_S - 0.1, 1.0, 'A'),
    ];
    const result = segmentUtterances(words, QUESTION_SET);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Bonjour alors');
  });

  it('assigns questionId once the utterance text matches a question', () => {
    const words = [
      w("Qu'est-ce", 0, 0.3, 'A'),
      w('que', 0.3, 0.4, 'A'),
      w('tu', 0.4, 0.5, 'A'),
      w('aimes', 0.5, 0.8, 'A'),
      w('faire', 0.8, 1.1, 'A'),
      w('le', 1.1, 1.2, 'A'),
      w('week-end', 1.2, 1.7, 'A'),
      w('?', 1.7, 1.7, 'A'),
    ];
    const result = segmentUtterances(words, QUESTION_SET);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe('q1');
    expect(result[0].part).toBe('topic1');
  });

  it('carries the running attribution forward to a subsequent unmatched utterance', () => {
    const words = [
      w("Qu'est-ce", 0, 0.3, 'A'),
      w('que', 0.3, 0.4, 'A'),
      w('tu', 0.4, 0.5, 'A'),
      w('aimes', 0.5, 0.8, 'A'),
      w('faire', 0.8, 1.1, 'A'),
      w('le', 1.1, 1.2, 'A'),
      w('week-end', 1.2, 1.7, 'A'),
      w('?', 1.7, 1.7, 'A'),
      w("j'aime", 2.5, 2.9, 'B'),
      w('lire', 2.9, 3.2, 'B'),
    ];
    const result = segmentUtterances(words, QUESTION_SET);
    expect(result).toHaveLength(2);
    expect(result[1].questionId).toBe('q1');
  });
});
