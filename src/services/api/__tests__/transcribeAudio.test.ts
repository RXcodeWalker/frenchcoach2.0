// @vitest-environment jsdom
//
// /api/transcribe client contract (transcription-accuracy plan, Phase 3): the
// context prompt and quota purpose go out as form fields, and the response's
// model and per-segment confidence come back typed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), refreshSession: vi.fn() } },
  supabaseConfigured: true,
}));

import { supabase } from '../../../lib/supabase';
import { transcribeAudio } from '../apiClient';

const getSession = vi.mocked(supabase.auth.getSession);
const BLOB = new Blob(['x'], { type: 'audio/webm' });

function stubFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}), ...response });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  getSession.mockResolvedValue({
    data: { session: { access_token: 'tok', expires_at: Math.floor(Date.now() / 1000) + 3600 } },
    error: null,
  } as never);
});
afterEach(() => vi.unstubAllGlobals());

describe('transcribeAudio', () => {
  it('sends the prompt and purpose as form fields', async () => {
    const fetchMock = stubFetch({ json: async () => ({ text: 'bonjour', source: 'groq-whisper' }) });
    await transcribeAudio(BLOB, 'fr', { prompt: 'Parle-moi de ta famille.\nJ’ai un frère.', purpose: 'learn' });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('prompt')).toBe('Parle-moi de ta famille.\nJ’ai un frère.');
    expect(form.get('purpose')).toBe('learn');
    expect(form.get('language')).toBe('fr');
  });

  it('omits prompt and purpose when none is given (the original request shape)', async () => {
    const fetchMock = stubFetch({ json: async () => ({ text: 'bonjour', source: 'groq-whisper' }) });
    await transcribeAudio(BLOB);
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.has('prompt')).toBe(false);
    expect(form.has('purpose')).toBe(false);
  });

  it('does not send a blank prompt', async () => {
    const fetchMock = stubFetch({ json: async () => ({ text: 'x', source: 'groq-whisper' }) });
    await transcribeAudio(BLOB, 'fr', { prompt: '   ' });
    expect((fetchMock.mock.calls[0][1].body as FormData).has('prompt')).toBe(false);
  });

  it('returns the model and each segment’s confidence fields', async () => {
    stubFetch({
      json: async () => ({
        text: 'Ils ont un chien.',
        source: 'groq-whisper',
        model: 'whisper-large-v3',
        segments: [
          { start: 0, end: 2.1, text: 'Ils ont un chien.', avgLogprob: -0.21, noSpeechProb: 0.02, compressionRatio: 1.1 },
        ],
      }),
    });
    const result = await transcribeAudio(BLOB, 'fr', { purpose: 'learn' });
    expect(result.model).toBe('whisper-large-v3');
    expect(result.segments).toEqual([
      { start: 0, end: 2.1, text: 'Ils ont un chien.', avgLogprob: -0.21, noSpeechProb: 0.02, compressionRatio: 1.1 },
    ]);
  });

  it('stays compatible with an older backend (no model, no segments)', async () => {
    stubFetch({ json: async () => ({ text: 'bonjour', source: 'groq-whisper' }) });
    const result = await transcribeAudio(BLOB);
    expect(result).toEqual({ text: 'bonjour', source: 'groq-whisper', segments: [] });
  });

  it('turns missing or non-numeric confidence into null, never a made-up number', async () => {
    stubFetch({ json: async () => ({ text: 'a', source: 'faster-whisper', segments: [{ text: 'a', avgLogprob: 'high' }] }) });
    const result = await transcribeAudio(BLOB);
    expect(result.segments[0]).toMatchObject({ avgLogprob: null, noSpeechProb: null, compressionRatio: null, start: null });
  });

  it('maps the consent gate’s 403 to ConsentRequiredError, not an expired session', async () => {
    stubFetch({ ok: false, status: 403, json: async () => ({ detail: { error: 'consent_required' } }) });
    await expect(transcribeAudio(BLOB, 'fr', { purpose: 'learn' })).rejects.toMatchObject({ name: 'ConsentRequiredError' });
  });

  it('still treats any other 403 as an auth failure', async () => {
    stubFetch({ ok: false, status: 403, json: async () => ({ detail: 'nope' }) });
    await expect(transcribeAudio(BLOB)).rejects.toMatchObject({ name: 'AuthRequiredError' });
  });

  it('gives up after a caller-supplied timeout', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        })),
      );
      const pending = transcribeAudio(BLOB, 'fr', { timeoutMs: 5000 });
      const assertion = expect(pending).rejects.toThrow(/timed out/);
      await vi.advanceTimersByTimeAsync(5000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
