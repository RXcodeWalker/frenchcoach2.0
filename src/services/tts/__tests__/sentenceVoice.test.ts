import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ token: 'tok' as string | null }));
vi.mock('../../../lib/authToken', () => ({ getAccessToken: async () => auth.token }));

import {
  SENTENCE_VOICE_MAX_CHARACTERS,
  requestSentenceRecording,
  resetSentenceVoiceForTests,
} from '../sentenceVoice';

const S = 'Le week-end dernier, je suis allé au cinéma.';
const fetchMock = vi.fn();

function reply(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

beforeEach(() => {
  resetSentenceVoiceForTests();
  auth.token = 'tok';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('requestSentenceRecording', () => {
  it('posts the text with the token and is true when the recording is ready', async () => {
    fetchMock.mockReturnValueOnce(reply(200, { status: 'ready', path: 'v2/henri/x.mp3', cached: false }));
    await expect(requestSentenceRecording(`  ${S} `)).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/native-voice$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ text: S });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('sends no Authorization header for a guest', async () => {
    auth.token = null;
    fetchMock.mockReturnValueOnce(reply(200, { status: 'ready' }));
    await requestSentenceRecording(S);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty('Authorization');
  });

  it('shares one request between concurrent asks for the same text', async () => {
    fetchMock.mockReturnValueOnce(reply(200, { status: 'ready' }));
    const [a, b] = await Promise.all([requestSentenceRecording(S), requestSentenceRecording(S)]);
    expect([a, b]).toEqual([true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never sends empty or over-long text', async () => {
    await expect(requestSentenceRecording('   ')).resolves.toBe(false);
    await expect(requestSentenceRecording('a'.repeat(SENTENCE_VOICE_MAX_CHARACTERS + 1))).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a refused text is not asked for again; other text still is', async () => {
    fetchMock.mockReturnValueOnce(reply(502, { detail: { error: 'native_voice_failed' } }));
    await expect(requestSentenceRecording(S)).resolves.toBe(false);
    await expect(requestSentenceRecording(S)).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockReturnValueOnce(reply(200, { status: 'ready' }));
    await expect(requestSentenceRecording('Bonjour !')).resolves.toBe(true);
  });

  it.each([
    [429, 'daily_limit_reached'],
    [429, 'native_voice_budget_exhausted'],
    [503, 'native_voice_unavailable'],
  ])('%i %s stops every ask for the rest of the page load', async (status, error) => {
    fetchMock.mockReturnValueOnce(reply(status, { detail: { error } }));
    await expect(requestSentenceRecording(S)).resolves.toBe(false);
    await expect(requestSentenceRecording('Bonjour !')).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("Azure's per-minute limit refuses only this ask", async () => {
    fetchMock.mockReturnValueOnce(reply(429, { detail: { error: 'native_voice_busy' } }));
    await expect(requestSentenceRecording(S)).resolves.toBe(false);
    fetchMock.mockReturnValueOnce(reply(200, { status: 'ready' }));
    await expect(requestSentenceRecording(S)).resolves.toBe(true);
  });

  it('a network failure is false and may be retried', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(requestSentenceRecording(S)).resolves.toBe(false);
    fetchMock.mockReturnValueOnce(reply(200, { status: 'ready' }));
    await expect(requestSentenceRecording(S)).resolves.toBe(true);
  });
});
