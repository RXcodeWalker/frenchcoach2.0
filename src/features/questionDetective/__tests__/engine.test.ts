import { describe, expect, it } from 'vitest';
import { WORD_TO_TYPE } from '../../../data/questionWords/types';
import { classifyAnswer } from '../answerType';
import { buildRound, parseWordFilter, ROUND_SIZE } from '../engine';
import { emptyLadder } from '../ladder';
import { mulberry32 } from '../rng';

describe('buildRound', () => {
  it('is deterministic for a seed and sizes to ROUND_SIZE', () => {
    const a = buildRound(mulberry32(7), { ladder: emptyLadder(), mixups: {} });
    const b = buildRound(mulberry32(7), { ladder: emptyLadder(), mixups: {} });
    expect(a.items.map(i => i.question.id)).toEqual(b.items.map(i => i.question.id));
    expect(a.items).toHaveLength(ROUND_SIZE);
  });

  it('gives tap choices whose wrong answers are a different type', () => {
    for (const seed of [1, 3, 7, 11, 99, 1234, 2026]) {
      const round = buildRound(mulberry32(seed), { ladder: emptyLadder(), mixups: {} });
      for (const item of round.items) {
        expect(item.choices, `seed ${seed} ${item.question.id}`).toHaveLength(3);
        expect(item.choices).toContain(item.question.model);
        for (const choice of item.choices) {
          if (choice === item.question.model) continue;
          const type = classifyAnswer(choice);
          expect(type, `${choice} on ${item.question.id}`).not.toBeNull();
          expect(type).not.toBe(WORD_TO_TYPE[item.question.wordId]);
          if (item.question.answerType === 'person') expect(type).not.toBe('choice');
          if (item.question.answerType === 'choice') expect(type).not.toBe('person');
        }
      }
    }
  });

  it('honours a teacher word filter', () => {
    expect(parseWordFilter('quand,combien')).toEqual(['quand', 'combien']);
    const round = buildRound(mulberry32(1), {
      ladder: emptyLadder(),
      mixups: {},
      filter: parseWordFilter('quand,combien'),
    });
    expect(round.items.every(i => i.question.wordId === 'quand' || i.question.wordId === 'combien')).toBe(true);
  });
});
