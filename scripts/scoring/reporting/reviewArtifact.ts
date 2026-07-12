/**
 * Merges buildDiffRows() output (S4, untouched) with ReviewStatus (when
 * present) into one row per criterion. Field names (topicArea, responseLength,
 * mark, band) are chosen to align with 02-scoring-pipeline-architecture.md
 * §3.6's future CalibrationAnchor shape wherever they overlap — best-effort
 * alignment only, not a contract (S8 doesn't exist yet; reviewArtifact.ts
 * gets adjusted if S8 lands with different semantics). No anchor storage,
 * selection, or injection logic here — that stays entirely S8's job.
 */

import type { DiffRow } from '../../../src/domain/igcse/comparison/diff';
import type { ReviewStatus } from '../../../src/domain/igcse/comparison/reviewStatus';
import type { EnvelopeView } from './envelopeView';

export interface ReviewArtifactRow {
  sessionId: string;
  attemptId: string;
  criterion: DiffRow['criterion'];
  taskId?: string;
  mark: number;
  band: { min: number; max: number; label: string | null } | null;
  topicArea?: 'A' | 'B' | 'C' | 'D' | 'E';
  responseLength?: 'short' | 'medium' | 'long';
  teacherMark: number | null;
  delta: number | null;
  justification: string;
  quotedEvidence: string[];
  reviewed: boolean;
  reviewer?: string;
  reviewedAt?: string;
  disagreementResolved?: boolean;
  notes?: string;
}

/**
 * Pure. `envelopeView` supplies band/topicArea/responseLength (already
 * computed by buildEnvelopeView) so this function never re-derives evidence.
 * `review` is optional — a session with no review yet still gets one row per
 * diff row, with review fields present-but-empty (never fabricated).
 */
export function buildReviewArtifactRows(
  diffRows: DiffRow[],
  envelopeView: EnvelopeView,
  review?: ReviewStatus,
): ReviewArtifactRow[] {
  return diffRows.map((diffRow) => {
    const criterionView = envelopeView.criteria.find(
      (c) => c.criterion === diffRow.criterion && (diffRow.criterion !== 'rolePlayTask' || c.taskId === diffRow.taskId),
    );

    const row: ReviewArtifactRow = {
      sessionId: diffRow.sessionId,
      attemptId: diffRow.attemptId,
      criterion: diffRow.criterion,
      mark: diffRow.scorerMark,
      band: criterionView?.band ?? null,
      teacherMark: diffRow.teacherMark,
      delta: diffRow.delta,
      justification: diffRow.justification,
      quotedEvidence: diffRow.quotedEvidence,
      reviewed: review?.reviewed ?? false,
    };

    if (diffRow.taskId !== undefined) row.taskId = diffRow.taskId;
    if (criterionView?.topicArea !== undefined) row.topicArea = criterionView.topicArea;
    if (criterionView?.responseLength !== undefined) row.responseLength = criterionView.responseLength;
    if (review?.reviewer !== undefined) row.reviewer = review.reviewer;
    if (review?.reviewedAt !== undefined) row.reviewedAt = review.reviewedAt;
    if (review?.disagreementResolved !== undefined) row.disagreementResolved = review.disagreementResolved;
    if (review?.notes !== undefined) row.notes = review.notes;

    return row;
  });
}
