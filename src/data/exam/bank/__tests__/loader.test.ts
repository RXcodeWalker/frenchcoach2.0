import { describe, expect, it } from 'vitest';
import { getOriginalQuestionSet, getOfflineQuestionSet, listPublishedQuestionSetIds } from '../loader';

const TIMEOUT = 5000; // covers the loader's FETCH_TIMEOUT_MS bound plus test overhead

describe('getOriginalQuestionSet — backend unreachable in this test environment, exercises the real offline-fallback path', () => {
  it(
    'resolves original-practice-001 from the offline fixture within the bounded timeout (regression: a bare fetch with no AbortSignal previously hung indefinitely against an unreachable backend)',
    async () => {
      const set = await getOriginalQuestionSet('original-practice-001');
      expect(set).toBeDefined();
      expect(set!.questions.length).toBe(15);
      expect(set!.questionSetId).toBe('original-practice-001');
    },
    TIMEOUT,
  );

  it(
    'returns undefined for an unknown id after both the backend and offline registry miss',
    async () => {
      const set = await getOriginalQuestionSet('does-not-exist');
      expect(set).toBeUndefined();
    },
    TIMEOUT,
  );
});

describe('listPublishedQuestionSetIds — backend unreachable in this test environment, exercises the offline-fallback path', () => {
  it(
    'falls back to the offline fixture registry keys when the backend is unreachable',
    async () => {
      const ids = await listPublishedQuestionSetIds();
      expect(ids).toContain('original-practice-001');
    },
    TIMEOUT,
  );
});

describe('getOfflineQuestionSet — synchronous offline-only accessor', () => {
  it('resolves original-practice-001 without any network call', () => {
    const set = getOfflineQuestionSet('original-practice-001');
    expect(set).toBeDefined();
    expect(set!.questions.length).toBe(15);
  });

  it('returns undefined for an unknown id', () => {
    expect(getOfflineQuestionSet('does-not-exist')).toBeUndefined();
  });
});
