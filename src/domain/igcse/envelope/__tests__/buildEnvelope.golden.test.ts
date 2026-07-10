import { describe, expect, it } from 'vitest';
import { buildEvidenceSubset } from '../../evidence/buildEvidence';
import { buildValidJudgeOutput, PRACTICE_TRANSCRIPT } from '../../judgement/__tests__/fixtures';
import { parseAndValidateJudgeOutput } from '../../judgement/schema';
import { buildScoringEnvelope } from '../buildEnvelope';

const FIXED_SCORED_AT = '2026-07-10T00:00:00.000Z';

function buildInput() {
  const assessment = parseAndValidateJudgeOutput(buildValidJudgeOutput(), PRACTICE_TRANSCRIPT);
  const evidenceProfile = buildEvidenceSubset(PRACTICE_TRANSCRIPT);

  return {
    attemptId: 'attempt-1',
    sessionId: 'session-1',
    scoredAt: FIXED_SCORED_AT,
    transcript: PRACTICE_TRANSCRIPT,
    assessment,
    evidenceProfile,
    stt: {
      model: 'whisperx-large-v3',
      modelVersion: 'v3',
      provider: 'whisperx',
      languageCode: 'fr' as const,
      alignmentModel: 'wav2vec2-fr',
      diarizationModel: 'pyannote/speaker-diarization-3.1',
      decodeParamsHash: 'abc123',
      confidenceSource: 'whisperx-align-score' as const,
      promptBiasedRetries: 0,
      transcribedAt: '2026-07-09T00:00:00.000Z',
    },
    transcriptVersion: { schemaVersion: 'session-transcript-v1', assemblerVersion: 'stt-assembler-v1' },
    transcriptQuality: { meanWordConfidence: 0.95, lowConfidenceSpanRatio: 0.02, lowConfidenceSpanCount: 1 },
    userCorrected: false,
    llm: {
      model: 'claude-opus-4-8',
      effort: 'high' as const,
      thinking: { type: 'adaptive' as const },
      selfConsistencyRuns: 1 as const,
      responseId: 'resp-1',
    },
    versions: {
      rubricVersion: 'rubric-v0.1',
      scoringEngineVersion: 'engine-v0.1',
      evidenceDetectorVersion: 'detectors-v0.1',
      scoringPromptVersion: 'scoring-prompt-v0.1',
    },
  };
}

describe('buildScoringEnvelope golden regression', () => {
  it('matches expected deterministic envelope shape', () => {
    const envelope = buildScoringEnvelope(buildInput());

    expect(envelope).toEqual({
      attemptId: 'attempt-1',
      sessionId: 'session-1',
      scoredAt: FIXED_SCORED_AT,
      contentProvenance: 'original-practice',
      versions: {
        envelopeSchemaVersion: 'envelope-v0.1',
        rubricVersion: 'rubric-v0.1',
        scoringEngineVersion: 'engine-v0.1',
        evidenceDetectorVersion: 'detectors-v0.1',
        scoringPromptVersion: 'scoring-prompt-v0.1',
        guardrailsVersion: 'none',
        calibrationVersion: 'none',
        gradeBoundarySeries: 'none',
      },
      llm: {
        model: 'claude-opus-4-8',
        effort: 'high',
        thinking: { type: 'adaptive' },
        selfConsistencyRuns: 1,
        responseId: 'resp-1',
      },
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
      transcriptConfidence: {
        meanWordConfidence: 0.95,
        lowConfidenceSpanRatio: 0.02,
        lowConfidenceSpanCount: 1,
        userCorrected: false,
      },
      anchorsUsedByCriterion: { rolePlayTask: [], communication: [], qualityOfLanguage: [] },
      rolePlayTasks: [
        { taskId: 't1', mark: 2, confidence: 'unassessed', justification: expect.any(String), evidenceSpans: expect.any(Array) },
        { taskId: 't2', mark: 2, confidence: 'unassessed', justification: expect.any(String), evidenceSpans: expect.any(Array) },
        { taskId: 't3', mark: 1, confidence: 'unassessed', justification: expect.any(String), evidenceSpans: expect.any(Array) },
        { taskId: 't4', mark: 2, confidence: 'unassessed', justification: expect.any(String), evidenceSpans: expect.any(Array) },
        { taskId: 't5', mark: 2, confidence: 'unassessed', justification: expect.any(String), evidenceSpans: expect.any(Array) },
      ],
      communication: {
        mark: 8,
        band: { min: 7, max: 9, label: 'Satisfactory' },
        confidence: 'unassessed',
        justification: expect.any(String),
        evidenceSpans: expect.any(Array),
      },
      qualityOfLanguage: {
        mark: 8,
        band: { min: 7, max: 9, label: 'Satisfactory' },
        confidence: 'unassessed',
        justification: expect.any(String),
        evidenceSpans: expect.any(Array),
      },
      total: 25,
      guardrailTriggers: [],
      selfConsistencyOutcomes: { agreement: 'single_run', rerunsRequested: 0 },
      evidenceProfileSnapshot: buildEvidenceSubset(PRACTICE_TRANSCRIPT),
      transcriptSnapshot: PRACTICE_TRANSCRIPT,
    });
  });

  it('omits regradedFrom when not provided', () => {
    const envelope = buildScoringEnvelope(buildInput());
    expect(envelope.regradedFrom).toBeUndefined();
    expect('regradedFrom' in envelope).toBe(false);
  });

  it('includes regradedFrom when provided', () => {
    const envelope = buildScoringEnvelope({ ...buildInput(), regradedFrom: 'attempt-0' });
    expect(envelope.regradedFrom).toBe('attempt-0');
  });
});
