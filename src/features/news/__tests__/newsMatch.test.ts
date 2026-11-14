import { describe, expect, it } from 'vitest';
import { normalizeForMatch, numberToFrench, phraseOccurs, usedPhrase } from '../newsMatch';

describe('numberToFrench', () => {
  it.each([
    [0, 'zero'], [16, 'seize'], [17, 'dix sept'], [21, 'vingt et un'], [70, 'soixante dix'], [71, 'soixante et onze'],
    [80, 'quatre vingts'], [81, 'quatre vingt un'], [99, 'quatre vingt dix neuf'], [140, 'cent quarante'],
    [300, 'trois cents'], [1600, 'mille six cents'], [1982, 'mille neuf cent quatre vingt deux'], [2000, 'deux mille'],
  ])('%i → %s', (n, words) => expect(numberToFrench(n)).toBe(words));
});

describe('normalizeForMatch', () => {
  it('folds case, accents, apostrophes, hyphens and digits', () => {
    expect(normalizeForMatch("L'Hôtel a 3 ruches, quatre-vingts ans !")).toBe('l hotel a trois ruches quatre vingts ans');
    expect(normalizeForMatch('2 000 livres')).toBe('deux mille livres');
  });
});

describe('phraseOccurs', () => {
  it('matches whole words or a declared prefix only', () => {
    expect(phraseOccurs('Les abeilles de Paris', 'paris')).toBe(true);
    expect(phraseOccurs('un parisien', 'paris')).toBe(false);
    expect(phraseOccurs('des toitures', 'toit*')).toBe(true);
    expect(phraseOccurs('le voyage a duré 28 jours', 'vingt huit')).toBe(true);
  });
});

describe('usedPhrase', () => {
  it('counts a plural or another ending of the glossary word', () => {
    expect(usedPhrase("J'ai une ruche sur mon toit", 'ruches')).toBe(true);
    expect(usedPhrase('Je suis apiculteur', 'apiculteur')).toBe(true);
    expect(usedPhrase("C'est l'apiculture urbaine", 'apiculture urbaine')).toBe(true);
    expect(usedPhrase('Le miel est bon', 'ruches')).toBe(false);
  });
  it('never stretches a short word into a prefix', () => {
    expect(usedPhrase('un toiturier', 'toit')).toBe(false);
  });
});
