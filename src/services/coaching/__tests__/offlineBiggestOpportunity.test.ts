// Stage 4 item 5: offline biggest_opportunity comes from
// evaluateDemandSatisfaction's L1 verdict — 'not_attempted' only.
// 'unknown' must never be rendered as a failure (satisfaction.ts's asymmetric
// contract), and 'met' has nothing to flag.

import { describe, it, expect } from 'vitest';
import { evaluate } from '../coachService';
import type { Question } from '../../../types';
import type { QuestionDemands } from '../../../domain/learn/demand/types';

function questionWith(demands: QuestionDemands): Question {
  return {
    id: 'q1',
    topicKey: 'school',
    text: 'Question de test',
    hint: '',
    difficulty: 2,
    followUps: [],
    modelAnswer: '',
    keyVocab: [],
    demands,
  };
}

const justifyDemands: QuestionDemands = {
  cognitiveDemand: 'justify',
  timeFrames: ['present'],
  structures: ['opinion'],
  responseLoad: 'short', // 15-word floor; not_attempted below 6 words
  lexicalReach: 'everyday',
  sufficientAnswer: 'An opinion with a reason.',
  provenance: 'authored',
};

describe('offline biggest_opportunity (docs Stage 4 item 5)', () => {
  it('not_attempted (well below the responseLoad floor): renders the cognitive-demand opportunity', () => {
    const question = questionWith(justifyDemands);
    // 4 words, floor is 15*0.4=6 -> not_attempted
    const result = evaluate('le foot est bien', question);
    expect(result.biggest_opportunity).toBeDefined();
    expect(result.biggest_opportunity).toMatch(/opinion|pense que|avis/i);
  });

  it('met (marker present): no L1-based opportunity is fabricated', () => {
    const question = questionWith(justifyDemands);
    const result = evaluate("je pense que le football est le meilleur sport du monde et voilà pourquoi", question);
    expect(result.biggest_opportunity).toBeUndefined();
  });

  it('unknown (marker absent but word count clears not_attempted floor): never rendered as a failure', () => {
    const question = questionWith(justifyDemands);
    // Enough words to clear the not_attempted floor (6) but no opinion marker -> unknown
    const result = evaluate('nous avons joué au tennis hier avec des amis au parc', question);
    expect(result.biggest_opportunity).toBeUndefined();
  });

  it('no demands on the question: no L1-based opportunity (nothing to evaluate against)', () => {
    const question: Question = {
      id: 'q2', topicKey: 'school', text: 'Q', hint: '', difficulty: 2,
      followUps: [], modelAnswer: '', keyVocab: [],
    };
    const result = evaluate('le foot est bien', question);
    expect(result.biggest_opportunity).toBeUndefined();
  });
});
