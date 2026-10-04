// @vitest-environment jsdom
//
// Phase 3 put every AI endpoint behind verify_jwt while guest mode remained a
// supported way into the app. Before this gate, a guest's every answer fired
// /api/feedback/stream and then both /api/feedback/v3 engines, each coming
// back 401 "Missing or invalid Authorization header", before finally landing
// on the offline evaluator anyway.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), refreshSession: vi.fn() } },
  supabaseConfigured: true,
}));

import { supabase } from '../../../lib/supabase';
const getSession = vi.mocked(supabase.auth.getSession);

import { getAIFeedback, streamFeedback } from '../apiClient';
import type { Question } from '../../../types';

const QUESTION = {
  id: 'q-test',
  text: 'Parle-moi de ta famille.',
  topicKey: 'family',
  difficulty: 'intermediate',
  modelAnswer: 'Ma famille est petite.',
  keyVocab: [],
} as unknown as Question;

const TRANSCRIPT = "J'habite avec ma famille dans une grande maison près de Paris.";

describe('signed-out AI calls with guest access disabled', () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    vi.stubEnv('VITE_GUEST_AI_ENABLED', '0'); // sign-in-only mode
  });

  it('getAIFeedback goes straight to offline evaluation without touching the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await getAIFeedback(TRANSCRIPT, QUESTION);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.engineMeta?.actualEngine).toBe('offline');
    expect(result.engineMeta?.failoverReason).toMatch(/sign in/i);
  });

  it('streamFeedback raises AuthRequiredError instead of opening a doomed stream', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      streamFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', new AbortController().signal, { onComplete: vi.fn() }),
    ).rejects.toMatchObject({ name: 'AuthRequiredError' });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('guest AI calls with guest access enabled (default)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('streamFeedback opens the request without an Authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, body: null });
    vi.stubGlobal('fetch', fetchMock);

    await streamFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', new AbortController().signal, { onComplete: vi.fn() }).catch(() => undefined);

    expect(fetchMock).toHaveBeenCalled();
    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('getAIFeedback tries the network instead of short-circuiting to offline', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    await getAIFeedback(TRANSCRIPT, QUESTION);

    expect(fetchMock).toHaveBeenCalled();
  });
});
