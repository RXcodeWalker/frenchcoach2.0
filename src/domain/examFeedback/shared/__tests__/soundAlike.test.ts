import { describe, it, expect } from 'vitest';
import { isCorrectionIdentical, isSoundAlike, shouldDropSpellingOnlyError } from '../spellingOnly';

const DROPPED_WHEN_SPOKEN: [string, string][] = [
  ['prefere', 'préfère'],
  ['a la', 'à la'],
  ['chose', 'choses'],
  ['au jeux', 'aux jeux'],
  ['ou', 'où'],
  ["j'ai mange", "j'ai mange"],
];

const KEPT_WHEN_SPOKEN: [string, string][] = [
  ["j'ai mange", "j'ai mangé"],
  ['petit', 'petite'],
  ['il mange', 'ils mangent'],
  ['le chat', 'les chats'],
  ['je fais', 'je fait'],
  ['mange', 'mangée'],
  ['préféré', 'préfère'],
];

describe('sound-alike filter — spoken turns', () => {
  it.each(DROPPED_WHEN_SPOKEN)('drops %s → %s', (quote, correction) => {
    expect(shouldDropSpellingOnlyError(quote, correction, 'speech')).toBe(true);
  });

  it.each(KEPT_WHEN_SPOKEN)('keeps %s → %s', (quote, correction) => {
    expect(shouldDropSpellingOnlyError(quote, correction, 'speech')).toBe(false);
  });
});

describe('sound-alike filter — typed turns keep every spelling error', () => {
  it.each(DROPPED_WHEN_SPOKEN.filter(([q, c]) => !isCorrectionIdentical(q, c)))(
    'keeps %s → %s when typed',
    (quote, correction) => {
      expect(shouldDropSpellingOnlyError(quote, correction, 'text')).toBe(false);
    },
  );

  it.each(KEPT_WHEN_SPOKEN)('keeps %s → %s when typed', (quote, correction) => {
    expect(shouldDropSpellingOnlyError(quote, correction, 'text')).toBe(false);
  });

  it('an unknown input mode is treated as typed', () => {
    expect(shouldDropSpellingOnlyError('chose', 'choses', undefined)).toBe(false);
  });
});

describe('correction equal to the quote', () => {
  it('is always dropped, spoken or typed', () => {
    for (const mode of ['speech', 'text', undefined] as const) {
      expect(shouldDropSpellingOnlyError("je joue au foot", "Je joue au foot.", mode)).toBe(true);
    }
  });
});

describe('isSoundAlike building blocks', () => {
  it('folds case and punctuation', () => {
    expect(isSoundAlike('Je Prefere,', 'je préfère')).toBe(true);
  });

  it('a different word count is never sound-alike', () => {
    expect(isSoundAlike('jai', "j'ai")).toBe(false);
  });

  it('an empty quote is never sound-alike', () => {
    expect(isSoundAlike('', '')).toBe(false);
  });
});
