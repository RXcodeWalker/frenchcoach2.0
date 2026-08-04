import { describe, it, expect } from 'vitest';
import { statusForAccuracy } from '../wordStatus';

describe('statusForAccuracy', () => {
  it('returns unknown for null, not good — a skipped word must never render as assessed-and-correct', () => {
    expect(statusForAccuracy(null)).toBe('unknown');
  });

  it('still classifies real scores into perfect/good/missed', () => {
    expect(statusForAccuracy(95)).toBe('perfect');
    expect(statusForAccuracy(90)).toBe('perfect');
    expect(statusForAccuracy(75)).toBe('good');
    expect(statusForAccuracy(60)).toBe('good');
    expect(statusForAccuracy(30)).toBe('missed');
  });
});
