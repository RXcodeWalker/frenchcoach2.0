/**
 * Phase 3 Batch A: POST/GET /feedback with injected dependencies — no
 * Supabase, no model. Covers the plan's cases: a stored report is returned
 * without a model call; the quota key is `feedback:{sessionId}` on 'score';
 * no envelope -> 404; generator failure -> grant released, nothing stored.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createFeedbackHandlers, type FeedbackRouteDeps } from '../feedbackRoute';
import { QuotaDeniedError } from '../aiQuota';
import { buildFixtureEnvelope, validReply } from '../../src/domain/examFeedback/__tests__/envelopeFixture';
import type { ExamFeedbackReport } from '../../src/domain/examFeedback/types';
import type { FeedbackStore } from '../../scripts/scoring/supabaseFeedbackStore';

function fakeRes() {
  const res = { statusCode: 0, body: undefined as unknown } as { statusCode: number; body: unknown } & Partial<Response>;
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  });
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  });
  return res;
}

function setup(overrides: Partial<FeedbackRouteDeps> = {}, storedReport: ExamFeedbackReport | null = null) {
  const envelope = buildFixtureEnvelope();
  const saved: ExamFeedbackReport[] = [];
  const store: FeedbackStore = {
    loadByEnvelope: vi.fn(async () => storedReport),
    save: vi.fn(async ({ report }) => {
      saved.push(report);
      return report;
    }),
  };
  const generator = vi.fn(async () => JSON.stringify(validReply()));
  const deps: FeedbackRouteDeps = {
    authenticate: vi.fn(async () => 'user-1'),
    loadOriginalEnvelope: vi.fn(async () => envelope),
    feedbackStore: vi.fn(() => store),
    consumeQuota: vi.fn(async () => ({ granted: true })),
    releaseQuota: vi.fn(async () => undefined),
    createGenerator: vi.fn(() => generator),
    ...overrides,
  };
  return { deps, store, saved, generator, envelope, handlers: createFeedbackHandlers(deps) };
}

const postReq = (sessionId: unknown = 'session-feedback-1') => ({ body: { sessionId }, headers: {} }) as unknown as Request;
const getReq = (sessionId: unknown = 'session-feedback-1') => ({ query: { sessionId }, headers: {} }) as unknown as Request;

describe('POST /feedback', () => {
  it('401 without a user, before any lookup', async () => {
    const { deps, handlers } = setup({ authenticate: vi.fn(async () => null) });
    const res = fakeRes();
    await handlers.post(postReq(), res as Response);
    expect(res.statusCode).toBe(401);
    expect(deps.loadOriginalEnvelope).not.toHaveBeenCalled();
  });

  it('400 without a sessionId', async () => {
    const { handlers } = setup();
    const res = fakeRes();
    await handlers.post(postReq(''), res as Response);
    expect(res.statusCode).toBe(400);
  });

  it('404 when the session has no envelope — no quota, no model', async () => {
    const { deps, generator, handlers } = setup({ loadOriginalEnvelope: vi.fn(async () => null) });
    const res = fakeRes();
    await handlers.post(postReq(), res as Response);
    expect(res.statusCode).toBe(404);
    expect(deps.consumeQuota).not.toHaveBeenCalled();
    expect(generator).not.toHaveBeenCalled();
  });

  it('returns a stored report without charging or calling the model', async () => {
    const stored = { feedbackVersion: 'exam-feedback-v0.1' } as ExamFeedbackReport;
    const { deps, generator, handlers } = setup({}, stored);
    const res = fakeRes();
    await handlers.post(postReq(), res as Response);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ report: stored });
    expect(deps.consumeQuota).not.toHaveBeenCalled();
    expect(generator).not.toHaveBeenCalled();
  });

  it('charges score with key feedback:{sessionId}, generates, saves and returns the report', async () => {
    const { deps, store, saved, generator, envelope, handlers } = setup();
    const res = fakeRes();
    await handlers.post(postReq(), res as Response);
    expect(deps.consumeQuota).toHaveBeenCalledWith('user-1', 'score', 'feedback:session-feedback-1');
    expect(generator).toHaveBeenCalledTimes(1);
    expect(store.save).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'session-feedback-1', envelopeId: envelope.attemptId }));
    expect(res.statusCode).toBe(200);
    expect((res.body as { report: ExamFeedbackReport }).report).toBe(saved[0]);
    expect(deps.releaseQuota).not.toHaveBeenCalled();
  });

  it('relays a quota denial without calling the model', async () => {
    const { generator, handlers } = setup({
      consumeQuota: vi.fn(async () => {
        throw new QuotaDeniedError(429, 'daily_limit_reached', { used: 20, limit: 20 });
      }),
    });
    const res = fakeRes();
    await handlers.post(postReq(), res as Response);
    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({ error: 'daily_limit_reached' });
    expect(generator).not.toHaveBeenCalled();
  });

  it('503s (fail closed) when the quota service is unavailable', async () => {
    const { generator, handlers } = setup({
      consumeQuota: vi.fn(async () => {
        throw new Error('rpc down');
      }),
    });
    const res = fakeRes();
    await handlers.post(postReq(), res as Response);
    expect(res.statusCode).toBe(503);
    expect(generator).not.toHaveBeenCalled();
  });

  it('generator failure releases the grant and stores nothing', async () => {
    const failing = vi.fn(async () => {
      throw new Error('provider down');
    });
    const { deps, store, handlers } = setup({ createGenerator: vi.fn(() => failing) });
    const res = fakeRes();
    await handlers.post(postReq(), res as Response);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ code: 'feedback_failed' });
    expect(deps.releaseQuota).toHaveBeenCalledWith('user-1', 'score', 'feedback:session-feedback-1');
    expect(store.save).not.toHaveBeenCalled();
  });

  it('two unusable replies (after the one retry) also release the grant and store nothing', async () => {
    const junk = vi.fn(async () => 'not json');
    const { deps, store, handlers } = setup({ createGenerator: vi.fn(() => junk) });
    const res = fakeRes();
    await handlers.post(postReq(), res as Response);
    expect(junk).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(500);
    expect(deps.releaseQuota).toHaveBeenCalledTimes(1);
    expect(store.save).not.toHaveBeenCalled();
  });
});

describe('GET /feedback', () => {
  it('returns the stored report', async () => {
    const stored = { feedbackVersion: 'exam-feedback-v0.1' } as ExamFeedbackReport;
    const { deps, generator, handlers } = setup({}, stored);
    const res = fakeRes();
    await handlers.get(getReq(), res as Response);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ report: stored });
    expect(deps.consumeQuota).not.toHaveBeenCalled();
    expect(generator).not.toHaveBeenCalled();
  });

  it('404 when nothing is stored — never generates', async () => {
    const { deps, generator, handlers } = setup();
    const res = fakeRes();
    await handlers.get(getReq(), res as Response);
    expect(res.statusCode).toBe(404);
    expect(deps.consumeQuota).not.toHaveBeenCalled();
    expect(generator).not.toHaveBeenCalled();
  });

  it('401 without a user', async () => {
    const { handlers } = setup({ authenticate: vi.fn(async () => null) });
    const res = fakeRes();
    await handlers.get(getReq(), res as Response);
    expect(res.statusCode).toBe(401);
  });
});
