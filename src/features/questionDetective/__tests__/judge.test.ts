import { describe, expect, it } from 'vitest';
import { DETECTIVE_BANK } from '../../../data/questionWords/bank';
import { judgeAnswer, mixupKey } from '../judge';

const ou = DETECTIVE_BANK.find(q => q.id === 'ou_01')!;
const quand = DETECTIVE_BANK.find(q => q.id === 'quand_01')!;
const qui = DETECTIVE_BANK.find(q => q.id === 'qui_01')!;

describe('judgeAnswer', () => {
  it('accepts the model, a variant, and a missing accent', () => {
    expect(judgeAnswer('à Paris', ou).verdict).toBe('right');
    expect(judgeAnswer('Paris', ou).verdict).toBe('right');
    expect(judgeAnswer('a paris', ou).verdict).toBe('right');
  });

  it('treats a leading article as optional', () => {
    expect(judgeAnswer('Paris', ou).verdict).toBe('right');
    expect(judgeAnswer('mon ami', qui).verdict).toBe('right');
    expect(judgeAnswer('ami', qui).verdict).toBe('right');
  });

  it('counts one typo as almost', () => {
    expect(judgeAnswer('demqin', quand).verdict).toBe('almost');
  });

  it('names a mix-up when the answer belongs to another word', () => {
    const result = judgeAnswer('demain', ou);
    expect(result.verdict).toBe('mixup');
    expect(result.givenWord).toBe('quand');
    expect(mixupKey(ou.wordId, 'quand')).toBe('ou|quand');
  });

  it('is a miss for an unknown string', () => {
    expect(judgeAnswer('banane magique', ou).verdict).toBe('miss');
  });
});
