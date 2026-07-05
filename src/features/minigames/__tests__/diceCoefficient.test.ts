import { describe, it, expect } from 'vitest';
import { diceCoefficient } from '../utils/diceCoefficient';

describe('diceCoefficient', () => {
  it('returns 1 for identical strings with length >= 2', () => {
    expect(diceCoefficient('bonjour', 'bonjour')).toBe(1);
  });

  it('returns 1 for identical single-char strings', () => {
    expect(diceCoefficient('a', 'a')).toBe(1);
  });

  it('returns 0 for single-char mismatch', () => {
    expect(diceCoefficient('a', 'b')).toBe(0);
  });

  it('returns 0 for strings shorter than 2 that differ', () => {
    expect(diceCoefficient('a', 'ab')).toBe(0);
  });

  it('scores partial overlap between similar words', () => {
    const score = diceCoefficient('manger', 'mange');
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(diceCoefficient('abc', 'xyz')).toBe(0);
  });
});
