// @vitest-environment jsdom
// Exam-pronunciation plan Batch 2: the client side of the backend's Batch 1
// states on /api/pronunciation.
//   - 403 {"detail": {"error": "consent_required"}} (backend lib/consent.py)
//     raises ConsentRequiredError, never AuthRequiredError ("sign in again").
//   - `azureBudgetExhausted` survives the response schema.
//   - The screen's usage source reaches the backend's Azure ledger.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));

vi.mock('../../telemetry/telemetryService', () => ({ track: () => {} }));

import { assessPronunciation, usageSourceFor } from '../pronunciationClient';
import { PronunciationAssessmentSchema } from '../pronunciationSchema';
import { ConsentRequiredError, isConsentRequiredBody, isConsentRequiredError } from '../../../lib/consentRequired';
import { isAuthRequiredError } from '../../../lib/authToken';

// A WAV-typed blob: the normalizer can't decode it under jsdom, and a WAV
// upload is the one format the provider then sends unchanged.
const wavBlob = () => new Blob(['RIFF....WAVE'], { type: 'audio/wav' });

const HEURISTIC_BUDGET_EXHAUSTED = {
  score: null,
  transcript: 'je suis allé au cinéma',
  issues: [],
  words: [],
  provider: 'whisper-heuristic',
  subScores: null,
  couldNotAssess: true,
  couldNotAssessReason: 'assessment_unavailable',
  mode: 'freeform',
  azureBudgetExhausted: true,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  // The normalizer can't decode under jsdom; its fallback warning is expected.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('consent_required (403)', () => {
  it('raises ConsentRequiredError, not AuthRequiredError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(403, { detail: { error: 'consent_required' } })));
    const err = await assessPronunciation({ audioBlob: wavBlob(), targetText: 'Bonjour', source: 'learn' }).catch(e => e);
    expect(err).toBeInstanceOf(ConsentRequiredError);
    expect(isConsentRequiredError(err)).toBe(true);
    expect(isAuthRequiredError(err)).toBe(false);
  });

  it('keeps any other 403 (e.g. invite not redeemed) on the existing sign-in path', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(403, { detail: { error: 'invite_not_redeemed' } })));
    const err = await assessPronunciation({ audioBlob: wavBlob(), targetText: 'Bonjour', source: 'learn' }).catch(e => e);
    expect(isAuthRequiredError(err)).toBe(true);
    expect(isConsentRequiredError(err)).toBe(false);
  });

  it('keeps a 403 with no JSON body on the existing sign-in path', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Forbidden', { status: 403 })));
    const err = await assessPronunciation({ audioBlob: wavBlob(), targetText: 'Bonjour', source: 'learn' }).catch(e => e);
    expect(isAuthRequiredError(err)).toBe(true);
  });

  it('recognises only the gate body shape', () => {
    expect(isConsentRequiredBody({ detail: { error: 'consent_required' } })).toBe(true);
    expect(isConsentRequiredBody({ detail: 'consent_required' })).toBe(false);
    expect(isConsentRequiredBody({ error: 'consent_required' })).toBe(false);
    expect(isConsentRequiredBody(null)).toBe(false);
  });
});

describe('azureBudgetExhausted', () => {
  it('passes through the client to the caller', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, HEURISTIC_BUDGET_EXHAUSTED)));
    const result = await assessPronunciation({ audioBlob: wavBlob(), targetText: 'x', source: 'learn', mode: 'freeform' });
    expect(result.azureBudgetExhausted).toBe(true);
    expect(result.provider).toBe('whisper-heuristic');
  });

  it('is optional in the schema, and must be a boolean when present', () => {
    const { azureBudgetExhausted: _omit, ...older } = HEURISTIC_BUDGET_EXHAUSTED;
    void _omit;
    const parsedOlder = PronunciationAssessmentSchema.safeParse(older);
    expect(parsedOlder.success).toBe(true);
    expect(parsedOlder.success && parsedOlder.data.azureBudgetExhausted).toBeUndefined();
    expect(PronunciationAssessmentSchema.safeParse({ ...older, azureBudgetExhausted: 'yes' }).success).toBe(false);
  });
});

describe('usage source for the Azure ledger', () => {
  it.each([
    ['learn', 'learn'],
    ['learn_practice', 'learn'],
    ['accent_analyzer', 'lab'],
    ['shadowing', 'shadowing'],
  ])('%s is sent as %s', async (screen, expected) => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { ...HEURISTIC_BUDGET_EXHAUSTED, azureBudgetExhausted: false }));
    vi.stubGlobal('fetch', fetchMock);
    await assessPronunciation({ audioBlob: wavBlob(), targetText: 'x', source: screen });
    const body = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(body.get('source')).toBe(expected);
  });

  it('sends nothing for an unknown screen (the backend infers it)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, HEURISTIC_BUDGET_EXHAUSTED));
    vi.stubGlobal('fetch', fetchMock);
    await assessPronunciation({ audioBlob: wavBlob(), targetText: 'x', source: 'test' });
    const body = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(body.has('source')).toBe(false);
    expect(usageSourceFor('test')).toBeUndefined();
  });
});
