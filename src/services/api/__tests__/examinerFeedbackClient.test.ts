// @vitest-environment jsdom
//
// Phase 3 Batch 0: getExaminerFeedback sends structured fields (never a
// prompt) and the template version it expects; the backend renders the
// prompt and meters the call. A 429 becomes ExaminerQuotaExceededError, and
// AuthRequiredError is rethrown rather than swallowed into "unavailable" (D3),
// so callers can show their signed-out / quota states.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), refreshSession: vi.fn() } },
  supabaseConfigured: true,
}));

import { supabase } from '../../../lib/supabase';
const getSession = vi.mocked(supabase.auth.getSession);

import {
  getExaminerFeedback,
  ExaminerFeedbackUnavailableError,
  ExaminerQuotaExceededError,
} from '../apiClient';
import { EXAMINER_FEEDBACK_PROMPT_VERSION } from '../../coaching/examinerFeedback';
import { isAuthRequiredError } from '../../../lib/authToken';
import type { Question } from '../../../types';

const QUESTION = { text: 'Que fais-tu le weekend ?' } as Question;
const TRANSCRIPT = 'Le weekend je joue au foot avec mes amis.';
const GROUNDED = {
  currentDescriptorCommentary: [{ claim: 'Uses the present tense', quote: 'je joue au foot' }],
  improvementCommentary: [],
};
const UNGROUNDED = {
  currentDescriptorCommentary: [{ claim: 'x', quote: 'not in the transcript' }],
  improvementCommentary: [],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function sentBodies(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown>[] {
  return fetchMock.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)));
}

describe('getExaminerFeedback (server-rendered examiner prompt)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getSession.mockResolvedValue({
      data: { session: { access_token: 'tok', expires_at: Math.floor(Date.now() / 1000) + 3600 } },
      error: null,
    } as never);
  });

  it('Learn sends structured fields with profile learn, the expected version and attempt 1 — no prompt', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(GROUNDED));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getExaminerFeedback(TRANSCRIPT, QUESTION, new AbortController().signal);

    expect(result.currentDescriptorCommentary).toHaveLength(1);
    const [body] = sentBodies(fetchMock);
    expect(body).toEqual({
      feedbackMode: 'examiner',
      profile: 'learn',
      promptVersion: EXAMINER_FEEDBACK_PROMPT_VERSION,
      attempt: 1,
      question: QUESTION.text,
      transcript: TRANSCRIPT,
      turnKind: 'topic',
    });
    expect(body).not.toHaveProperty('prompt');
  });

  it('the rail sends profile rail and its turnKind', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(GROUNDED));
    vi.stubGlobal('fetch', fetchMock);

    await getExaminerFeedback(TRANSCRIPT, QUESTION, new AbortController().signal, {
      profile: 'rail',
      turnKind: 'rolePlay',
    });

    expect(sentBodies(fetchMock)[0]).toMatchObject({ profile: 'rail', turnKind: 'rolePlay' });
  });

  it('the grounding retry is sent as attempt 2', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(UNGROUNDED))
      .mockResolvedValueOnce(jsonResponse(GROUNDED));
    vi.stubGlobal('fetch', fetchMock);

    await getExaminerFeedback(TRANSCRIPT, QUESTION, new AbortController().signal);

    expect(sentBodies(fetchMock).map((b) => b.attempt)).toEqual([1, 2]);
  });

  it('a 429 becomes ExaminerQuotaExceededError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: { error: 'daily_quota_reached' } }, 429)));

    await expect(getExaminerFeedback(TRANSCRIPT, QUESTION, new AbortController().signal)).rejects.toBeInstanceOf(
      ExaminerQuotaExceededError,
    );
  });

  it('a signed-out caller gets AuthRequiredError, not "unavailable", and no request is made', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const err = await getExaminerFeedback(TRANSCRIPT, QUESTION, new AbortController().signal).catch((e) => e);
    expect(isAuthRequiredError(err)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a 401 is rethrown as AuthRequiredError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)));

    const err = await getExaminerFeedback(TRANSCRIPT, QUESTION, new AbortController().signal).catch((e) => e);
    expect(isAuthRequiredError(err)).toBe(true);
  });

  it('any other failure (409 version skew, 502) stays ExaminerFeedbackUnavailableError', async () => {
    for (const status of [409, 422, 502]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, status)));
      await expect(getExaminerFeedback(TRANSCRIPT, QUESTION, new AbortController().signal)).rejects.toBeInstanceOf(
        ExaminerFeedbackUnavailableError,
      );
    }
  });
});
