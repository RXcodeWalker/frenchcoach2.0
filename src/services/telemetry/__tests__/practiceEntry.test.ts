// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { PRACTICE_ENTRY_TTL_MS, consumePracticeEntry, markPracticeEntry } from '../practiceEntry';

const DIRECT = { entry: 'direct', entry_area: null };

describe('practiceEntry — "opened from the exam plan" marker', () => {
  beforeEach(() => sessionStorage.clear());

  it('is direct with no marker', () => {
    expect(consumePracticeEntry('learn')).toEqual(DIRECT);
  });

  it('tags the first matching session once, then clears', () => {
    markPracticeEntry('learn', 'qualityOfLanguage', 1_000);
    expect(consumePracticeEntry('learn', 2_000)).toEqual({ entry: 'exam_plan', entry_area: 'qualityOfLanguage' });
    expect(consumePracticeEntry('learn', 3_000)).toEqual(DIRECT);
  });

  it('a session of the other destination neither takes nor clears it', () => {
    markPracticeEntry('role_play', 'rolePlay', 1_000);
    expect(consumePracticeEntry('learn', 2_000)).toEqual(DIRECT);
    expect(consumePracticeEntry('role_play', 3_000)).toEqual({ entry: 'exam_plan', entry_area: 'rolePlay' });
  });

  it('is ignored and cleared once older than the TTL', () => {
    markPracticeEntry('learn', 'communication', 0);
    expect(consumePracticeEntry('learn', PRACTICE_ENTRY_TTL_MS)).toEqual(DIRECT);
    expect(sessionStorage.length).toBe(0);
  });

  it('ignores a damaged marker', () => {
    sessionStorage.setItem('fc_practiceEntry', '{not json');
    expect(consumePracticeEntry('learn')).toEqual(DIRECT);
    sessionStorage.setItem('fc_practiceEntry', JSON.stringify({ destination: 'learn', area: 'nope', at: Date.now() }));
    expect(consumePracticeEntry('learn')).toEqual(DIRECT);
  });
});
