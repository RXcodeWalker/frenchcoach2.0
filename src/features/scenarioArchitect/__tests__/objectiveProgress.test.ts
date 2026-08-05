import { describe, it, expect } from 'vitest';
import { resolveCompletedObjectives } from '../objectiveProgress';

describe('resolveCompletedObjectives', () => {
  const objectives = [
    'Order a croissant politely',
    'Ask about the price',
    'Say thank you and goodbye',
  ];
  const keyVocab = [
    { fr: 'croissant', en: 'croissant' },
    { fr: 'prix', en: 'price' },
    { fr: 'merci', en: 'thank you' },
  ];

  it('keeps already completed indexes', () => {
    const result = resolveCompletedObjectives({
      objectives,
      keyVocab,
      studentTranscripts: [],
      alreadyCompleted: [0],
    });
    expect(result).toEqual([0]);
  });

  it('uses API completed_objectives when provided', () => {
    const result = resolveCompletedObjectives({
      objectives,
      keyVocab,
      studentTranscripts: ['bonjour'],
      alreadyCompleted: [],
      apiCompleted: [1, 2],
    });
    expect(result).toEqual([1, 2]);
  });

  it('marks all complete when missionDone', () => {
    const result = resolveCompletedObjectives({
      objectives,
      keyVocab,
      studentTranscripts: [],
      alreadyCompleted: [0],
      missionDone: true,
    });
    expect(result).toEqual([0, 1, 2]);
  });

  it('infers completion from transcript keywords', () => {
    const result = resolveCompletedObjectives({
      objectives,
      keyVocab,
      studentTranscripts: ["Je voudrais un croissant s'il vous plaît"],
      alreadyCompleted: [],
    });
    expect(result).toContain(0);
  });

  it('does not invent progress from empty speech', () => {
    const result = resolveCompletedObjectives({
      objectives,
      keyVocab,
      studentTranscripts: ['   '],
      alreadyCompleted: [],
    });
    expect(result).toEqual([]);
  });
});
