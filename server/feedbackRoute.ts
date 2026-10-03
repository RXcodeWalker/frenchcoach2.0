/**
 * Phase 3 Batch A — the post-marking exam report route (ADR 0009).
 *
 *   POST /feedback {sessionId}
 *     1. auth -> user_id, else 401
 *     2. the session's ORIGINAL envelope for this user (404 if none) — the
 *        report is generated only for an envelope that is already persisted;
 *        the envelope's own transcriptSnapshot is the turn-id transcript
 *     3. a report already stored for that envelope -> 200, no model call
 *     4. consumeAiQuotaOr503(user, 'score', 'feedback:' + sessionId)
 *        (403/429 relayed as-is, anything else 503 — fail closed)
 *     5. generateExamFeedback (one retry inside) -> validated report
 *     6. save -> 200 {report}
 *     Generator failure: the quota grant is released and nothing is stored.
 *
 *   GET /feedback?sessionId=  -> the stored report (200) or 404. Never
 *   generates, never charges.
 *
 * A quota replay (the same 'feedback:' + sessionId key consumed earlier) is
 * not short-circuited here, unlike the FastAPI examiner route: a report that
 * was generated is durably stored and returned at step 3 before the quota is
 * consulted, so a replay can only reach the model when no report exists yet
 * (a crash mid-generation, or a concurrent duplicate request), and each
 * failed generation releases its grant.
 *
 * Dependencies are injected so the handler can be tested without Supabase or
 * a model (server/__tests__/feedbackRoute.test.ts). This route reads the
 * envelope and writes only exam_feedback_reports: it cannot change a mark.
 */

import type { Request, Response } from 'express';
import type { ScoringEnvelope } from '../src/domain/igcse/envelope/types';
import { generateExamFeedback, type ExamFeedbackGenerator } from '../src/domain/examFeedback/generate';
import type { ExamFeedbackReport } from '../src/domain/examFeedback/types';
import type { FeedbackStore } from '../scripts/scoring/supabaseFeedbackStore';
import { QuotaDeniedError } from './aiQuota';

/** The quota feature and key the plan fixes for this route. */
export const FEEDBACK_QUOTA_FEATURE = 'score';
export function feedbackQuotaKey(sessionId: string): string {
  return `feedback:${sessionId}`;
}

export interface FeedbackRouteDeps {
  authenticate(req: Request): Promise<string | null>;
  /** The session's original (not regraded) envelope for this user, or null. */
  loadOriginalEnvelope(userId: string, sessionId: string): Promise<ScoringEnvelope | null>;
  feedbackStore(userId: string): FeedbackStore;
  consumeQuota(userId: string, feature: string, key: string): Promise<unknown>;
  releaseQuota(userId: string, feature: string, key: string): Promise<void>;
  /** A fresh generator per request (providers are fresh-per-attempt, see judgeFactory.ts). */
  createGenerator(): ExamFeedbackGenerator;
}

function sessionIdFrom(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 ? value : null;
}

export function createFeedbackHandlers(deps: FeedbackRouteDeps) {
  async function post(req: Request, res: Response): Promise<void> {
    const userId = await deps.authenticate(req);
    if (!userId) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const sessionId = sessionIdFrom((req.body as { sessionId?: unknown } | undefined)?.sessionId);
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    let envelope: ScoringEnvelope | null;
    let stored: ExamFeedbackReport | null;
    const store = deps.feedbackStore(userId);
    try {
      envelope = await deps.loadOriginalEnvelope(userId, sessionId);
      stored = envelope ? await store.loadByEnvelope(envelope.attemptId) : null;
    } catch (err) {
      console.error(`[POST /feedback] lookup failed for session "${sessionId}":`, err);
      res.status(500).json({ error: 'feedback lookup failed' });
      return;
    }
    if (!envelope) {
      res.status(404).json({ error: 'no envelope for this sessionId' });
      return;
    }
    if (stored) {
      res.status(200).json({ report: stored });
      return;
    }

    const key = feedbackQuotaKey(sessionId);
    try {
      await deps.consumeQuota(userId, FEEDBACK_QUOTA_FEATURE, key);
    } catch (err) {
      if (err instanceof QuotaDeniedError) {
        res.status(err.statusCode).json({ error: err.reason, ...err.data });
        return;
      }
      console.error(`[POST /feedback] quota check failed for session "${sessionId}":`, err);
      res.status(503).json({ error: 'quota_service_unavailable' });
      return;
    }

    let report: ExamFeedbackReport;
    try {
      report = await generateExamFeedback(envelope, deps.createGenerator());
    } catch (err) {
      console.error(
        `[POST /feedback] generation failed for session "${sessionId}":`,
        err instanceof Error ? err.stack ?? err.message : err,
      );
      await deps.releaseQuota(userId, FEEDBACK_QUOTA_FEATURE, key);
      res.status(500).json({ error: 'feedback failed', code: 'feedback_failed' });
      return;
    }

    try {
      const saved = await store.save({ sessionId, envelopeId: envelope.attemptId, report });
      res.status(200).json({ report: saved });
    } catch (err) {
      // The model call happened and was paid for; the grant stays charged. The
      // report is still returned so the candidate sees it; a later POST regenerates.
      console.error(`[POST /feedback] save failed for session "${sessionId}":`, err);
      res.status(200).json({ report });
    }
  }

  async function get(req: Request, res: Response): Promise<void> {
    const userId = await deps.authenticate(req);
    if (!userId) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const sessionId = sessionIdFrom(req.query.sessionId);
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId query param is required' });
      return;
    }
    try {
      const envelope = await deps.loadOriginalEnvelope(userId, sessionId);
      const stored = envelope ? await deps.feedbackStore(userId).loadByEnvelope(envelope.attemptId) : null;
      if (!stored) {
        res.status(404).json({ error: 'no feedback for this sessionId' });
        return;
      }
      res.status(200).json({ report: stored });
    } catch (err) {
      console.error(`[GET /feedback] lookup failed for session "${sessionId}":`, err);
      res.status(500).json({ error: 'feedback lookup failed' });
    }
  }

  return { post, get };
}
