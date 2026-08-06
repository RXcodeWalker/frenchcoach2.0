import { describe, it, expect } from 'vitest';
import {
  resolveObjectiveProgress,
  sanitizeCompletedObjectives,
  inferCompletedObjectivesFromContent,
  objectiveClearedLabel,
  objectiveSatisfiedByContent,
} from '../objectiveProgress';

function corpus(parts: string[]): string {
  return parts
    .join(' \n ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

describe('sanitizeCompletedObjectives', () => {
  it('returns null when the field is missing', () => {
    expect(sanitizeCompletedObjectives(undefined, 3)).toBeNull();
    expect(sanitizeCompletedObjectives(null, 3)).toBeNull();
  });

  it('keeps valid 0-based indices and drops out-of-range values', () => {
    expect(sanitizeCompletedObjectives([0, 2, 9, -1, 1.5, '1'], 3)).toEqual([0, 1, 2]);
  });

  it('accepts an empty array as an explicit API signal', () => {
    expect(sanitizeCompletedObjectives([], 3)).toEqual([]);
  });
});

describe('objectiveSatisfiedByContent / inferCompletedObjectivesFromContent', () => {
  const vocab = [
    { fr: 'croissant', en: 'croissant' },
    { fr: 'portefeuille', en: 'wallet' },
    { fr: 'prix', en: 'price' },
  ];

  it('marks greeting when the student says bonjour', () => {
    expect(
      objectiveSatisfiedByContent('Greet the baker', corpus(['Bonjour madame']), vocab),
    ).toBe(true);
  });

  it('does not mark greeting from unrelated speech', () => {
    expect(
      objectiveSatisfiedByContent(
        'Greet the baker',
        corpus(['Je voudrais un croissant']),
        vocab,
      ),
    ).toBe(false);
  });

  it('requires speech act and content for "Order a croissant"', () => {
    expect(
      objectiveSatisfiedByContent('Order a croissant', corpus(['Je voudrais un café']), vocab),
    ).toBe(false);

    expect(
      objectiveSatisfiedByContent(
        'Order a croissant',
        corpus(["Je voudrais un croissant s'il vous plaît"]),
        vocab,
      ),
    ).toBe(true);
  });

  it('detects asking the price from French evidence', () => {
    expect(
      objectiveSatisfiedByContent('Ask for the price', corpus(['Combien ça coûte ?']), vocab),
    ).toBe(true);
  });

  it('infers multiple objectives across utterances without using turn count', () => {
    const objectives = [
      'Greet the baker',
      'Order a croissant',
      'Ask for the price',
      'Thank the person at the end',
    ];

    // One long first turn — still content-based, not "messages.length > 2"
    expect(
      inferCompletedObjectivesFromContent(
        objectives,
        ["Bonjour ! Je voudrais un croissant. Combien ça coûte ?"],
        vocab,
      ),
    ).toEqual([0, 1, 2]);

    expect(inferCompletedObjectivesFromContent(objectives, ['um', 'euh'], vocab)).toEqual([]);
  });

  it('uses key vocab to map English objective nouns to French', () => {
    expect(
      objectiveSatisfiedByContent(
        'Explain that you forgot your wallet',
        corpus(["J'ai oublié mon portefeuille"]),
        vocab,
      ),
    ).toBe(true);
  });
});

describe('resolveObjectiveProgress', () => {
  const objectives = [
    'Greet the baker',
    'Order a croissant',
    'Ask for the price',
  ];
  const vocab = [
    { fr: 'croissant', en: 'croissant' },
    { fr: 'prix', en: 'price' },
  ];

  it('prefers API completed_objectives over content inference', () => {
    const result = resolveObjectiveProgress({
      objectives,
      previouslyCompleted: [],
      // Content would also complete 0 — API only claims index 1
      studentUtterances: ['Bonjour !'],
      turn: { is_done: false, completed_objectives: [1] },
      keyVocab: vocab,
    });
    expect(result.completed).toEqual([1]);
    expect(result.newlyCompleted).toEqual([1]);
  });

  it('uses content inference when API omits completed_objectives', () => {
    const result = resolveObjectiveProgress({
      objectives,
      previouslyCompleted: [],
      studentUtterances: ['Bonjour madame'],
      turn: { is_done: false },
      keyVocab: vocab,
    });
    expect(result.completed).toEqual([0]);
    expect(result.newlyCompleted).toEqual([0]);
  });

  it('marks all remaining objectives when is_done is true', () => {
    const result = resolveObjectiveProgress({
      objectives,
      previouslyCompleted: [0],
      studentUtterances: ['merci'],
      turn: { is_done: true },
      keyVocab: vocab,
    });
    expect(result.completed).toEqual([0, 1, 2]);
    expect(result.newlyCompleted).toEqual([1, 2]);
  });

  it('is monotonic — never un-completes prior objectives', () => {
    const result = resolveObjectiveProgress({
      objectives,
      previouslyCompleted: [0, 2],
      studentUtterances: ['ok'],
      turn: { is_done: false, completed_objectives: [1] },
      keyVocab: vocab,
    });
    expect(result.completed).toEqual([0, 1, 2]);
    expect(result.newlyCompleted).toEqual([1]);
  });

  it('does not award progress from empty/failed turns', () => {
    const result = resolveObjectiveProgress({
      objectives,
      previouslyCompleted: [],
      studentUtterances: ['', '   '],
      turn: { is_done: false },
      keyVocab: vocab,
    });
    expect(result.completed).toEqual([]);
    expect(result.newlyCompleted).toEqual([]);
  });

  it('does not use turn-count heuristics (many short turns still empty if no evidence)', () => {
    const result = resolveObjectiveProgress({
      objectives,
      previouslyCompleted: [],
      studentUtterances: ['euh', 'euh', 'euh', 'euh', 'euh'],
      turn: { is_done: false },
      keyVocab: vocab,
    });
    expect(result.completed).toEqual([]);
  });
});

describe('objectiveClearedLabel', () => {
  it('uses 1-based numbering for toasts', () => {
    expect(objectiveClearedLabel(0)).toBe('Objective 1 cleared');
    expect(objectiveClearedLabel(1)).toBe('Objective 2 cleared');
  });
});
