import { describe, expect, it } from 'vitest';
import { COACHED_EXAM_PATH, examModeFromSearch } from '../examDeepLink';
import { grammarFocusFromParam } from '../../../domain/learn/selection/filters';

describe('coach deep links', () => {
  it('/exam?mode=coached preselects Coached; anything else is Exam Sim', () => {
    expect(COACHED_EXAM_PATH).toBe('/exam?mode=coached');
    expect(examModeFromSearch('?mode=coached')).toBe('coached');
    expect(examModeFromSearch('?assignment=x&mode=coached')).toBe('coached');
    expect(examModeFromSearch('')).toBe('sim');
    expect(examModeFromSearch('?mode=sim')).toBe('sim');
    expect(examModeFromSearch('?mode=COACHED')).toBe('sim');
  });

  it('Learn’s focus param accepts only a real grammar focus', () => {
    expect(grammarFocusFromParam('opinion')).toBe('opinion');
    expect(grammarFocusFromParam('past')).toBe('past');
    expect(grammarFocusFromParam('two-part')).toBeNull();
    expect(grammarFocusFromParam(null)).toBeNull();
  });
});
