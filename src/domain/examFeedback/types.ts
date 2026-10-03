/**
 * Output types of the post-marking exam report (Phase 3 Batch A, ADR 0009).
 *
 * No field holds a mark, band, grade, score or total — the marks live only in
 * the ScoringEnvelope this report is generated from, and are rendered from
 * there. `errorIndex` is an index into the envelope's QoL error list, not a
 * number about the candidate's performance. Enforced by the type test in
 * __tests__/types.test.ts.
 */

import type { ErrorCategory } from './shared/errorCategories';

/** A claim about the candidate, grounded verbatim in ONE turn (`ref`) of their own transcript. */
export interface ExamFeedbackClaim {
  /** English, written for this candidate — never a copied descriptor. */
  claim: string;
  /** Verbatim from the candidate's answer in `ref`. */
  quote: string;
  /** A role-play task id (e.g. 'rp1') or a topic turn key (e.g. 'topic1:q1'). */
  ref: string;
}

export interface ExamFeedbackNextStep {
  claim: string;
  /** Verbatim from the answer in `ref`, when the step builds on a particular sentence. */
  quote: string | null;
  ref: string | null;
  /**
   * The canonical descriptor bullet this step aims at, verbatim from
   * canonical.ts: a bullet of the band above the awarded one (the awarded
   * band's own bullet at the top band; a mark-2 bullet for role play).
   */
  targetDescriptor: string;
  /** Where the bullet is printed in the Teacher/Examiner Notes (cited by page only). */
  targetSource: 'TN p.10' | 'TN p.11' | 'TN p.12';
}

export interface ExamFeedbackError {
  quote: string;
  correction: string;
  category: ErrorCategory;
}

export interface ExamFeedbackRolePlayTask {
  taskId: string;
  /** Why this task was credited as it was, specific to this task. Null when no reason survived validation. */
  reason: string | null;
  /** Verbatim from this task's response; null for a silent task or when none survived. */
  quote: string | null;
  /** Only on a task credited below the top mark (Table A: errors impede communication). */
  error: ExamFeedbackError | null;
}

/** A QoL error from the envelope: quote and correction copied verbatim, only the category is the model's. */
export interface ExamFeedbackQolError extends ExamFeedbackError {
  /** Index into the envelope's `qualityOfLanguage.errors`. */
  errorIndex: number;
  source: 'topic1' | 'topic2';
  turnId: string;
}

export interface ExamFeedbackReport {
  feedbackVersion: string;
  rolePlay: {
    tasks: ExamFeedbackRolePlayTask[];
    strengths: ExamFeedbackClaim[];
    nextStep: ExamFeedbackNextStep | null;
  };
  communication: {
    strengths: ExamFeedbackClaim[];
    nextStep: ExamFeedbackNextStep | null;
  };
  qualityOfLanguage: {
    strengths: ExamFeedbackClaim[];
    errors: ExamFeedbackQolError[];
    nextStep: ExamFeedbackNextStep | null;
  };
}
