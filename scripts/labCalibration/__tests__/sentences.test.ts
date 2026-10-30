import { describe, expect, it } from 'vitest';
import { MINIMAL_PAIRS } from '../../../src/domain/pronunciation/lab/minimalPairs';
import { tokenizeSentence } from '../../../src/domain/pronunciation/lab/textFeatures';
import { normalizeWord } from '../../../src/domain/examPronunciation/fairness';
import { CALIBRATION_SENTENCES } from '../sentences';

const pairKeys = new Set(MINIMAL_PAIRS.map((p) => [...p.words].sort().join('|')));

describe('CALIBRATION_SENTENCES', () => {
  it('is the 20 sentences the plan asks for, with unique ids and texts', () => {
    expect(CALIBRATION_SENTENCES).toHaveLength(20);
    expect(new Set(CALIBRATION_SENTENCES.map((s) => s.id)).size).toBe(20);
    expect(new Set(CALIBRATION_SENTENCES.map((s) => s.sentence)).size).toBe(20);
    CALIBRATION_SENTENCES.forEach((s, i) => expect(s.id).toBe(`s${String(i + 1).padStart(2, '0')}`));
  });

  it.each(CALIBRATION_SENTENCES.map((s) => [s.id, s] as const))('%s: the swapped word is in the sentence and the swap is a real minimal pair', (_id, s) => {
    const tokens = tokenizeSentence(s.sentence);
    const index = tokens.findIndex((t) => t.norm === normalizeWord(s.swapWord));
    expect(index, `${s.swapWord} in "${s.sentence}"`).toBeGreaterThanOrEqual(0);
    expect(pairKeys.has([normalizeWord(s.swapWord), normalizeWord(s.swapTo)].sort().join('|')), `${s.swapWord}/${s.swapTo}`).toBe(true);
    expect(normalizeWord(s.swapWord)).not.toBe(normalizeWord(s.swapTo));
  });

  it('are short enough to read comfortably (5–10 words) and say the swapped word once', () => {
    for (const s of CALIBRATION_SENTENCES) {
      const tokens = tokenizeSentence(s.sentence);
      expect(tokens.length, s.id).toBeGreaterThanOrEqual(5);
      expect(tokens.length, s.id).toBeLessThanOrEqual(10);
      expect(tokens.filter((t) => t.norm === normalizeWord(s.swapWord)), s.id).toHaveLength(1);
    }
  });

  it('cover the minimal-pair families the plan names (vin/vent, tu/tout, dessus/dessous, beau/bon)', () => {
    const swaps = new Set(CALIBRATION_SENTENCES.map((s) => [normalizeWord(s.swapWord), normalizeWord(s.swapTo)].sort().join('|')));
    for (const pair of [['vin', 'vent'], ['tu', 'tout'], ['dessus', 'dessous'], ['beau', 'bon']]) {
      expect(swaps.has(pair.sort().join('|')), pair.join('/')).toBe(true);
    }
  });
});
