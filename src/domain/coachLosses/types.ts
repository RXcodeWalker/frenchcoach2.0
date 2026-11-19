// ── Why marks were lost: the coach's read-only view of a marked exam ─────────────
//
// The coach used to know only the three area totals of an Exam Sim. This module
// reads the REASONS an attempt fell short, from what the scoring service already
// persisted for the learner: the envelope view (per-criterion marks and the QoL
// error list) and the post-marking report (which role-play tasks had errors, the
// categories of the QoL errors, and the band-above descriptor each next step aims
// at). It is read-only: it never computes, changes or re-derives a mark
// (ADR 0009), and it lives outside src/domain/igcse/ and imports nothing from
// the scored pipeline but types and the frozen descriptor strings.
//
// A reason is a CODE plus counts and a marks figure — never a quote, transcript
// or sentence of the learner's, so it is safe to keep on the device.

import type { CoachExamAreaKey } from '../coachOutcomes/types';
import type { ErrorCategory } from '../examFeedback/shared/errorCategories';

export type LossReasonCode =
  // Role play (Table A, TN p.10): a task credited less than its 2 marks.
  | 'rp_silent'
  | 'rp_errors_impede'
  | 'rp_partly_communicated'
  | 'rp_below_full'
  // Communication (TN p.11): the band-above bullet the report's next step aimed at.
  | 'comm_responds'
  | 'comm_relevant'
  | 'comm_develop'
  | 'comm_justify'
  | 'comm_below_top'
  // Quality of language (TN p.12).
  | 'qol_errors'
  | 'qol_structures'
  | 'qol_vocabulary'
  | 'qol_fluency'
  | 'qol_below_top';

export interface LossReason {
  code: LossReasonCode;
  area: CoachExamAreaKey;
  /**
   * Marks the area (or, for role play, the affected tasks) sat below their
   * maximum. Used only to RANK reasons — it is not a claim that this reason alone
   * cost that many marks.
   */
  marksBelowMax: number;
  /** The mark and maximum those marks were measured against (the area's, or the affected tasks' summed). */
  mark: number;
  max: number;
  /** Role play: tasks affected. qol_errors: errors in `category` (or in total when uncategorised). */
  count: number;
  /** qol_errors only: the most common category among the report's errors, when a report was available. */
  category?: ErrorCategory;
  /** qol_errors only: all errors the envelope listed. */
  total?: number;
}

/** One marked attempt's reasons, keyed by the scoring session id (`Session.scoringSessionId`). */
export interface ExamLossRecord {
  sessionId: string;
  /** ISO time the envelope was scored. */
  scoredAt: string;
  /** False when derived from the envelope alone (no post-marking report). */
  hasReport: boolean;
  reasons: LossReason[];
}

export interface ExamLossStore {
  version: number;
  /** Newest first; capped (store.ts). */
  records: ExamLossRecord[];
}
