import { describe, expect, it } from 'vitest';
import { SOUND_FAMILIES, SCORED_FAMILIES, stableWordFamilies } from '../soundFamilies';
import { soundFeatures } from '../textFeatures';
import { GENERAL_TIP, SOUND_TIPS, tipFor } from '../tips';

describe('SOUND_TIPS', () => {
  it('covers every family', () => {
    expect(Object.keys(SOUND_TIPS).sort()).toEqual([...SOUND_FAMILIES].sort());
  });

  it.each(SOUND_FAMILIES.map((f) => [f]))('%s: short, plain, 4–6 examples, written as the Lab plays them', (family) => {
    const t = SOUND_TIPS[family];
    expect(t.name.length).toBeGreaterThan(0);
    expect(t.tip.length).toBeLessThanOrEqual(200);
    expect(t.tip).not.toMatch(/\b(wrong|bad|mistake|incorrect)\b/i);
    expect(t.tip).not.toMatch(/\d/); // no numbers (owner D5)
    expect(t.examples.length).toBeGreaterThanOrEqual(4);
    expect(t.examples.length).toBeLessThanOrEqual(6);
    for (const text of [...t.examples, ...(t.minimalPair ?? [])]) {
      expect(text).toBe(text.normalize('NFC').toLowerCase().trim());
    }
  });

  it.each(SCORED_FAMILIES.map((f) => [f]))('%s: every example really has the sound (graphemes.ts agrees)', (family) => {
    for (const word of SOUND_TIPS[family].examples) {
      expect({ word, families: stableWordFamilies(word) }).toEqual({ word, families: expect.arrayContaining([family]) });
    }
  });

  it('liaison and elision examples show the feature in the text', () => {
    for (const family of ['liaison', 'elision'] as const) {
      for (const group of SOUND_TIPS[family].examples) {
        expect({ group, has: soundFeatures(group).some((f) => f.family === family) }).toEqual({ group, has: true });
      }
    }
  });
});

describe('tipFor', () => {
  it('never guesses a family', () => {
    expect(tipFor(null, 'enfants')).toBe(GENERAL_TIP);
  });

  it('picks the half of U vs OU the word spells', () => {
    expect(tipFor('uOu', 'tout')).toMatch(/^ou —/);
    expect(tipFor('uOu', 'Où')).toMatch(/^ou —/);
    expect(tipFor('uOu', 'tu')).toMatch(/^u —/);
    expect(tipFor('uOu', '')).toBe(SOUND_TIPS.uOu.tip);
  });

  it('uses the family tip otherwise', () => {
    expect(tipFor('nasalAn', 'enfant')).toBe(SOUND_TIPS.nasalAn.tip);
  });
});
