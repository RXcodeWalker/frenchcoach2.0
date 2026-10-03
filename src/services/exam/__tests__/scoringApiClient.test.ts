import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'test-token' } } }) } },
  supabaseConfigured: true,
}));

import { pollScoreStatus, ScoringApiError, terminalScoringMessage } from '../scoringApiClient';

const originalFetch = global.fetch;
const originalEnv = { ...import.meta.env };

afterEach(() => {
  global.fetch = originalFetch;
  Object.assign(import.meta.env, originalEnv);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('pollScoreStatus', () => {
  it('aborts and rejects with ScoringApiError instead of hanging when the request never resolves', async () => {
    (import.meta.env as Record<string, string>).VITE_SCORING_API_URL = 'https://scoring.example';
    vi.useFakeTimers();

    global.fetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }) as unknown as typeof fetch;

    const promise = pollScoreStatus('session-1');
    const assertion = expect(promise).rejects.toBeInstanceOf(ScoringApiError);

    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
  });
});

describe('terminalScoringMessage (Batch 3)', () => {
  it('replaces a 409\'s raw hash-mismatch text with plain language', () => {
    const err = new ScoringApiError(
      'Resolved question set "original-practice-001" hash does not match the transcript\'s declared questionSetHash',
      409,
    );
    expect(terminalScoringMessage(err)).toBe(
      "This exam's questions were updated after you took it, so this attempt can't be marked. Please retake the exam.",
    );
  });

  it('leaves every other terminal status\'s message as-is', () => {
    const err = new ScoringApiError('Not authorized', 401);
    expect(terminalScoringMessage(err)).toBe('Not authorized');
  });
});

describe('submitForScoring failure classification (fix step B)', () => {
  // SCORING_API_BASE is read at module load, so stub the env first and load a
  // fresh module instance; use that instance's exports throughout.
  async function loadClient() {
    vi.resetModules();
    vi.stubEnv('VITE_SCORING_API_URL', 'https://scoring.example');
    return import('../scoringApiClient');
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const TRANSCRIPT = { sessionId: 's1' } as unknown as Parameters<
    Awaited<ReturnType<typeof loadClient>>['submitForScoring']
  >[0];

  it('a 500 whose body carries a code is a definitive server failure, with the code kept', async () => {
    const client = await loadClient();
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'scoring failed', code: 'judge_invalid_output' }), { status: 500 }),
    ) as unknown as typeof fetch;

    const err = await client.submitForScoring(TRANSCRIPT).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(client.ScoringApiError);
    expect((err as InstanceType<typeof client.ScoringApiError>).status).toBe(500);
    expect((err as InstanceType<typeof client.ScoringApiError>).code).toBe('judge_invalid_output');
    expect(client.isDefinitiveServerFailure(err)).toBe(true);
    expect(client.isTerminalScoringStatus((err as InstanceType<typeof client.ScoringApiError>).status)).toBe(false);
  });

  it('an uncoded 5xx (e.g. a gateway page) stays ambiguous', async () => {
    const client = await loadClient();
    global.fetch = vi.fn(async () => new Response('<html>Bad Gateway</html>', { status: 502 })) as unknown as typeof fetch;

    const err = await client.submitForScoring(TRANSCRIPT).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(client.ScoringApiError);
    expect(client.isDefinitiveServerFailure(err)).toBe(false);
  });

  it('a network error stays ambiguous', async () => {
    const client = await loadClient();
    global.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    const err = await client.submitForScoring(TRANSCRIPT).catch((e: unknown) => e);
    expect(client.isDefinitiveServerFailure(err)).toBe(false);
  });

  it('a coded 4xx is not a server failure (terminal statuses are handled separately)', async () => {
    const client = await loadClient();
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'nope', code: 'x' }), { status: 409 }),
    ) as unknown as typeof fetch;

    const err = await client.submitForScoring(TRANSCRIPT).catch((e: unknown) => e);
    expect(client.isDefinitiveServerFailure(err)).toBe(false);
    expect(client.isTerminalScoringStatus((err as InstanceType<typeof client.ScoringApiError>).status)).toBe(true);
  });
});

describe('requestExamFeedback (Phase 3 Batch A)', () => {
  async function loadClient() {
    vi.resetModules();
    vi.stubEnv('VITE_SCORING_API_URL', 'https://scoring.example');
    return import('../scoringApiClient');
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const REPORT = {
    feedbackVersion: 'exam-feedback-v0.1',
    rolePlay: { tasks: [], strengths: [], nextStep: null },
    communication: { strengths: [], nextStep: null },
    qualityOfLanguage: { strengths: [], errors: [], nextStep: null },
  };

  it('POSTs {sessionId} with the bearer token to /feedback and returns the report', async () => {
    const client = await loadClient();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ report: REPORT }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(client.requestExamFeedback('s1')).resolves.toEqual(REPORT);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://scoring.example/feedback');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ sessionId: 's1' });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it('a non-200 throws ScoringApiError with status and code', async () => {
    const client = await loadClient();
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'feedback failed', code: 'feedback_failed' }), { status: 500 }),
    ) as unknown as typeof fetch;
    const err = await client.requestExamFeedback('s1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(client.ScoringApiError);
    expect((err as InstanceType<typeof client.ScoringApiError>).status).toBe(500);
    expect((err as InstanceType<typeof client.ScoringApiError>).code).toBe('feedback_failed');
  });

  it('a 200 whose body is not a report is rejected', async () => {
    const client = await loadClient();
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ report: { total: 40 } }), { status: 200 })) as unknown as typeof fetch;
    await expect(client.requestExamFeedback('s1')).rejects.toBeInstanceOf(client.ScoringApiError);
  });
});
