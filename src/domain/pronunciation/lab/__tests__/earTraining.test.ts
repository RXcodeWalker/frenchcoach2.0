import { describe, expect, it } from 'vitest';
import { EAR_ROUND_SIZE, buildEarRound, earFamilies, pairsFor, roundScoreLine } from '../earTraining';
import { MINIMAL_PAIRS, minimalPairTexts } from '../minimalPairs';

/** A deterministic rng (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('earTraining', () => {
  it('builds a full round from all pairs; every question is a real pair and its answer is one of the options', () => {
    const round = buildEarRound(pairsFor('all'), seeded(1));
    expect(round).toHaveLength(EAR_ROUND_SIZE);
    for (const q of round) {
      expect(q.options).toHaveLength(2);
      expect(q.options).toContain(q.answer);
      expect(minimalPairTexts()).toContain(q.answer);
      expect(MINIMAL_PAIRS.some((p) => p.family === q.family && [...p.words].sort().join() === [...q.options].sort().join())).toBe(true);
    }
  });

  it('asks each pair once before repeating, and never the same pair twice running', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const round = buildEarRound(pairsFor('all'), seeded(seed));
      const keys = round.map((q) => [...q.options].sort().join('|'));
      expect(new Set(keys).size).toBe(keys.length);
    }
    const small = pairsFor('oi');
    expect(small.length).toBe(2);
    for (let seed = 1; seed <= 40; seed++) {
      const round = buildEarRound(small, seeded(seed));
      expect(round).toHaveLength(4);
      const keys = round.map((q) => [...q.options].sort().join('|'));
      keys.slice(1).forEach((k, i) => expect(k).not.toBe(keys[i]));
      // The second time round plays the other word of each pair.
      const played = new Map<string, string[]>();
      round.forEach((q, i) => played.set(keys[i], [...(played.get(keys[i]) ?? []), q.answer]));
      for (const answers of played.values()) expect(new Set(answers).size).toBe(2);
    }
  });

  it('does not always put the answer in the same place, and is reproducible', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const q = buildEarRound(pairsFor('all'), seeded(seed))[0];
      positions.add(q.options.indexOf(q.answer));
    }
    expect(positions.size).toBe(2);
    expect(buildEarRound(pairsFor('all'), seeded(7))).toEqual(buildEarRound(pairsFor('all'), seeded(7)));
  });

  it('handles nothing to ask and a single pair', () => {
    expect(buildEarRound([], seeded(1))).toEqual([]);
    expect(buildEarRound(pairsFor('all'), seeded(1), 0)).toEqual([]);
    expect(buildEarRound(pairsFor('all').slice(0, 1), seeded(1))).toHaveLength(2);
  });

  it('lists the families that have pairs, and filters pairs by family', () => {
    expect(earFamilies()).toContain('uOu');
    expect(earFamilies()).not.toContain('frenchR');
    expect(pairsFor('uOu').every((p) => p.family === 'uOu')).toBe(true);
    expect(pairsFor('frenchR')).toEqual([]);
  });

  it('words the score plainly', () => {
    expect(roundScoreLine(4, 6)).toBe('4 of 6 right');
  });
});
