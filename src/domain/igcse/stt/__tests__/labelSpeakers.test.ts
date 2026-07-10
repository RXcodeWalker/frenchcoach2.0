import { describe, it, expect } from 'vitest';
import { labelSpeakers } from '../assemble/labelSpeakers';
import type { SessionQuestionSet, Utterance } from '../types';

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

function utt(id: string, speakerCluster: string, text: string): Utterance {
  return {
    utteranceId: id,
    role: 'candidate',
    speakerCluster,
    part: 'topic1',
    questionId: null,
    startS: 0,
    endS: 1,
    text,
    words: [],
  };
}

describe('labelSpeakers', () => {
  it('clean two-cluster case: higher-question-matching cluster becomes examiner', () => {
    const utterances = [
      utt('u1', 'SPEAKER_00', "Qu'est-ce que tu aimes faire le week-end ?"),
      utt('u2', 'SPEAKER_01', "J'aime lire des livres."),
    ];
    const result = labelSpeakers(utterances, QUESTION_SET);
    expect(result.utterances.find((u) => u.utteranceId === 'u1')?.role).toBe('examiner');
    expect(result.utterances.find((u) => u.utteranceId === 'u2')?.role).toBe('candidate');
    expect(result.roleLabelConfidence).toBeGreaterThan(0);
  });

  it('swapped cluster ids: roles are still correct (not relying on speaker order)', () => {
    const utterances = [
      utt('u1', 'SPEAKER_01', "J'aime lire des livres."),
      utt('u2', 'SPEAKER_00', "Qu'est-ce que tu aimes faire le week-end ?"),
    ];
    const result = labelSpeakers(utterances, QUESTION_SET);
    expect(result.utterances.find((u) => u.utteranceId === 'u1')?.role).toBe('candidate');
    expect(result.utterances.find((u) => u.utteranceId === 'u2')?.role).toBe('examiner');
  });

  it('degenerate case: both clusters match questions equally yields low roleLabelConfidence', () => {
    const utterances = [
      utt('u1', 'SPEAKER_00', "Qu'est-ce que tu aimes faire le week-end ?"),
      utt('u2', 'SPEAKER_01', "Qu'est-ce que tu aimes faire le week-end ?"),
    ];
    const result = labelSpeakers(utterances, QUESTION_SET);
    expect(result.roleLabelConfidence).toBeLessThan(0.5);
  });

  it('non-two-cluster input returns zero confidence without guessing', () => {
    const utterances = [
      utt('u1', 'SPEAKER_00', 'a'),
      utt('u2', 'SPEAKER_01', 'b'),
      utt('u3', 'SPEAKER_02', 'c'),
    ];
    const result = labelSpeakers(utterances, QUESTION_SET);
    expect(result.roleLabelConfidence).toBe(0);
  });
});
