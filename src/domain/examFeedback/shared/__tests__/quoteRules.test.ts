import { describe, it, expect } from 'vitest';
import {
  fitClaimBudget,
  isGroundedQuote,
  meetsClaimQuoteMinimum,
  meetsErrorQuoteMinimum,
  quotesOverlap,
} from '../quoteRules';

describe('minimum quote length (UNVALIDATED app policy)', () => {
  it('an error quote needs 2+ words or 6+ characters', () => {
    expect(meetsErrorQuoteMinimum('je')).toBe(false);
    expect(meetsErrorQuoteMinimum('le')).toBe(false);
    expect(meetsErrorQuoteMinimum('je fais')).toBe(true);
    expect(meetsErrorQuoteMinimum('prefere')).toBe(true);
    expect(meetsErrorQuoteMinimum('aller')).toBe(false);
  });

  it('a strength or next-step quote needs 3+ words', () => {
    expect(meetsClaimQuoteMinimum('je joue')).toBe(false);
    expect(meetsClaimQuoteMinimum('je joue au foot')).toBe(true);
    expect(meetsClaimQuoteMinimum('«  parce que c\'est  »')).toBe(true);
  });
});

describe('isGroundedQuote', () => {
  it('is verbatim, case- and edge-punctuation-insensitive', () => {
    expect(isGroundedQuote('Je joue au foot', 'Le weekend, je joue au foot avec mes amis.')).toBe(true);
    expect(isGroundedQuote('je joue au tennis', 'Le weekend, je joue au foot avec mes amis.')).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isGroundedQuote(undefined, 'abc')).toBe(false);
    expect(isGroundedQuote(42, 'abc')).toBe(false);
  });
});

describe('quotesOverlap', () => {
  const t = "Hier j'ai mange une pizza et je suis allé au cinéma avec mes amis.";

  it('detects containment', () => {
    expect(quotesOverlap("j'ai mange une pizza", 'mange', t)).toBe(true);
  });

  it('detects a partial overlap', () => {
    expect(quotesOverlap("j'ai mange une", 'une pizza et', t)).toBe(true);
  });

  it('adjacent but disjoint quotes do not overlap', () => {
    expect(quotesOverlap("j'ai mange", 'une pizza', t)).toBe(false);
  });

  it('empty quotes never overlap', () => {
    expect(quotesOverlap('', 'mange', t)).toBe(false);
  });
});

describe('fitClaimBudget', () => {
  it('drops (never truncates) a claim over the per-claim cap', () => {
    const kept = fitClaimBudget(['short claim', 'x'.repeat(161)], 160, 400);
    expect([...kept]).toEqual([0]);
  });

  it('drops later claims once the total would exceed the budget', () => {
    const kept = fitClaimBudget(['a'.repeat(150), 'b'.repeat(150), 'c'.repeat(150)], 160, 400);
    expect([...kept]).toEqual([0, 1]);
  });

  it('drops empty claims', () => {
    expect([...fitClaimBudget(['  ', 'ok'], 160, 400)]).toEqual([1]);
  });
});
