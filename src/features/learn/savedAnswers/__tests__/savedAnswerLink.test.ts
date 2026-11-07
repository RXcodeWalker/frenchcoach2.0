import { describe, expect, it } from 'vitest';
import { canMarkSavedAnswer, savedAnswerLink } from '../savedAnswerLink';

describe('saved answer links (offline answers and the daily allowance)', () => {
  it('a ready answer is marked from its link; an already-marked one only on an explicit "again"', () => {
    expect(canMarkSavedAnswer('ready', false)).toBe(true);
    expect(canMarkSavedAnswer('marked', false)).toBe(false);
    expect(canMarkSavedAnswer('marked', true)).toBe(true);
    expect(canMarkSavedAnswer('waiting', true)).toBe(false);
    expect(canMarkSavedAnswer('unclear', true)).toBe(false);
  });

  it('builds the links', () => {
    expect(savedAnswerLink('saved-1')).toBe('/learn?saved=saved-1');
    expect(savedAnswerLink('saved-1', true)).toBe('/learn?saved=saved-1&again=1');
  });
});
