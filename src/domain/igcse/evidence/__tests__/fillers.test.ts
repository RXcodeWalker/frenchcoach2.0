import { describe, expect, it } from 'vitest';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from './fixtures';
import { countFillers, fillerDensity, fillerDensityByQuestion } from '../fillers';

describe('fillers', () => {
  it('counts euh, ben, alors fillers', () => {
    expect(countFillers('Euh ben alors je commence.')).toBe(3);
  });

  it('computes density as fillers / words', () => {
    const result = fillerDensity('euh je parle ben');
    expect(result.fillerCount).toBe(2);
    expect(result.wordCount).toBe(4);
    expect(result.density).toBe(0.5);
  });

  it('returns zero density on empty response', () => {
    const result = fillerDensity('');
    expect(result.wordCount).toBe(0);
    expect(result.density).toBe(0);
  });
});

describe('fillerDensityByQuestion', () => {
  it('returns per-question filler density rows', () => {
    const rows = fillerDensityByQuestion(EVIDENCE_GOLDEN_TRANSCRIPT);
    const row = rows.find((item) => item.questionId === 'rolePlay:t3');
    expect(row?.fillerCount).toBe(1);
    expect(row?.density).toBeGreaterThan(0);
  });
});
