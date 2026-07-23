import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getOriginalQuestionSet,
  getOfflineQuestionSet,
  listPublishedQuestionSetIds,
  listPublishedQuestionSetsWithRetry,
} from '../loader';

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

describe('listPublishedQuestionSetsWithRetry — cold-start retry behavior', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(
    'falls back fast to the fixture, tagged source: "fixture", on a genuine network failure (not a cold start) — stubbed because .env.local points VITE_API_URL at a real, sometimes-reachable backend',
    async () => {
      const originalFetch = global.fetch;
      const rejectingFetch = vi.fn(() => Promise.reject(new TypeError('fetch failed')));
      vi.stubGlobal('fetch', rejectingFetch);

      const start = Date.now();
      const result = await listPublishedQuestionSetsWithRetry();
      const elapsed = Date.now() - start;

      expect(result.source).toBe('fixture');
      expect(result.sets.some((s) => s.questionSetId === 'original-practice-001')).toBe(true);
      // Network failures fail fast (2 attempts) rather than riding out the 45s cold-start budget.
      expect(rejectingFetch.mock.calls.length).toBe(2);
      expect(elapsed).toBeLessThan(10_000);

      vi.stubGlobal('fetch', originalFetch);
    },
    15_000,
  );

  it(
    'retries through repeated timeout-classified failures (the cold-start signature) rather than failing fast, and still resolves to the fixture within the overall budget',
    async () => {
      const originalFetch = global.fetch;
      const abortingFetch = vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new DOMException('The operation was aborted.', 'AbortError');
              reject(err);
            });
          }
        });
      });
      vi.stubGlobal('fetch', abortingFetch);

      const result = await listPublishedQuestionSetsWithRetry();

      expect(result.source).toBe('fixture');
      // A single network-classified fetch would fail fast after 2 attempts;
      // a timeout-classified failure must keep retrying past that.
      expect(abortingFetch.mock.calls.length).toBeGreaterThan(2);

      vi.stubGlobal('fetch', originalFetch);
    },
    60_000,
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
