import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromSpy = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: fromSpy })),
}));

import { createSupabaseFeedbackStore } from '../supabaseFeedbackStore';
import type { ExamFeedbackReport } from '../../../src/domain/examFeedback/types';

const REPORT: ExamFeedbackReport = {
  feedbackVersion: 'exam-feedback-v0.1',
  rolePlay: { tasks: [], strengths: [], nextStep: null },
  communication: { strengths: [], nextStep: null },
  qualityOfLanguage: { strengths: [], errors: [], nextStep: null },
};

/** A chainable select builder that records every .eq() filter. */
function selectChain(result: { data: unknown; error: unknown }, eqCalls: [string, unknown][]) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return chain;
    }),
    maybeSingle: vi.fn(async () => result),
  };
  return chain;
}

const options = { url: 'http://x', serviceKey: 'k', userId: 'user-1' };

beforeEach(() => fromSpy.mockReset());

describe('createSupabaseFeedbackStore', () => {
  it('loadByEnvelope filters by envelope_id AND the caller user_id', async () => {
    const eqCalls: [string, unknown][] = [];
    fromSpy.mockReturnValue(selectChain({ data: { report: REPORT }, error: null }, eqCalls));
    const report = await createSupabaseFeedbackStore(options).loadByEnvelope('attempt-1');
    expect(report).toEqual(REPORT);
    expect(fromSpy).toHaveBeenCalledWith('exam_feedback_reports');
    expect(eqCalls).toEqual([
      ['envelope_id', 'attempt-1'],
      ['user_id', 'user-1'],
    ]);
  });

  it('loadByEnvelope returns null when no row exists, and rejects a malformed stored report', async () => {
    fromSpy.mockReturnValueOnce(selectChain({ data: null, error: null }, []));
    expect(await createSupabaseFeedbackStore(options).loadByEnvelope('a')).toBeNull();
    fromSpy.mockReturnValueOnce(selectChain({ data: { report: { nope: true } }, error: null }, []));
    await expect(createSupabaseFeedbackStore(options).loadByEnvelope('a')).rejects.toThrow(/not a report/);
  });

  it('save inserts the row with user_id and feedback_version', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    fromSpy.mockReturnValue({ insert });
    const out = await createSupabaseFeedbackStore(options).save({ sessionId: 's1', envelopeId: 'a1', report: REPORT });
    expect(out).toBe(REPORT);
    expect(insert).toHaveBeenCalledWith({
      session_id: 's1',
      envelope_id: 'a1',
      user_id: 'user-1',
      feedback_version: 'exam-feedback-v0.1',
      report: REPORT,
    });
  });

  it('save returns the winning row on a 23505 (lost race)', async () => {
    const winner = { ...REPORT, feedbackVersion: 'winner' };
    fromSpy
      .mockReturnValueOnce({ insert: vi.fn(async () => ({ error: { code: '23505', message: 'dup' } })) })
      .mockReturnValueOnce(selectChain({ data: { report: winner }, error: null }, []));
    const out = await createSupabaseFeedbackStore(options).save({ sessionId: 's1', envelopeId: 'a1', report: REPORT });
    expect(out).toEqual(winner);
  });

  it('save throws on any other insert error', async () => {
    fromSpy.mockReturnValue({ insert: vi.fn(async () => ({ error: { code: '42501', message: 'denied' } })) });
    await expect(
      createSupabaseFeedbackStore(options).save({ sessionId: 's1', envelopeId: 'a1', report: REPORT }),
    ).rejects.toThrow(/denied/);
  });
});
