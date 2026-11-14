import { describe, expect, it } from 'vitest';
import { factCovered, matchFacts, normalizeForMatch, numberToFrench } from '../matchFacts';
import { NEWS_EDITIONS } from '../../../data/news';

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

describe('matchFacts', () => {
  const fact = { cues: [['abeille*'], ['toit*'], ['paris']] };

  it('needs every cue group, so one keyword never covers a fact', () => {
    expect(factCovered('abeilles', fact)).toBe(false);
    expect(factCovered('abeilles toits', fact)).toBe(false);
    expect(factCovered('Il y a des abeilles sur les toits à Paris', fact)).toBe(true);
  });

  it('matches whole words or declared prefixes only', () => {
    expect(factCovered('parisien abeille toit', fact)).toBe(false);
    expect(factCovered('Les abeilles vivent sur des toitures de Paris', fact)).toBe(true);
  });

  it('treats digits from the recogniser as the spoken number', () => {
    expect(factCovered('le voyage a duré 28 jours', { cues: [['vingt huit'], ['jour*']] })).toBe(true);
  });

  it('a list of the keyword chips alone does not cover the facts of a real story', () => {
    const level = NEWS_EDITIONS.find(e => e.id === 'bees-on-roofs')!.levels.b1;
    const chips = level.glossary.map(g => g.fr).join(' ');
    expect(matchFacts(chips, level.facts).covered.length).toBeLessThan(level.facts.length / 2);
    expect(matchFacts(level.modelRetell, level.facts).missed).toEqual([]);
  });
});
