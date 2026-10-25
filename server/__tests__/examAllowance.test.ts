import { describe, expect, it } from 'vitest';
import { examAllowanceFrom, examGrantId, loadExamGrantDates, windowStart, EXAM_ATTEMPT_FEATURE } from '../examAllowance';

const NOW = new Date('2026-10-25T15:00:00.000Z'); // a Sunday

describe('examAllowanceFrom (one exam per rolling 7 days)', () => {
  it('allows an exam when none is in the last 7 days', () => {
    expect(examAllowanceFrom([], NOW)).toEqual({ allowed: true, lastExamDate: null, nextAvailableAt: null });
    expect(examAllowanceFrom(['2026-10-18'], NOW).allowed).toBe(true); // 7 days ago: the window has moved on
  });

  it('refuses inside the window and says when the next one unlocks', () => {
    expect(examAllowanceFrom(['2026-10-19'], NOW)).toEqual({
      allowed: false,
      lastExamDate: '2026-10-19',
      nextAvailableAt: '2026-10-26T00:00:00.000Z',
    });
    expect(examAllowanceFrom(['2026-10-25'], NOW).nextAvailableAt).toBe('2026-11-01T00:00:00.000Z');
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
