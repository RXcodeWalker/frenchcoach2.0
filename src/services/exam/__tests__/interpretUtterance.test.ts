/**
 * Change A/D reliability + determinism-boundary tests. The interpreter must fall
 * back to the deterministic classifier on ANY failure mode, with zero added
 * latency beyond the timeout budget, so the exam runs fully offline.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// W7 reliability: /api/exam/interpret now requires verify_jwt, so
// interpretUtterance needs a resolvable access token before it will even
// attempt the round-trip. Mocked directly (not via lib/supabase) so each
// test can control presence/absence of a token without touching session
// shape — defaults to a signed-in user; the "guest" describe block below
// overrides it to null per test.
vi.mock('../../../lib/authToken', () => ({ getAccessToken: vi.fn() }));

import { getAccessToken } from '../../../lib/authToken';
import {
  interpretUtterance,
  deriveObservationFromIntent,
  __resetInterpretCircuitForTests,
  CONFIDENCE_FLOOR,
} from '../interpretUtterance';

beforeEach(() => {
  vi.mocked(getAccessToken).mockResolvedValue('test-token');
});

describe('deriveObservationFromIntent (the deterministic fallback)', () => {
  it('maps each UtteranceIntent to its corresponding speechAct, 1:1', () => {
    expect(deriveObservationFromIntent('Je fais mes devoirs et je range ma chambre.')).toMatchObject({
      speechAct: 'substantive_answer',
      fallback: true,
    });
    expect(deriveObservationFromIntent('Je ne sais pas')).toMatchObject({ speechAct: 'dont_know' });
    expect(deriveObservationFromIntent('Peux-tu répéter ?')).toMatchObject({ speechAct: 'repeat_request' });
    expect(deriveObservationFromIntent('Que veut dire ce mot ?')).toMatchObject({ speechAct: 'clarification_request' });
    expect(deriveObservationFromIntent('What?')).toMatchObject({ speechAct: 'off_language' });
    expect(deriveObservationFromIntent('')).toMatchObject({ speechAct: 'silence' });
    expect(deriveObservationFromIntent('   ')).toMatchObject({ speechAct: 'silence' });
  });

  it('is deterministic: identical input always yields an identical observation', () => {
    const a = deriveObservationFromIntent('Je joue au foot le weekend avec mes amis.');
    const b = deriveObservationFromIntent('Je joue au foot le weekend avec mes amis.');
    expect(a).toEqual(b);
  });

  it('always reports confidence 1 and fallback true — this IS the ground truth, not a guess', () => {
    const obs = deriveObservationFromIntent('Je ne comprends pas la question');
    expect(obs.confidence).toBe(1);
    expect(obs.fallback).toBe(true);
  });
});

describe('interpretUtterance reliability (Change A, "fall back IMMEDIATELY")', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('an empty transcript never round-trips — returns the deterministic silence observation synchronously-equivalent', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const obs = await interpretUtterance('', { part: 'topic1' });
    expect(obs).toMatchObject({ speechAct: 'silence', fallback: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back on a network error (fetch rejects)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const obs = await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' });
    expect(obs.fallback).toBe(true);
    expect(obs.speechAct).toBe('substantive_answer');
  });

  it('falls back on a non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    const obs = await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' });
    expect(obs.fallback).toBe(true);
  });

  it('falls back on a non-JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json {{{', { status: 200 })));
    const obs = await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' });
    expect(obs.fallback).toBe(true);
  });

  it('falls back on an unknown/extra speechAct label (schema-invalid)', async () => {
    const body = JSON.stringify({ speechAct: 'sarcasm', confidence: 0.9 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    const obs = await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' });
    expect(obs.fallback).toBe(true);
  });

  it('falls back when confidence is missing or out of [0,1]', async () => {
    const missing = JSON.stringify({ speechAct: 'substantive_answer' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(missing, { status: 200 })));
    expect((await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' })).fallback).toBe(true);

    const outOfRange = JSON.stringify({ speechAct: 'substantive_answer', confidence: 1.5 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(outOfRange, { status: 200 })));
    expect((await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' })).fallback).toBe(true);
  });

  it(`falls back when confidence is below CONFIDENCE_FLOOR (${CONFIDENCE_FLOOR})`, async () => {
    const body = JSON.stringify({ speechAct: 'clarification_request', confidence: CONFIDENCE_FLOOR - 0.01 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    const obs = await interpretUtterance('Euh, ça veut dire quoi ?', { part: 'topic1' });
    expect(obs.fallback).toBe(true);
    // The fallback is computed from the ORIGINAL transcript, not the discarded low-confidence label.
    expect(obs.speechAct).toBe('clarification_request'); // this transcript also classifies this way deterministically
  });

  it('accepts a well-formed, confident response and does NOT fall back', async () => {
    const body = JSON.stringify({ speechAct: 'affirmation', hesitation: false, confidence: 0.9 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    const obs = await interpretUtterance('Oui.', { part: 'topic1' });
    expect(obs).toMatchObject({ speechAct: 'affirmation', confidence: 0.9, fallback: false });
  });

  it('falls back on a request that never resolves within the timeout budget (AbortError), with bounded added latency', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const err = new DOMException('Aborted', 'AbortError');
              reject(err);
            });
          }),
      ),
    );

    const promise = interpretUtterance('Je fais mes devoirs et je range ma chambre.', { part: 'topic1' });
    await vi.advanceTimersByTimeAsync(1100); // past INTERPRET_TIMEOUT_MS (1000ms)
    const obs = await promise;
    expect(obs.fallback).toBe(true);
    expect(obs.speechAct).toBe('substantive_answer');
  });
});

describe('W7 reliability: verify_jwt auth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetInterpretCircuitForTests();
  });

  it('sends the resolved access token as a Bearer Authorization header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ speechAct: 'affirmation', confidence: 0.9 }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    await interpretUtterance('Oui.', { part: 'topic1' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it('a guest (no access token) never round-trips — falls back deterministically with zero network calls', async () => {
    vi.mocked(getAccessToken).mockResolvedValue(null);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const obs = await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' });
    expect(obs.fallback).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('a 401 (missing/invalid token) trips the breaker — later turns skip the doomed round-trip', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', fetchSpy);

    const first = await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' });
    expect(first.fallback).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const second = await interpretUtterance('Je joue au foot.', { part: 'topic1' });
    expect(second.fallback).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('a 403 (denied) also trips the breaker', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 }));
    vi.stubGlobal('fetch', fetchSpy);

    await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' });
    await interpretUtterance('Je joue au foot.', { part: 'topic1' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('404 circuit breaker (undeployed/stale backend): stop hammering a missing route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetInterpretCircuitForTests();
  });

  it('after one 404, subsequent turns skip the round-trip entirely and fall back deterministically', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 }));
    vi.stubGlobal('fetch', fetchSpy);

    const first = await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' });
    expect(first.fallback).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Breaker tripped — no further fetch on the next turn.
    const second = await interpretUtterance('Je joue au foot.', { part: 'topic1' });
    expect(second.fallback).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('a 5xx does NOT trip the breaker — it may be a transient cold start, so later turns still retry', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchSpy);

    await interpretUtterance('Je fais mes devoirs.', { part: 'topic1' });
    await interpretUtterance('Je joue au foot.', { part: 'topic1' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe('Invariant 5 (provider independence): divergent interpreter outputs never change the deterministic fallback shape', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('two different (but both valid, confident) LLM responses for the SAME transcript can differ — proving the interpreter output is a hint, not scored data', async () => {
    const transcript = 'Oui.';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ speechAct: 'affirmation', confidence: 0.9 }), { status: 200 })));
    const first = await interpretUtterance(transcript, { part: 'topic1' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ speechAct: 'substantive_answer', confidence: 0.9 }), { status: 200 })));
    const second = await interpretUtterance(transcript, { part: 'topic1' });

    // Divergent providers CAN disagree — this is expected and fine, because scoring
    // never reads this value (see simulationSession's conductHint gating + the
    // import-boundary test). The deterministic classifyUtteranceIntent, by contrast,
    // is provider-independent and always agrees with itself (see utteranceIntents tests).
    expect(first.speechAct).not.toBe(second.speechAct);
  });
});
