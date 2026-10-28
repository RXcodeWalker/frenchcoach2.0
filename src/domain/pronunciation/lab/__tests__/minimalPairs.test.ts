import { describe, expect, it } from 'vitest';
import { MINIMAL_PAIRS, minimalPairTexts } from '../minimalPairs';
import { SOUND_FAMILIES } from '../soundFamilies';
import { SOUND_TIPS } from '../tips';

describe('MINIMAL_PAIRS', () => {
  it('is written as the Lab plays it: NFC, lowercase, trimmed, two different strings', () => {
    for (const { words } of MINIMAL_PAIRS) {
      expect(words[0]).not.toBe(words[1]);
      for (const w of words) expect(w).toBe(w.normalize('NFC').toLowerCase().trim());
    }
  });

  it('names a real family and lists no pair twice', () => {
    for (const { family } of MINIMAL_PAIRS) expect(SOUND_FAMILIES).toContain(family);
    const keys = MINIMAL_PAIRS.map((p) => [...p.words].sort().join('|'));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes every pair the sound guide shows, so the guide and the game never disagree", () => {
    const keys = new Set(MINIMAL_PAIRS.map((p) => [...p.words].sort().join('|')));
    for (const [family, tip] of Object.entries(SOUND_TIPS)) {
      if (!tip.minimalPair) continue;
      expect(keys.has([...tip.minimalPair].sort().join('|')), family).toBe(true);
    }
  });

  it('gives the games enough to play (the plan names tu/tout, vin/vent, dessus/dessous, beau/bon)', () => {
    const keys = new Set(MINIMAL_PAIRS.map((p) => [...p.words].sort().join('|')));
    for (const pair of [['tu', 'tout'], ['vin', 'vent'], ['dessus', 'dessous'], ['beau', 'bon']]) {
      expect(keys.has([...pair].sort().join('|')), pair.join('/')).toBe(true);
    }
  });

  it('lists each text once', () => {
    const texts = minimalPairTexts();
    expect(new Set(texts).size).toBe(texts.length);
    expect(texts).toContain('tout');
  });
});
