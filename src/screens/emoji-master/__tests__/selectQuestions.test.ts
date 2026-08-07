import { describe, it, expect } from 'vitest';
import type { EmojiQuestion } from '../../../data/emojiQuestions';
import {
  drawNextQuestion,
  ensureMinPool,
  selectQuestions,
} from '../selectQuestions';
import { MIN_POOL_SIZE } from '../types';

function q(
  partial: Partial<EmojiQuestion> & Pick<EmojiQuestion, 'id' | 'category' | 'difficulty'>
): EmojiQuestion {
  return {
    emojis: '❓',
    french: partial.id,
    english: partial.id,
    options: [partial.id, 'a', 'b', 'c'],
    ...partial,
  };
}

function seqRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length] ?? 0;
    i += 1;
    return v;
  };
}

const POOL: EmojiQuestion[] = [
  q({ id: 'a1', category: 'animals', difficulty: 1 }),
  q({ id: 'a2', category: 'animals', difficulty: 1 }),
  q({ id: 'f1', category: 'food', difficulty: 1 }),
  q({ id: 'f2', category: 'food', difficulty: 1 }),
  q({ id: 'f3', category: 'food', difficulty: 2 }),
  q({ id: 'f4', category: 'food', difficulty: 2 }),
  q({ id: 'f5', category: 'food', difficulty: 2 }),
  q({ id: 'f6', category: 'food', difficulty: 2 }),
  q({ id: 'f7', category: 'food', difficulty: 3 }),
  q({ id: 'f8', category: 'food', difficulty: 3 }),
  q({ id: 'n1', category: 'nature', difficulty: 1 }),
  q({ id: 'n2', category: 'nature', difficulty: 2 }),
];

describe('selectQuestions', () => {
  it('pads category pools below MIN_POOL_SIZE from all', () => {
    const animals = POOL.filter((x) => x.category === 'animals');
    expect(animals.length).toBeLessThan(MIN_POOL_SIZE);
    const padded = ensureMinPool(animals, POOL, () => 0);
    expect(padded.length).toBeGreaterThanOrEqual(MIN_POOL_SIZE);
    expect(padded.filter((x) => x.category === 'animals').length).toBe(2);
  });

  it('builds a fixed classic run of 10 with difficulty mix when possible', () => {
    const large: EmojiQuestion[] = [];
    for (let i = 0; i < 8; i++) large.push(q({ id: `e${i}`, category: 'food', difficulty: 1 }));
    for (let i = 0; i < 8; i++) large.push(q({ id: `m${i}`, category: 'food', difficulty: 2 }));
    for (let i = 0; i < 4; i++) large.push(q({ id: `h${i}`, category: 'food', difficulty: 3 }));

    const selected = selectQuestions(
      large,
      { category: 'food', mode: 'classic', count: 10 },
      seqRng([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])
    );
    expect(selected).toHaveLength(10);
    const d1 = selected.filter((x) => x.difficulty === 1).length;
    const d2 = selected.filter((x) => x.difficulty === 2).length;
    const d3 = selected.filter((x) => x.difficulty === 3).length;
    expect(d1).toBe(4);
    expect(d2).toBe(4);
    expect(d3).toBe(2);
  });

  it('reshuffles excluding recent ids when deck exhausted', () => {
    const small = POOL.slice(0, 6);
    const recent = small.slice(0, 3).map((x) => x.id);
    const { question, remaining } = drawNextQuestion(
      small,
      [],
      recent,
      () => 0
    );
    expect(recent).not.toContain(question.id);
    expect(remaining.length).toBe(small.length - 1 - 3);
  });

  it('weights arena draws toward preferred difficulties', () => {
    const deck = selectQuestions(
      POOL,
      { category: 'all', mode: 'arena', bossHpRatio: 0.2 },
      () => 0
    );
    // First items should prefer difficulty 2–3
    expect([2, 3]).toContain(deck[0].difficulty);
  });
});
