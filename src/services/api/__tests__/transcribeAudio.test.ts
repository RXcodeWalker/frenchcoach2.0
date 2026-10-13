// @vitest-environment jsdom
//
// Contract of transcribeAudio against backend /api/transcribe (transcription-
// accuracy plan Phases 1 and 3): context prompt and quota purpose go out as
// form fields, segments keep Whisper's confidence signals, and the old
// two-argument call (ExamMode's no-STT fallback) is unchanged.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), refreshSession: vi.fn() } },
  supabaseConfigured: true,
}));

import { supabase } from '../../../lib/supabase';
import { transcribeAudio } from '../apiClient';

const BLOB = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });

function reply(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({ ok, status, json: async () => body, text: async () => '' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'tok', expires_at: Math.floor(Date.now() / 1000) + 3600 } },
    error: null,
  } as never);
});
afterEach(() => vi.unstubAllGlobals());

describe('transcribeAudio', () => {
  it('sends prompt and purpose as form fields and parses model and segment confidence', async () => {
    const fetchMock = reply({
      text: 'Ils ont un chien.',
      source: 'groq-whisper',
      model: 'whisper-large-v3',
      segments: [{ start: 0, end: 2, text: 'Ils ont un chien.', avgLogprob: -0.2, noSpeechProb: 0.01, compressionRatio: 1.1 }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const out = await transcribeAudio(BLOB, 'fr', { prompt: "Avez-vous un animal ?\nJ'aime les chats.", purpose: 'learn' });

    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('prompt')).toBe("Avez-vous un animal ?\nJ'aime les chats.");
    expect(form.get('purpose')).toBe('learn');
    expect(form.get('language')).toBe('fr');
    expect(out.model).toBe('whisper-large-v3');
    expect(out.segments).toEqual([
      { start: 0, end: 2, text: 'Ils ont un chien.', avgLogprob: -0.2, noSpeechProb: 0.01, compressionRatio: 1.1 },
    ]);
  });

  it('keeps the old two-argument call unchanged: no prompt or purpose field, and an older backend reply still parses', async () => {
    const fetchMock = reply({ text: 'bonjour', source: 'groq-whisper', segments: [{ start: 0, end: 1, text: 'bonjour' }] });
    vi.stubGlobal('fetch', fetchMock);

    const out = await transcribeAudio(BLOB);

    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.has('prompt')).toBe(false);
    expect(form.has('purpose')).toBe(false);
    expect(out).toEqual({
      text: 'bonjour',
      source: 'groq-whisper',
      segments: [{ start: 0, end: 1, text: 'bonjour', avgLogprob: null, noSpeechProb: null, compressionRatio: null }],
    });
  });

  it('omits a blank prompt and tolerates a missing segments field', async () => {
    const fetchMock = reply({ text: '', source: 'groq-whisper' });
    vi.stubGlobal('fetch', fetchMock);

    const out = await transcribeAudio(BLOB, 'fr', { prompt: '   ', purpose: 'exam_turn' });

    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.has('prompt')).toBe(false);
    expect(form.get('purpose')).toBe('exam_turn');
    expect(out.segments).toEqual([]);
  });

  it('rejects with a timeout message when the request outlasts timeoutMs', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        'fetch',
        vi.fn((_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
          }),
        ),
      );
      const pending = transcribeAudio(BLOB, 'fr', { timeoutMs: 8000 });
      const assertion = expect(pending).rejects.toThrow(/timed out/i);
      await vi.advanceTimersByTimeAsync(8000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
