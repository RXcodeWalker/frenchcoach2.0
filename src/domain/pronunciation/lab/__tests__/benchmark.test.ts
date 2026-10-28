/**
 * The monthly-check sentences are frozen (pronunciation-lab plan §3.3): any
 * change fails here until BENCHMARK_VERSION is bumped and BENCHMARK_HASH
 * updated in the same commit. They must also keep covering every scored sound
 * family, or the check would leave a family out of the picture.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BENCHMARK_HASH, BENCHMARK_SENTENCES, BENCHMARK_VERSION } from '../benchmark';
import { SCORED_FAMILIES, stableWordFamilies } from '../soundFamilies';
import { tokenizeSentence } from '../textFeatures';
import { isRecordableWord } from '../lexicon';

describe('benchmark sentences', () => {
  it('are five distinct sentences', () => {
    expect(BENCHMARK_SENTENCES).toHaveLength(5);
    expect(new Set(BENCHMARK_SENTENCES).size).toBe(5);
  });

  it('match the pinned hash and version', () => {
    expect(BENCHMARK_VERSION).toBe('lab-benchmark-v1');
    const hash = createHash('sha256').update(JSON.stringify(BENCHMARK_SENTENCES)).digest('hex');
    expect(
      hash,
      `BENCHMARK_SENTENCES changed — bump BENCHMARK_VERSION (currently "${BENCHMARK_VERSION}") and update BENCHMARK_HASH`,
    ).toBe(BENCHMARK_HASH);
  });

  it('cover every scored sound family', () => {
    const covered = new Set<string>();
    for (const sentence of BENCHMARK_SENTENCES) {
      const tokens = tokenizeSentence(sentence);
      tokens.forEach((token, i) => {
        const context = { previous: tokens[i - 1]?.norm ?? null, next: tokens[i + 1]?.norm ?? null };
        for (const family of stableWordFamilies(token.norm, context)) covered.add(family);
      });
    }
    const missing = SCORED_FAMILIES.filter((f) => !covered.has(f));
    expect(missing).toEqual([]);
  });

  it('stay short enough for one breath and use only recordable words', () => {
    for (const sentence of BENCHMARK_SENTENCES) {
      const tokens = tokenizeSentence(sentence);
      expect(tokens.length).toBeLessThanOrEqual(12);
      expect(tokens.length).toBeGreaterThanOrEqual(6);
      for (const token of tokens) expect(isRecordableWord(token.norm), token.norm).toBe(true);
    }
  });
});
