import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'test-token' } } }) } },
  supabaseConfigured: true,
}));

// Launch limit: one sample exam per rolling 7 days (server/examAllowance.ts).
async function load() {
  vi.resetModules();
  vi.stubEnv('VITE_SCORING_API_URL', 'https://scoring.example');
  return import('../scoringApiClient');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getExamAllowance', () => {
  it('reads GET /exam/allowance with the session token', async () => {
    const { getExamAllowance } = await load();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ allowed: false, lastExamDate: '2026-10-20', nextAvailableAt: '2026-10-27T00:00:00.000Z' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getExamAllowance()).toEqual({ allowed: false, lastExamDate: '2026-10-20', nextAvailableAt: '2026-10-27T00:00:00.000Z' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://scoring.example/exam/allowance');
    expect(init.headers.Authorization).toBe('Bearer test-token');
  });

  it('is null (start allowed; the server still enforces) when it cannot be read', async () => {
    const { getExamAllowance } = await load();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    expect(await getExamAllowance()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await getExamAllowance()).toBeNull();
  });
});

describe('a weekly-limit 429 from POST /score', () => {
  it('is terminal and says when the next exam unlocks', async () => {
    const { submitForScoring, isTerminalScoringStatus, terminalScoringMessage, ScoringApiError } = await load();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: 'weekly_exam_limit', nextAvailableAt: '2026-11-01T00:00:00.000Z' }),
    })));
    const err = await submitForScoring({ sessionId: 's1' } as never).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ScoringApiError);
    const scoringErr = err as InstanceType<typeof ScoringApiError>;
    expect(scoringErr.code).toBe('weekly_exam_limit');
    expect(isTerminalScoringStatus(scoringErr.status)).toBe(true);
    expect(terminalScoringMessage(scoringErr)).toMatch(/one sample exam a week.*next one unlocks on/);
  });

  it('the daily scoring cap has its own message', async () => {
    const { terminalScoringMessage, ScoringApiError } = await load();
    expect(terminalScoringMessage(new ScoringApiError('daily_quota_reached', 429, 'daily_quota_reached'))).toMatch(/today's limit/);
  });
});
