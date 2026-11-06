import { describe, expect, it, vi } from 'vitest';
import { examAllowanceFrom, examGrantId, loadExamGrantDates, loadExamPlan, windowStart, EXAM_ATTEMPT_FEATURE } from '../examAllowance';

const NOW = new Date('2026-10-25T15:00:00.000Z'); // a Sunday

describe('examAllowanceFrom (one exam per rolling 7 days)', () => {
  it('allows an exam when none is in the last 7 days', () => {
    expect(examAllowanceFrom([], NOW)).toEqual({ allowed: true, premium: false, lastExamDate: null, nextAvailableAt: null });
    expect(examAllowanceFrom(['2026-10-18'], NOW).allowed).toBe(true); // 7 days ago: the window has moved on
  });

  it('refuses inside the window and says when the next one unlocks', () => {
    expect(examAllowanceFrom(['2026-10-19'], NOW)).toEqual({
      allowed: false,
      premium: false,
      lastExamDate: '2026-10-19',
      nextAvailableAt: '2026-10-25T18:30:00.000Z',
    });
    expect(examAllowanceFrom(['2026-10-25'], NOW).nextAvailableAt).toBe('2026-10-31T18:30:00.000Z');
  });

  it('uses the latest exam in the window', () => {
    expect(examAllowanceFrom(['2026-10-20', '2026-10-22', '2026-10-01'], NOW).lastExamDate).toBe('2026-10-22');
  });

  it('the window is today and the 6 days before it', () => {
    expect(windowStart(NOW)).toBe('2026-10-19');
  });
});

describe('loadExamGrantDates', () => {
  function fakeClient(rows: { id: string; grant_date: string }[], error: unknown = null) {
    const calls: unknown[][] = [];
    const query = {
      select: (...a: unknown[]) => (calls.push(['select', ...a]), query),
      eq: (...a: unknown[]) => (calls.push(['eq', ...a]), query),
      gte: (...a: unknown[]) => (calls.push(['gte', ...a]), Promise.resolve({ data: rows, error })),
    };
    return { client: { from: (table: string) => (calls.push(['from', table]), query) } as never, calls };
  }

  it("reads this account's exam_attempt grants in the window, leaving out this attempt's own", async () => {
    const { client, calls } = fakeClient([
      { id: examGrantId('u1', 'this-session'), grant_date: '2026-10-25' },
      { id: examGrantId('u1', 'older'), grant_date: '2026-10-21' },
    ]);
    expect(await loadExamGrantDates(client, 'u1', NOW, 'this-session')).toEqual(['2026-10-21']);
    expect(calls).toEqual([
      ['from', 'ai_usage_grants'],
      ['select', 'id, grant_date'],
      ['eq', 'user_id', 'u1'],
      ['eq', 'feature', EXAM_ATTEMPT_FEATURE],
      ['gte', 'grant_date', '2026-10-19'],
    ]);
  });

  it('a retry of the same attempt is allowed; a different attempt is not', async () => {
    const { client } = fakeClient([{ id: examGrantId('u1', 's1'), grant_date: '2026-10-25' }]);
    expect(examAllowanceFrom(await loadExamGrantDates(client, 'u1', NOW, 's1'), NOW).allowed).toBe(true);
    expect(examAllowanceFrom(await loadExamGrantDates(client, 'u1', NOW, 's2'), NOW).allowed).toBe(false);
  });

  it('a query error is thrown, never read as allowed', async () => {
    const { client } = fakeClient([], new Error('db down'));
    await expect(loadExamGrantDates(client, 'u1', NOW)).rejects.toThrow('db down');
  });
});

describe('Premium (per India day, no weekly window)', () => {
  const PREMIUM = { premium: true, premiumDailyLimit: 1 };

  it('allows an exam the day after one, which the free rule refuses', () => {
    expect(examAllowanceFrom(['2026-10-24'], NOW).allowed).toBe(false);
    expect(examAllowanceFrom(['2026-10-24'], NOW, PREMIUM)).toEqual({
      allowed: true,
      premium: true,
      lastExamDate: '2026-10-24',
      nextAvailableAt: null,
    });
  });

  it("refuses once today's Premium exams are used, until 00:00 IST tomorrow", () => {
    expect(examAllowanceFrom(['2026-10-25'], NOW, PREMIUM)).toEqual({
      allowed: false,
      premium: true,
      lastExamDate: '2026-10-25',
      nextAvailableAt: '2026-10-25T18:30:00.000Z',
    });
    expect(examAllowanceFrom(['2026-10-25'], NOW, { premium: true, premiumDailyLimit: 2 }).allowed).toBe(true);
  });

  it('a Premium plan with no limit set falls back to the free rule', () => {
    expect(examAllowanceFrom(['2026-10-24'], NOW, { premium: true, premiumDailyLimit: null }).allowed).toBe(false);
  });
});

describe('loadExamPlan', () => {
  function fakeClient(limit: number | null, premium: unknown, errors: { limit?: unknown; rpc?: unknown } = {}) {
    const rpcCalls: unknown[][] = [];
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: () => Promise.resolve({ data: { premium_daily_limit: limit }, error: errors.limit ?? null }),
    };
    const client = {
      from: () => query,
      rpc: (...a: unknown[]) => (rpcCalls.push(a), Promise.resolve({ data: premium, error: errors.rpc ?? null })),
    };
    return { client: client as never, rpcCalls };
  }

  it('is Premium only when the RPC says so', async () => {
    const yes = fakeClient(1, true);
    expect(await loadExamPlan(yes.client, 'u1')).toEqual({ premium: true, premiumDailyLimit: 1 });
    expect(yes.rpcCalls).toEqual([['has_premium', { p_user_id: 'u1' }]]);
    expect(await loadExamPlan(fakeClient(1, false).client, 'u1')).toEqual({ premium: false, premiumDailyLimit: null });
  });

  it('skips the RPC when no Premium limit is configured', async () => {
    const none = fakeClient(null, true);
    expect((await loadExamPlan(none.client, 'u1')).premium).toBe(false);
    expect(none.rpcCalls).toEqual([]);
  });

  it('an error (or a missing column before the migration) applies the stricter free rule, never Premium', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const free = { premium: false, premiumDailyLimit: null };
    expect(await loadExamPlan(fakeClient(1, true, { rpc: new Error('rpc down') }).client, 'u1')).toEqual(free);
    expect(await loadExamPlan(fakeClient(1, true, { limit: new Error('column does not exist') }).client, 'u1')).toEqual(free);
  });
});

describe('the quota day is India time (owner, 2026-11-06)', () => {
  it('an exam at 01:00 IST belongs to that India day, not the UTC day before', () => {
    // 2026-10-26 01:00 IST = 2026-10-25T19:30Z; grant stamped 2026-10-26 by consume_ai_quota
    const now = new Date('2026-10-25T19:30:00.000Z');
    expect(examAllowanceFrom(['2026-10-26'], now).nextAvailableAt).toBe('2026-11-01T18:30:00.000Z');
    expect(examAllowanceFrom(['2026-10-19'], now).allowed).toBe(true);
  });
});
