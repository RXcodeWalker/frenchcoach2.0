import { describe, expect, it } from 'vitest';
import { claimMentionsMarkOrBand } from '../../examFeedback/shared/markClaimFilter';
import { judgeTurns } from '../fairness';
import { buildPatterns, PATTERN_COPY } from '../patterns';
import { bad, ev, turn } from './evidenceFixture';

describe('sound patterns (fairness rule 5)', () => {
  it('a pattern needs at least 2 distinct words', () => {
    const one = judgeTurns([turn(3, [ev('Je'), bad('bon', 10), ev('et'), bad('bon', 12)])]);
    expect(buildPatterns(one)).toEqual([]);
    const two = judgeTurns([turn(3, [ev('Je'), bad('bon', 10), ev('et'), bad('pain', 12)])]);
    expect(buildPatterns(two)).toEqual([
      expect.objectContaining({ category: 'nasalVowel', examples: ['bon', 'pain'], provenance: 'inferred' }),
    ]);
  });

  it('shows at most 3 of the candidate\'s own words and orders patterns by size', () => {
    const verdicts = judgeTurns([
      turn(3, [ev('Je'), bad('bon', 10), ev('et'), bad('pain', 12), ev('et'), bad('vent', 9), ev('et'), bad('lent', 9)]),
      turn(5, [ev('Je'), bad('tout', 10), ev('et'), bad('vous', 10)]),
    ]);
    const patterns = buildPatterns(verdicts);
    expect(patterns.map((p) => p.category)).toEqual(['nasalVowel', 'vowelQuality']);
    expect(patterns[0].examples).toEqual(['bon', 'pain', 'vent']);
    expect(buildPatterns(verdicts, 1)).toHaveLength(1);
  });

  it('suppressed words never form a pattern', () => {
    const verdicts = judgeTurns([turn(3, [ev('Je'), bad('bon', 60), ev('et'), bad('pain', 70)])]);
    expect(buildPatterns(verdicts)).toEqual([]);
  });

  it('pattern copy names no mark, band, grade or score and never calls an accent wrong', () => {
    for (const { label, explanation } of Object.values(PATTERN_COPY)) {
      expect(claimMentionsMarkOrBand(label)).toBe(false);
      expect(claimMentionsMarkOrBand(explanation)).toBe(false);
      expect(`${label} ${explanation}`).not.toMatch(/accent|native|level/i);
    }
  });
});
