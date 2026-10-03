/**
 * Phase 3 Batch A — Supabase store for the post-marking exam report
 * (`exam_feedback_reports`, backend migration 20261003101119). Service key
 * only: the table has RLS on and no policies, so — exactly like
 * supabaseEnvelopeStore.ts's server path — every read here filters
 * `user_id = options.userId` (the JWT-verified caller), which is the only
 * owner-enforcement point.
 *
 * This file is part of the feedback surface, not the scoring pipeline: it is
 * imported by server/feedbackRoute.ts only, never by scoreAttempt.ts or the
 * /score handler (ADR 0009, scoredPipelineBoundary.test.ts). It reads and
 * writes reports; it never touches scoring_envelopes.
 *
 * save() is race-safe: envelope_id is unique, so a concurrent writer that lost
 * gets a 23505, loads the winning row and returns it instead of throwing.
 */

import { createClient } from '@supabase/supabase-js';
import { isExamFeedbackReport } from '../../src/domain/examFeedback/schema';
import type { ExamFeedbackReport } from '../../src/domain/examFeedback/types';

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505';

export interface SupabaseFeedbackStoreOptions {
  url: string;
  serviceKey: string;
  /** JWT-verified caller; every read and write is scoped to it. */
  userId: string;
}

export interface FeedbackStore {
  /** The stored report for this envelope (attempt id), or null. */
  loadByEnvelope(envelopeId: string): Promise<ExamFeedbackReport | null>;
  /** Stores the report; on a lost race returns the row that won. */
  save(input: { sessionId: string; envelopeId: string; report: ExamFeedbackReport }): Promise<ExamFeedbackReport>;
}

export function createSupabaseFeedbackStore(options: SupabaseFeedbackStoreOptions): FeedbackStore {
  const client = createClient(options.url, options.serviceKey);

  async function loadByEnvelope(envelopeId: string): Promise<ExamFeedbackReport | null> {
    const { data, error } = await client
      .from('exam_feedback_reports')
      .select('report')
      .eq('envelope_id', envelopeId)
      .eq('user_id', options.userId)
      .maybeSingle();
    if (error) throw new Error(`SupabaseFeedbackStore.loadByEnvelope failed for "${envelopeId}": ${error.message}`);
    if (!data) return null;
    if (!isExamFeedbackReport(data.report)) {
      throw new Error(`SupabaseFeedbackStore.loadByEnvelope: stored report for "${envelopeId}" is not a report`);
    }
    return data.report;
  }

  return {
    loadByEnvelope,
    async save({ sessionId, envelopeId, report }) {
      const { error } = await client.from('exam_feedback_reports').insert({
        session_id: sessionId,
        envelope_id: envelopeId,
        user_id: options.userId,
        feedback_version: report.feedbackVersion,
        report,
      });
      if (!error) return report;
      if (error.code !== UNIQUE_VIOLATION) {
        throw new Error(`SupabaseFeedbackStore.save failed for "${envelopeId}": ${error.message}`);
      }
      const winner = await loadByEnvelope(envelopeId);
      if (!winner) {
        throw new Error(`SupabaseFeedbackStore.save: lost the write race for "${envelopeId}" but found no row for this user`);
      }
      return winner;
    },
  };
}
