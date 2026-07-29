/**
 * Workstream C — the L3 evidence ceiling actually moves the envelope.
 *
 * This test's absence is what let the dead field ship: `applyEvidenceCeilings`
 * built `adjustments`, `runGuardrails` returned them, and every consumer threw
 * them away. Enabling a ceiling emitted a trigger and left the mark alone, so
 * Phase 5's exit criterion ("flipping a detector to `eligible` is a one-line
 * config change") was false. Nothing caught it, because both gates ship closed
 * and every other test asserts adjustments === [].
 *
 * So this test injects a SYNTHETIC CriterionAdjustment directly, rather than
 * opening a calibration gate. It proves the wiring works without adding a
 * calibration reference or a ceiling to config — CALIBRATION_REFERENCES and
 * EVIDENCE_CEILINGS stay empty (I5), and no mark moves in any real path (I1).
 *
 * When a clamp lands, all three must move together — a clamped mark left
 * carrying L2's band, or a stale total, is an internally inconsistent envelope.
 */

import { describe, expect, it } from 'vitest';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import { EVIDENCE_CEILINGS } from '../../guardrails/config';
import type { CriterionAdjustment } from '../../guardrails/types';
import { buildValidJudgeOutput, PRACTICE_TRANSCRIPT } from '../../judgement/__tests__/fixtures';
import { parseAndValidateJudgeOutput } from '../../judgement/schema';
import { COMMUNICATION, QUALITY_OF_LANGUAGE } from '../../rubric';
import type { MarkBand } from '../../rubric';
import { buildScoringEnvelope } from '../buildEnvelope';
import type { BuildScoringEnvelopeInput } from '../buildEnvelope';

function buildInput(criterionAdjustments?: CriterionAdjustment[]): BuildScoringEnvelopeInput {
  const assessment = parseAndValidateJudgeOutput(buildValidJudgeOutput(), PRACTICE_TRANSCRIPT);
  return {
    attemptId: 'attempt-ceiling',
    sessionId: 'session-ceiling',
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
    llm: { provider: 'gemini', model: 'gemini-2.5-flash-lite', selfConsistencyRuns: 1 },
    versions: {
      rubricVersion: 'rubric-v0.1',
      scoringEngineVersion: 'engine-v0.1',
      evidenceDetectorVersion: 'detectors-v0.1',
      scoringPromptVersion: 'scoring-prompt-v0.1',
      guardrailsVersion: 'guardrails-v0.3',
    },
    guardrailTriggers: [],
    ...(criterionAdjustments ? { criterionAdjustments } : {}),
  };
}

/** The band a mark falls in, read straight off the Cambridge table. */
function expectedBand(bands: readonly MarkBand[], mark: number) {
  const band = bands.find((b) => mark >= b.min && mark <= b.max);
  if (!band) throw new Error(`no band for mark ${mark}`);
  return { min: band.min, max: band.max, label: band.label };
}

describe('L3 evidence ceiling application (Workstream C)', () => {
  const unclamped = buildScoringEnvelope(buildInput());

  it('is a no-op when no adjustment is present — the live path today', () => {
    const assessment = parseAndValidateJudgeOutput(buildValidJudgeOutput(), PRACTICE_TRANSCRIPT);
    expect(unclamped.criterionAdjustments).toEqual([]);
    // Marks and bands pass through from L2 untouched (I1).
    expect(unclamped.communication.mark).toBe(assessment.communication.mark);
    expect(unclamped.communication.band).toEqual(assessment.communication.band);
    expect(unclamped.qualityOfLanguage.mark).toBe(assessment.qualityOfLanguage.mark);
    expect(unclamped.total).toBe(assessment.total);
    expect(unclamped.total).toBe(
      unclamped.rolePlayTasks.reduce((sum, t) => sum + t.mark, 0) +
        unclamped.communication.mark +
        unclamped.qualityOfLanguage.mark,
    );
  });

  it('drops the communication mark, re-derives its band, and recomputes the total', () => {
    const proposed = unclamped.communication.mark;
    const finalMark = 3;
    expect(finalMark).toBeLessThan(proposed); // the fixture must actually be clampable

    const clamped = buildScoringEnvelope(
      buildInput([{ criterion: 'communication', proposedMark: proposed, finalMark }]),
    );

    // 1. mark drops to the ceiling
    expect(clamped.communication.mark).toBe(finalMark);
    // 2. band matches the CLAMPED mark, not L2's proposal
    expect(clamped.communication.band).toEqual(expectedBand(COMMUNICATION.bands, finalMark));
    expect(clamped.communication.band).not.toEqual(unclamped.communication.band);
    // 3. total is recomputed, not carried over from assessment.total
    expect(clamped.total).toBe(unclamped.total - (proposed - finalMark));
    expect(clamped.total).toBe(
      clamped.rolePlayTasks.reduce((sum, t) => sum + t.mark, 0) +
        clamped.communication.mark +
        clamped.qualityOfLanguage.mark,
    );
  });

  it('clamps qualityOfLanguage independently, leaving communication untouched', () => {
    const proposed = unclamped.qualityOfLanguage.mark;
    const finalMark = 5;

    const clamped = buildScoringEnvelope(
      buildInput([{ criterion: 'qualityOfLanguage', proposedMark: proposed, finalMark }]),
    );

    expect(clamped.qualityOfLanguage.mark).toBe(finalMark);
    expect(clamped.qualityOfLanguage.band).toEqual(expectedBand(QUALITY_OF_LANGUAGE.bands, finalMark));
    expect(clamped.communication.mark).toBe(unclamped.communication.mark);
    expect(clamped.communication.band).toEqual(unclamped.communication.band);
    expect(clamped.total).toBe(unclamped.total - (proposed - finalMark));
  });

  it('applies both clamps at once', () => {
    const commProposed = unclamped.communication.mark;
    const qolProposed = unclamped.qualityOfLanguage.mark;

    const clamped = buildScoringEnvelope(
      buildInput([
        { criterion: 'communication', proposedMark: commProposed, finalMark: 2 },
        { criterion: 'qualityOfLanguage', proposedMark: qolProposed, finalMark: 4 },
      ]),
    );

    expect(clamped.communication.mark).toBe(2);
    expect(clamped.qualityOfLanguage.mark).toBe(4);
    expect(clamped.total).toBe(
      clamped.rolePlayTasks.reduce((sum, t) => sum + t.mark, 0) + 2 + 4,
    );
  });

  it("retains L2's proposed mark in the audit trail rather than replacing the judgement", () => {
    const proposed = unclamped.communication.mark;
    const clamped = buildScoringEnvelope(
      buildInput([{ criterion: 'communication', proposedMark: proposed, finalMark: 3 }]),
    );

    expect(clamped.criterionAdjustments).toEqual([
      { criterion: 'communication', proposedMark: proposed, finalMark: 3 },
    ]);
    // The judge's reasoning survives verbatim — L3 caps a mark, it does not
    // rewrite the judgement (§3.5).
    expect(clamped.communication.justification).toBe(unclamped.communication.justification);
    expect(clamped.communication.evidenceSpans).toEqual(unclamped.communication.evidenceSpans);
  });

  it('a clamp to 0 lands in the null-label band, not the 1-3 "Poor" band', () => {
    const clamped = buildScoringEnvelope(
      buildInput([
        { criterion: 'communication', proposedMark: unclamped.communication.mark, finalMark: 0 },
      ]),
    );
    expect(clamped.communication.band).toEqual({ min: 0, max: 0, label: null });
  });

  it('throws rather than guessing when a clamped mark falls outside every band', () => {
    expect(() =>
      buildScoringEnvelope(
        buildInput([
          { criterion: 'communication', proposedMark: unclamped.communication.mark, finalMark: 99 },
        ]),
      ),
    ).toThrow(/falls outside every Cambridge band/);
  });

  it('I5: no ceiling is configured, so no real scoring path can reach this clamp today', () => {
    expect(EVIDENCE_CEILINGS).toEqual([]);
  });
});
