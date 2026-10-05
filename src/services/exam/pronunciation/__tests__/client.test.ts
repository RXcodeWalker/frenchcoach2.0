/**
 * The exam pronunciation client (plan §3b): one turn per request,
 * sequentially; every backend outcome maps to a state sentence; guests and
 * turns without audio never reach the network.
 */
import { describe, expect, it, vi } from 'vitest';
import type { ConductLogEntry } from '../../../../domain/igcse/session/types';
import { AuthRequiredError } from '../../../../lib/authToken';
import { analysePart, fetchStoredEvidence, type ClientDeps, type PreparedTurnAudio } from '../client';

const candidate = (seq: number, part: 'rolePlay' | 'topic1' | 'topic2', transcript: string, extra: Partial<ConductLogEntry> = {}): ConductLogEntry => ({
  kind: 'candidate', seq, startS: seq, endS: seq + 1, part, questionId: `${part}-q${seq}`, transcript,
  wordCount: transcript.split(' ').length, requestedRepeat: false, relevant: true, ...extra,
} as ConductLogEntry);

const ENTRIES: ConductLogEntry[] = [
  candidate(3, 'topic1', 'Je vais au cinéma'),
  candidate(5, 'topic1', 'Avec mes amis', { inputMode: 'text' } as Partial<ConductLogEntry>), // typed: excluded
  candidate(7, 'topic1', 'Le week-end dernier'),
  candidate(9, 'topic2', 'Demain'),
];

const PREPARED: PreparedTurnAudio = {
  wav: new Blob([new Uint8Array(64)], { type: 'audio/wav' }),
  rawS: 5.25, segments: [{ origStartS: 0.4, origEndS: 4, trimmedStartS: 0 }],
  pausesOver2s: 1, longestPauseS: 2.2, clippedRatio: 0,
};

function evidenceFor(turnKey: string) {
  return { sessionId: 's1', part: 'topic1', turnKey, words: [], couldNotAssess: false };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function deps(responses: Array<Response | Error>, overrides: Partial<ClientDeps> = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    if (next instanceof Error) throw next;
    return next;
  });
  const d: ClientDeps = {
    fetchImpl: fetchImpl as unknown as typeof fetch,
    prepare: vi.fn(async () => PREPARED),
    authHeader: async () => ({ Authorization: 'Bearer t' }),
    getAudio: (_s, k) => (k === 3 || k === 7 || k === 9 ? new Blob(['x']) : undefined),
    ...overrides,
  };
  return { d, calls };
}

const run = (d: ClientDeps, part: 'topic1' | 'topic2' = 'topic1', recognizer: 'webspeech' | 'whisper' = 'webspeech') =>
  analysePart({ sessionId: 's1', part, entries: ENTRIES, recognizer }, d);

describe('analysePart', () => {
  it('posts each speech turn of the part, one at a time, with the measured fields', async () => {
    const { d, calls } = deps([
      json(200, { status: 'done', turn: evidenceFor('3') }),
      json(200, { status: 'done', turn: evidenceFor('7') }),
    ]);
    const onTurn = vi.fn();
    const result = await analysePart({ sessionId: 's1', part: 'topic1', entries: ENTRIES, recognizer: 'whisper', onTurn }, d);
    expect(result.state).toBe('done');
    expect(result.turns.map((t) => [t.turnKey, t.status])).toEqual([[3, 'done'], [7, 'done']]);
    expect(result.turns[0].segments).toEqual(PREPARED.segments);
    expect(onTurn).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toMatch(/\/api\/exam\/pronunciation$/);
    const form = calls[0].init.body as FormData;
    const fields = ['session_id', 'part', 'turn_key', 'exam_transcript', 'fairness_version', 'recognizer', 'raw_s',
      'pauses_over_2s', 'longest_pause_s', 'clipped_ratio'];
    expect(Object.fromEntries(fields.map((k) => [k, form.get(k)]))).toEqual({
      session_id: 's1', part: 'topic1', turn_key: '3', exam_transcript: 'Je vais au cinéma',
      fairness_version: 'exam-pronunciation-fairness-v1', recognizer: 'whisper', raw_s: '5.25',
      pauses_over_2s: '1', longest_pause_s: '2.2', clipped_ratio: '0',
    });
    expect(form.get('audio')).toBeInstanceOf(Blob);
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer t');
  });

  it('a part with no recording is no_audio and makes no request', async () => {
    const { d, calls } = deps([], { getAudio: () => undefined });
    expect((await run(d)).state).toBe('no_audio');
    expect(calls).toHaveLength(0);
  });

  it('a turn without a blob is skipped as no_audio; silence is no_speech; neither is sent', async () => {
    const prepare = vi.fn(async () => 'no_speech' as const);
    const { d, calls } = deps([], { prepare, getAudio: (_s, k) => (k === 7 ? new Blob(['x']) : undefined) });
    const result = await run(d);
    expect(result.state).toBe('done');
    expect(result.turns.map((t) => t.status)).toEqual(['no_audio', 'no_speech']);
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['budget_exhausted', json(200, { status: 'budget_exhausted', turn: null })],
    ['failed', json(200, { status: 'failed', turn: null, reason: 'assessment_failed' })],
    ['daily_cap', json(429, { detail: { error: 'daily_cap_reached' } })],
    ['consent_required', json(403, { detail: { error: 'consent_required' } })],
    ['not_enabled', json(403, { detail: { status: 'not_enabled' } })],
    ['signed_out', json(401, { detail: 'Invalid token' })],
    ['failed', json(422, { detail: 'bad' })],
  ] as const)('maps to %s and stops the part', async (state, response) => {
    const { d, calls } = deps([response]);
    const result = await run(d);
    expect(result.state).toBe(state);
    expect(result.turns).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('keeps turns already done when a later turn fails (a Retry re-sends only the missing ones)', async () => {
    const { d } = deps([json(200, { status: 'done', turn: evidenceFor('3') }), json(200, { status: 'budget_exhausted' })]);
    const result = await run(d);
    expect(result.state).toBe('budget_exhausted');
    expect(result.turns.map((t) => t.turnKey)).toEqual([3]);
  });

  it('retries once after a network error or 5xx (cold start), then fails', async () => {
    const ok = deps([new TypeError('network'), json(200, { status: 'done', turn: evidenceFor('9') })]);
    expect((await run(ok.d, 'topic2')).state).toBe('done');
    expect(ok.calls).toHaveLength(2);

    const bad = deps([json(503, {}), json(502, {})]);
    expect((await run(bad.d, 'topic2')).state).toBe('failed');
    expect(bad.calls).toHaveLength(2);
  });

  it('guests are signed_out without a request', async () => {
    const guest = deps([], { authHeader: async () => ({}) });
    expect((await run(guest.d)).state).toBe('signed_out');
    expect(guest.calls).toHaveLength(0);

    const required = deps([], { authHeader: async () => { throw new AuthRequiredError(); } });
    expect((await run(required.d)).state).toBe('signed_out');
  });

  it('honours the caller abort', async () => {
    const controller = new AbortController();
    controller.abort();
    const { d } = deps([]);
    await expect(
      analysePart({ sessionId: 's1', part: 'topic1', entries: ENTRIES, recognizer: 'webspeech', signal: controller.signal }, d),
    ).rejects.toThrow(/Abort/);
  });
});

describe('fetchStoredEvidence', () => {
  it('reads stored turns without analysing', async () => {
    const { d, calls } = deps([json(200, { sessionId: 's1', assessorVersion: 'v', turns: [evidenceFor('3')] })]);
    const result = await fetchStoredEvidence('s 1', undefined, d);
    expect(result).toEqual({ state: 'done', evidence: [evidenceFor('3')] });
    expect(calls[0].url).toMatch(/\/api\/exam\/pronunciation\?session_id=s%201$/);
    expect(calls[0].init.method).toBeUndefined();
  });

  it('maps not_enabled, signed_out and errors', async () => {
    expect((await fetchStoredEvidence('s1', undefined, deps([json(403, { detail: { status: 'not_enabled' } })]).d)).state).toBe('not_enabled');
    expect((await fetchStoredEvidence('s1', undefined, deps([], { authHeader: async () => ({}) }).d)).state).toBe('signed_out');
    expect((await fetchStoredEvidence('s1', undefined, deps([json(500, {})]).d)).state).toBe('failed');
  });
});
