import { describe, expect, it } from 'vitest';
import { computeGoldenCase } from '../../goldenRegression';
import { SYNTHETIC_MANIFEST } from '../../../../src/domain/igcse/guardrails/__tests__/syntheticManifest';
import { buildDiffRows } from '../../../../src/domain/igcse/comparison/diff';
import { buildEnvelopeView } from '../envelopeView';
import { buildReviewArtifactRows } from '../reviewArtifact';

const CLEAN_ENTRY = SYNTHETIC_MANIFEST.find((e) => e.id === 'clean-long-quote-verification')!;

describe('buildReviewArtifactRows', () => {
  it('a case with no review yet: fields present but empty', () => {
    const { envelope } = computeGoldenCase(CLEAN_ENTRY);
    const diffRows = buildDiffRows(envelope!);
    const view = buildEnvelopeView(envelope!);

    const rows = buildReviewArtifactRows(diffRows, view);

    expect(rows).toHaveLength(diffRows.length);
    for (const row of rows) {
      expect(row.reviewed).toBe(false);
      expect(row.reviewer).toBeUndefined();
      expect(row.reviewedAt).toBeUndefined();
      expect(row.disagreementResolved).toBeUndefined();
      expect(row.notes).toBeUndefined();
      expect(row.teacherMark).toBeNull();
      expect(row.delta).toBeNull();
    }

    const communicationRow = rows.find((r) => r.criterion === 'communication')!;
    expect(communicationRow.responseLength).toBeDefined();
    expect(communicationRow.band).not.toBeNull();

    const rolePlayRow = rows.find((r) => r.criterion === 'rolePlayTask')!;
    expect(rolePlayRow.taskId).toBeDefined();
    expect(rolePlayRow.band).toBeNull();
  });

  it('a case with a full review: fields populated', () => {
    const { envelope } = computeGoldenCase(CLEAN_ENTRY);
    const diffRows = buildDiffRows(envelope!, {
      sessionId: envelope!.sessionId,
      markedBy: 'teacher-1',
      markedAt: '2026-07-12T00:00:00.000Z',
      marks: [{ criterion: 'communication', mark: 7 }],
    });
    const view = buildEnvelopeView(envelope!);
    const review = {
      attemptId: envelope!.attemptId,
      reviewed: true,
      reviewer: 'alice',
      reviewedAt: '2026-07-12T01:00:00.000Z',
      disagreementResolved: true,
      notes: 'confirmed band',
    };

    const rows = buildReviewArtifactRows(diffRows, view, review);
    const communicationRow = rows.find((r) => r.criterion === 'communication')!;

    expect(communicationRow.reviewed).toBe(true);
    expect(communicationRow.reviewer).toBe('alice');
    expect(communicationRow.disagreementResolved).toBe(true);
    expect(communicationRow.notes).toBe('confirmed band');
    expect(communicationRow.teacherMark).toBe(7);
    expect(communicationRow.delta).toBe(envelope!.communication.mark - 7);
  });
});
