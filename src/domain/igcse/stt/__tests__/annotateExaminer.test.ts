import { describe, it, expect } from 'vitest';
import { annotateExaminer } from '../assemble/annotateExaminer';
import type { SessionQuestionSet, Utterance } from '../types';

const QUESTION_SET: SessionQuestionSet = {
  questionSetId: 'qs-1',
  questions: [
    {
      questionId: 'q1',
      part: 'topic1',
      mainText: "Qu'est-ce que tu aimes faire le week-end ?",
      alternativeTexts: ['Que fais-tu pendant le week-end ?'],
    },
  ],
  furtherQuestions: {
    topic1: ['Further question 1?', 'Further question 2?'],
    topic2: ['Further question 3?', 'Further question 4?'],
  },
};

function examinerUtt(id: string, startS: number, text: string): Utterance {
  return {
    utteranceId: id,
    role: 'examiner',
    speakerCluster: 'SPEAKER_00',
    part: 'topic1',
    questionId: null,
    startS,
    endS: startS + 1,
    text,
    words: [],
  };
}

describe('annotateExaminer', () => {
  it('first occurrence of the main question is main_question', () => {
    const utterances = [examinerUtt('u1', 0, "Qu'est-ce que tu aimes faire le week-end ?")];
    const events = annotateExaminer(utterances, QUESTION_SET);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('main_question');
    expect(events[0].questionId).toBe('q1');
  });

  it('second occurrence of the same main question is repetition, not a second main_question', () => {
    const utterances = [
      examinerUtt('u1', 0, "Qu'est-ce que tu aimes faire le week-end ?"),
      examinerUtt('u2', 5, "Qu'est-ce que tu aimes faire le week-end ?"),
    ];
    const events = annotateExaminer(utterances, QUESTION_SET);
    expect(events[0].kind).toBe('main_question');
    expect(events[1].kind).toBe('repetition');
  });

  it('alternative variant is alternative_question', () => {
    const utterances = [examinerUtt('u1', 0, 'Que fais-tu pendant le week-end ?')];
    const events = annotateExaminer(utterances, QUESTION_SET);
    expect(events[0].kind).toBe('alternative_question');
    expect(events[0].questionId).toBe('q1');
  });

  it('"Pourquoi ?" is extension_prompt', () => {
    const utterances = [examinerUtt('u1', 0, 'Pourquoi ?')];
    const events = annotateExaminer(utterances, QUESTION_SET);
    expect(events[0].kind).toBe('extension_prompt');
    expect(events[0].questionId).toBeNull();
  });

  it('"d\'accord" is unmatched, not silently dropped', () => {
    const utterances = [examinerUtt('u1', 0, "D'accord, très bien.")];
    const events = annotateExaminer(utterances, QUESTION_SET);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('unmatched');
  });

  it('ignores candidate utterances entirely', () => {
    const utterances: Utterance[] = [
      { ...examinerUtt('u1', 0, "Qu'est-ce que tu aimes faire le week-end ?"), role: 'candidate' },
    ];
    const events = annotateExaminer(utterances, QUESTION_SET);
    expect(events).toHaveLength(0);
  });
});
