/**
 * S4 sentinel regression net, updated in S5 now that guardrailsVersion /
 * guardrailTriggers are real (no longer 'none' / []). The remaining
 * placeholder sentinels (calibrationVersion, gradeBoundarySeries,
 * confidence) must still be emitted literally — this guards against them
 * silently becoming load-bearing before S8/S9/S12 actually populate them.
 */

import { describe, expect, it } from 'vitest';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import { buildValidJudgeOutput, PRACTICE_TRANSCRIPT } from '../../judgement/__tests__/fixtures';
import { parseAndValidateJudgeOutput } from '../../judgement/schema';
import { buildScoringEnvelope } from '../buildEnvelope';
import type { BuildScoringEnvelopeInput } from '../buildEnvelope';

function buildInput(): BuildScoringEnvelopeInput {
  const assessment = parseAndValidateJudgeOutput(buildValidJudgeOutput(), PRACTICE_TRANSCRIPT);
  return {
    attemptId: 'attempt-1',
    sessionId: 'session-1',
    scoredAt: '2026-07-10T00:00:00.000Z',
    transcript: PRACTICE_TRANSCRIPT,
    assessment,
    evidenceProfile: buildEvidenceProfile(PRACTICE_TRANSCRIPT),
    stt: {
      model: 'whisperx-large-v3',
      modelVersion: 'v3',
      provider: 'whisperx',
      languageCode: 'fr',
      alignmentModel: 'wav2vec2-fr',
      diarizationModel: 'pyannote/speaker-diarization-3.1',
      decodeParamsHash: 'abc123',
      confidenceSource: 'whisperx-align-score',
      promptBiasedRetries: 0,
      transcribedAt: '2026-07-09T00:00:00.000Z',
    },
    transcriptVersion: { schemaVersion: 'session-transcript-v1', assemblerVersion: 'stt-assembler-v1' },
    transcriptQuality: { meanWordConfidence: 0.95, lowConfidenceSpanRatio: 0.02, lowConfidenceSpanCount: 1 },
    userCorrected: false,
    llm: {
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      selfConsistencyRuns: 1,
    },
    versions: {
      rubricVersion: 'rubric-v0.1',
      scoringEngineVersion: 'engine-v0.1',
      evidenceDetectorVersion: 'detectors-v0.1',
      scoringPromptVersion: 'scoring-prompt-v0.1',
      guardrailsVersion: 'guardrails-v0.1',
    },
    guardrailTriggers: [],
  };
}

describe('buildScoringEnvelope sentinel regression', () => {
  const envelope = buildScoringEnvelope(buildInput());

  it('always emits calibrationVersion === "none"', () => {
    expect(envelope.versions.calibrationVersion).toBe('none');
  });

  it('emits the real guardrailsVersion passed in (no longer a "none" sentinel)', () => {
    expect(envelope.versions.guardrailsVersion).toBe('guardrails-v0.1');
  });

  it('always emits gradeBoundarySeries === "none"', () => {
    expect(envelope.versions.gradeBoundarySeries).toBe('none');
  });

  it('always emits empty anchorsUsedByCriterion for every criterion', () => {
    expect(envelope.anchorsUsedByCriterion).toEqual({
      rolePlayTask: [],
      communication: [],
      qualityOfLanguage: [],
    });
  });

  it('emits guardrailTriggers passed in (empty when clean)', () => {
    expect(envelope.guardrailTriggers).toEqual([]);
  });

  it('always emits selfConsistencyOutcomes.agreement === "single_run" with 0 reruns', () => {
    expect(envelope.selfConsistencyOutcomes).toEqual({ agreement: 'single_run', rerunsRequested: 0 });
  });

  it('always emits confidence "unassessed" on every criterion', () => {
    expect(envelope.communication.confidence).toBe('unassessed');
    expect(envelope.qualityOfLanguage.confidence).toBe('unassessed');
    for (const task of envelope.rolePlayTasks) {
      expect(task.confidence).toBe('unassessed');
    }
  });

  it('never emits predictedGrade — absent from the type, not merely falsy', () => {
    expect('predictedGrade' in envelope).toBe(false);
  });

  it('llm.selfConsistencyRuns is always literal 1', () => {
    expect(envelope.llm.selfConsistencyRuns).toBe(1);
  });
});
