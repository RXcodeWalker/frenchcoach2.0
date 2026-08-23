// Stage 4 item 6: ladder rungs as scaffolds — frames built from the
// question's demands.structures/timeFrames plus keyVocab, not fabricated
// French claiming to be a correct answer. Reuses ExpansionLevel unchanged.

import { describe, it, expect } from 'vitest';
import { evaluate } from '../coachService';
import type { Question } from '../../../types';
import type { QuestionDemands } from '../../../domain/learn/demand/types';

function questionWith(overrides: Partial<Question> & { demands?: QuestionDemands }): Question {
  return {
    id: 'q1',
    topicKey: 'school',
    text: 'Question de test',
    hint: '',
    difficulty: 2,
    followUps: [],
    modelAnswer: '',
    keyVocab: [],
    ...overrides,
  };
}

const demands: QuestionDemands = {
  cognitiveDemand: 'justify',
  timeFrames: ['past'],
  structures: ['justification'],
  responseLoad: 'developed',
  lexicalReach: 'everyday',
  sufficientAnswer: 'An opinion with a reason and a past-tense detail.',
  provenance: 'authored',
};

describe('offline ladder scaffolds (docs Stage 4 item 6)', () => {
  it('question with no demands and no keyVocab: no ladder', () => {
    const question = questionWith({});
    const result = evaluate('nous avons joué au tennis hier avec des amis au parc', question);
    expect(result.expansionLevels ?? []).toEqual([]);
  });

  it('question with demands: rungs built from structures + timeFrames, sequential levels 1..N', () => {
    const question = questionWith({ demands });
    const result = evaluate('nous avons joué au tennis hier avec des amis au parc', question);
    const levels = result.expansionLevels ?? [];
    expect(levels.length).toBeGreaterThan(0);
    expect(levels.map(l => l.level)).toEqual(levels.map((_, i) => i + 1));
    // A structure frame (justification) is present as a slot to complete, not
    // a claim about the learner's own words.
    expect(levels.some(l => l.sentence.includes('parce que'))).toBe(true);
  });

  it('question with keyVocab: a rung offers the tagged vocabulary as a frame, not fabricated prose', () => {
    const question = questionWith({
      demands,
      keyVocab: [{ fr: 'le collège', en: 'secondary school' }, { fr: 'les devoirs', en: 'homework' }],
    });
    const result = evaluate('nous avons joué au tennis hier avec des amis au parc', question);
    const levels = result.expansionLevels ?? [];
    const vocabRung = levels.find(l => l.sentence.includes('le collège'));
    expect(vocabRung).toBeDefined();
    expect(vocabRung?.addedWhat).toMatch(/vocabulary/i);
  });

  it('rungs never exceed 3', () => {
    const question = questionWith({
      demands,
      keyVocab: [{ fr: 'a', en: 'a' }, { fr: 'b', en: 'b' }, { fr: 'c', en: 'c' }],
    });
    const result = evaluate('nous avons joué au tennis hier avec des amis au parc', question);
    expect((result.expansionLevels ?? []).length).toBeLessThanOrEqual(3);
  });

  it('tier 1 (very short answer) keeps its existing single-word ladder, not the demand ladder', () => {
    const question = questionWith({ demands });
    const result = evaluate('foot', question);
    expect(result.responseTier).toBe(1);
    // buildTier1LocalResult's word-based ladder — sentences built around the
    // single word, distinct from the demand-frame ladder's shape.
    const levels = result.expansionLevels ?? [];
    expect(levels.length).toBeGreaterThan(0);
    expect(levels.every(l => l.sentence.toLowerCase().includes('foot'))).toBe(true);
  });
});
