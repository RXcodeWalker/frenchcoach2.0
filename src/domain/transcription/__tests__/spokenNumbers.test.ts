import { describe, expect, it } from 'vitest';
import { cardinalWords, ordinalWords, spokenNumberWords } from '../spokenNumbers';
import { alignRecognisers } from '../alignRecognisers';

describe('cardinalWords', () => {
  it.each([
    [0, 'zéro'], [7, 'sept'], [16, 'seize'], [17, 'dix sept'], [21, 'vingt et un'], [22, 'vingt deux'],
    [71, 'soixante et onze'], [75, 'soixante quinze'], [80, 'quatre vingts'], [81, 'quatre vingt un'],
    [91, 'quatre vingt onze'], [100, 'cent'], [200, 'deux cents'], [201, 'deux cent un'],
    [1000, 'mille'], [2026, 'deux mille vingt six'],
  ])('%i → %s', (n, words) => {
    expect(cardinalWords(n).join(' ')).toBe(words);
  });
});

describe('ordinalWords', () => {
  it.each([[1, 'premier'], [2, 'deuxième'], [4, 'quatrième'], [5, 'cinquième'], [9, 'neuvième'], [21, 'vingt et unième'], [80, 'quatre vingtième']])(
    '%i → %s',
    (n, words) => {
      expect(ordinalWords(n).join(' ')).toBe(words);
    },
  );
});

describe('spokenNumberWords', () => {
  it('reads ordinals and leaves words alone', () => {
    expect(spokenNumberWords('1er')).toEqual([['premier', 'première']]);
    expect(spokenNumberWords('1ère')?.[0][0]).toBe('première');
    expect(spokenNumberWords('3e')).toEqual([['troisième']]);
    expect(spokenNumberWords('premier')).toBeNull();
    expect(spokenNumberWords('10%')).toBeNull();
  });
});

describe('alignRecognisers with spokenNumbers', () => {
  it('does not flag « 1er » against « premier » (owner report 2026-10-31)', () => {
    const a = alignRecognisers("le 1er avantage c'est qu'on peut lire", "le premier avantage c'est qu'on peut lire", { spokenNumbers: true });
    expect(a.spans).toEqual([]);
    expect(a.primaryText).toContain('1er');
  });

  it('does not flag digits against the spoken number, « une » included', () => {
    expect(alignRecognisers("j'ai 15 ans et 1 sœur", "j'ai quinze ans et une sœur", { spokenNumbers: true }).spans).toEqual([]);
    expect(alignRecognisers('à 8h30', 'à huit heures trente', { spokenNumbers: true }).spans).toEqual([]);
  });

  it('still flags a number that was heard differently', () => {
    const a = alignRecognisers("j'ai 15 ans", "j'ai seize ans", { spokenNumbers: true });
    expect(a.spans.map((s) => [s.primaryWords, s.secondaryWords])).toEqual([['15', 'seize']]);
  });

  it('is off by default, so the exam marked text is unchanged', () => {
    expect(alignRecognisers('le 1er avantage', 'le premier avantage').spans).toHaveLength(1);
  });
});
