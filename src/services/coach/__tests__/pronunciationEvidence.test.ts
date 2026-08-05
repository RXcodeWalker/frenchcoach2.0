// ── Phase 5 pronunciation evidence bridge tests ────────────────────────────
// Covers the pron:* namespace rule: node ids are never SKILL_DEFS keys, and
// couldNotAssess/null-score attempts never fabricate an evidence event.

import { describe, it, expect } from 'vitest';
import { buildPronunciationEvidence, pronCategoryNodeId, PRON_OVERALL_NODE_ID } from '../pronunciationEvidence';
import { reduceEvidenceToBeliefState, projectEvidenceBeliefSnapshot } from '../beliefReducer';
import { SKILL_DEFS } from '../../coaching/diagnosticEngine';
import { buildPronunciationAssessment } from '../../../domain/pronunciation/__tests__/fixtures';

const BASE_ARGS = {
  attemptId: 'pron_1',
  sessionId: 'pron_1',
  targetText: 'Un bon vin blanc.',
  mode: 'accent-analyzer',
};

describe('buildPronunciationEvidence', () => {
  it('returns no events when couldNotAssess is true', () => {
    const assessment = buildPronunciationAssessment({
      score: null,
      couldNotAssess: true,
      couldNotAssessReason: 'silence',
    });
    expect(buildPronunciationEvidence({ ...BASE_ARGS, assessment })).toEqual([]);
  });

  it('returns no events when score is null even if couldNotAssess is false', () => {
    // Structurally shouldn't happen per the contract, but the guard must not
    // rely on couldNotAssess alone (plan §15: null score is the true signal).
    const assessment = buildPronunciationAssessment({ score: null });
    expect(buildPronunciationEvidence({ ...BASE_ARGS, assessment })).toEqual([]);
  });

  it('produces an overall event targeting pron:overall plus finding node ids', () => {
    const assessment = buildPronunciationAssessment({
      phonologicalFindings: [
        { category: 'liaison', word: 'bon vin', explanation: 'missing liaison', confidence: 0.6, provenance: 'inferred' },
        { category: 'frenchR', word: 'vin', explanation: 'R too soft', confidence: 0.8, provenance: 'authoritative' },
      ],
    });
    const events = buildPronunciationEvidence({ ...BASE_ARGS, assessment });

    const overall = events.find(e => e.id.endsWith(':overall'));
    expect(overall?.targetNodeIds).toEqual([
      PRON_OVERALL_NODE_ID,
      pronCategoryNodeId('liaison'),
      pronCategoryNodeId('frenchR'),
    ]);
    expect(overall?.result.score).toBe(assessment.score);
    expect(overall?.reliability.evaluator).toBe('speech_model');

    // One overall event plus one additional per-finding event per phonological finding.
    expect(events.filter(e => e.evidenceType === 'language')).toHaveLength(3);
  });

  it('never uses a pron:* node id that collides with a SKILL_DEFS key', () => {
    const assessment = buildPronunciationAssessment({
      phonologicalFindings: [
        { category: 'liaison', word: 'bon vin', explanation: 'x', confidence: 0.6, provenance: 'inferred' },
      ],
    });
    const events = buildPronunciationEvidence({ ...BASE_ARGS, assessment });
    const allNodeIds = events.flatMap(e => e.targetNodeIds);
    for (const nodeId of allNodeIds) {
      expect(nodeId.startsWith('pron:')).toBe(true);
      expect(SKILL_DEFS[nodeId]).toBeUndefined();
    }
  });

  it('ceilings a finding event\'s confidence to the finding\'s own confidence', () => {
    const assessment = buildPronunciationAssessment({
      confidence: { overall: 0.95, basis: [], transcriptAgreement: null },
      phonologicalFindings: [
        { category: 'liaison', word: 'bon vin', explanation: 'x', confidence: 0.6, provenance: 'inferred' },
      ],
    });
    const events = buildPronunciationEvidence({ ...BASE_ARGS, assessment });
    const findingEvent = events.find(e => !e.id.endsWith(':overall') && e.targetNodeIds.includes('pron:liaison'));
    expect(findingEvent?.reliability.assessmentConfidence).toBeLessThanOrEqual(0.6);
  });

  it('pron:* evidence is captured in the log but excluded from the belief snapshot (never merged into the 14 grammar categories)', () => {
    const assessment = buildPronunciationAssessment({
      phonologicalFindings: [
        { category: 'liaison', word: 'bon vin', explanation: 'x', confidence: 0.6, provenance: 'inferred' },
      ],
    });
    const events = buildPronunciationEvidence({ ...BASE_ARGS, assessment });
    const state = reduceEvidenceToBeliefState(events);
    const snapshot = projectEvidenceBeliefSnapshot(state, undefined, 'local-user');

    // Captured: the reducer still folds pron:* nodes into its internal state...
    expect(Object.keys(state)).toEqual(expect.arrayContaining([PRON_OVERALL_NODE_ID, 'pron:liaison']));
    // ...but the projection only ever emits real SKILL_DEFS-backed skills.
    expect(Object.keys(snapshot.skills)).toEqual([]);
  });
});
