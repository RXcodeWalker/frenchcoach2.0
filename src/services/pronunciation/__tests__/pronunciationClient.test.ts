// @vitest-environment jsdom
// Reliability plan §2.5 — assessPronunciation previously accepted no `signal`
// anywhere in the call chain, so Learn.tsx's pronunciationAbortRef.abort()
// did nothing: the underlying fetch kept running regardless.

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));

vi.mock('../../telemetry/telemetryService', () => ({ track: () => {} }));

import { assessPronunciation } from '../pronunciationClient';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('assessPronunciation — caller-supplied signal', () => {
  it('rejects when the caller aborts, without waiting for ASSESS_TIMEOUT_MS', async () => {
    // A fetch that only resolves on its own AbortSignal firing — mirrors a
    // real network request being cancelled mid-flight.
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    }));

    const controller = new AbortController();
    const promise = assessPronunciation({
      audioBlob: new Blob(['fake'], { type: 'audio/webm' }),
      targetText: 'Bonjour',
      source: 'test',
      signal: controller.signal,
    });

    const assertion = expect(promise).rejects.toBeTruthy();
    controller.abort();
    await assertion;
  });
});
