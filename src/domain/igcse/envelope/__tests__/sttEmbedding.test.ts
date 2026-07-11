/**
 * S4: envelope.stt must deep-equal the source SttMetadata wholesale, not a
 * lossy 4-field projection (see file header of buildEnvelope.ts / stt/index.ts).
 */

import { describe, expect, it } from 'vitest';
import { buildEvidenceSubset } from '../../evidence/buildEvidence';
import { buildValidJudgeOutput, PRACTICE_TRANSCRIPT } from '../../judgement/__tests__/fixtures';
import { parseAndValidateJudgeOutput } from '../../judgement/schema';
import { buildScoringEnvelope } from '../buildEnvelope';
import type { SttMetadata } from '../../stt/types';

describe('ScoringEnvelope.stt wholesale embedding', () => {
  it('deep-equals the full 10-field SttMetadata, not a lossy projection', () => {
    const sttMetadata: SttMetadata = {
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
    };

    const assessment = parseAndValidateJudgeOutput(buildValidJudgeOutput(), PRACTICE_TRANSCRIPT);
    const envelope = buildScoringEnvelope({
      attemptId: 'attempt-1',
      sessionId: 'session-1',
      scoredAt: '2026-07-10T00:00:00.000Z',
      transcript: PRACTICE_TRANSCRIPT,
      assessment,
      evidenceProfile: buildEvidenceSubset(PRACTICE_TRANSCRIPT),
      stt: sttMetadata,
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
    });

    expect(envelope.stt).toEqual(sttMetadata);
    expect(Object.keys(envelope.stt).length).toBe(10);
  });
});
