// @vitest-environment jsdom
//
// /api/transcribe contract as the client sees it: context prompt and purpose go
// out as form fields, Whisper's segment confidence comes back normalised, and
// the failure modes the exam's background transcriber must tell apart (consent,
// rate limit with Retry-After, timeout, signed out) are distinct error types.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), refreshSession: vi.fn() } },
  supabaseConfigured: true,
}));

import { supabase } from '../../../lib/supabase';
import { ConsentRequiredError } from '../../../lib/consentRequired';
import { TranscribeHttpError, TranscribeTimeoutError, transcribeAudio } from '../apiClient';

const getSession = vi.mocked(supabase.auth.getSession);
const BLOB = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });

function signedIn() {
  getSession.mockResolvedValue({
    data: { session: { access_token: 'tok', expires_at: Math.floor(Date.now() / 1000) + 3600 } },
    error: null,
  } as never);
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });
}

describe('transcribeAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    signedIn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('sends prompt and purpose as form fields only when given, and the prompt is trimmed and capped', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ text: 'Ils ont un chien', source: 'groq-whisper', segments: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await transcribeAudio(BLOB, 'fr', { prompt: `  ${'q'.repeat(1500)}  `, purpose: 'exam_turn' });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect((form.get('prompt') as string).length).toBe(1200);
    expect(form.get('purpose')).toBe('exam_turn');
    expect(form.get('language')).toBe('fr');

    await transcribeAudio(BLOB);
    const plain = fetchMock.mock.calls[1][1].body as FormData;
    expect(plain.has('prompt')).toBe(false);
    expect(plain.has('purpose')).toBe(false);
  });

  it('returns text, source, model and normalised segments (missing confidence becomes null)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          text: 'Ils ont un chien',
          source: 'groq-whisper',
          model: 'whisper-large-v3',
          segments: [
            { start: 0, end: 2.5, text: 'Ils ont un chien', avgLogprob: -0.3, noSpeechProb: 0.02, compressionRatio: 1.1 },
            { start: null, end: 3, text: 'x' },
          ],
        }),
      ),
    );
    const out = await transcribeAudio(BLOB);
    expect(out.model).toBe('whisper-large-v3');
    expect(out.segments).toEqual([
      { startS: 0, endS: 2.5, text: 'Ils ont un chien', avgLogprob: -0.3, noSpeechProb: 0.02, compressionRatio: 1.1 },
      { startS: 0, endS: 3, text: 'x', avgLogprob: null, noSpeechProb: null, compressionRatio: null },
    ]);
  });

  it('stays backward compatible with a backend that sends no segments or model', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ text: 'bonjour', source: 'faster-whisper-phonetic' })));
    const out = await transcribeAudio(BLOB);
    expect(out).toEqual({ text: 'bonjour', source: 'faster-whisper-phonetic', segments: [] });
  });

  it('maps the consent gate\'s 403 to ConsentRequiredError, not a session-expired error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ detail: { error: 'consent_required' } }, { status: 403 })),
    );
    await expect(transcribeAudio(BLOB)).rejects.toBeInstanceOf(ConsentRequiredError);
  });

  it('keeps other 401/403 as AuthRequiredError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'nope' }, { status: 401 })));
    await expect(transcribeAudio(BLOB)).rejects.toMatchObject({ name: 'AuthRequiredError' });
  });

  it('surfaces a 429 with its Retry-After seconds, and without one for a daily cap', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: 'slow down' }, { status: 429, headers: { 'Retry-After': '7' } }))
      .mockResolvedValueOnce(jsonResponse({ detail: { error: 'daily_cap' } }, { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await transcribeAudio(BLOB).catch((e) => e);
    expect(first).toBeInstanceOf(TranscribeHttpError);
    expect(first).toMatchObject({ status: 429, retryAfterS: 7, message: 'API /api/transcribe → 429' });
    const second = await transcribeAudio(BLOB).catch((e) => e);
    expect(second).toMatchObject({ status: 429, retryAfterS: null });
  });

  it('times out as TranscribeTimeoutError but lets the caller\'s own abort through as AbortError', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        }),
      ),
    );

    const timedOut = transcribeAudio(BLOB).catch((e) => e);
    await vi.advanceTimersByTimeAsync(30_001);
    expect(await timedOut).toBeInstanceOf(TranscribeTimeoutError);

    const controller = new AbortController();
    const aborted = transcribeAudio(BLOB, 'fr', { signal: controller.signal }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    const err = await aborted;
    expect(err).not.toBeInstanceOf(TranscribeTimeoutError);
    expect(err).toMatchObject({ name: 'AbortError' });
  });
});
