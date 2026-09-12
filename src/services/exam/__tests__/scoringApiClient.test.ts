import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'test-token' } } }) } },
  supabaseConfigured: true,
}));

import { pollScoreStatus, ScoringApiError } from '../scoringApiClient';

const originalFetch = global.fetch;
const originalEnv = { ...import.meta.env };

afterEach(() => {
  global.fetch = originalFetch;
  Object.assign(import.meta.env, originalEnv);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('pollScoreStatus', () => {
  it('aborts and rejects with ScoringApiError instead of hanging when the request never resolves', async () => {
    (import.meta.env as Record<string, string>).VITE_SCORING_API_URL = 'https://scoring.example';
    vi.useFakeTimers();

    global.fetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }) as unknown as typeof fetch;

    const promise = pollScoreStatus('session-1');
    const assertion = expect(promise).rejects.toBeInstanceOf(ScoringApiError);

    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
  });
});
