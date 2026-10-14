/**
 * S5 version-drift guard for the L3 guardrails. Hashes {config, output}
 * together (not output alone) so a threshold edit in config.ts always
 * changes the hash — even when it doesn't flip a golden fixture's trigger —
 * forcing a GUARDRAILS_VERSION bump in the same commit.
 *
 * Workstream C widens it again, to the guardrail report's EFFECT on the
 * envelope rather than the report alone. At v0.2 `adjustments` was computed and
 * discarded, so this hash could not have caught the clamp being wired up,
 * unwired, or wired up wrongly — the mark-moving half of L3 sat outside the
 * pin. `clampEffect` below closes that: it exercises the ceiling application
 * with a synthetic adjustment, so any change to how a clamp lands on
 * mark/band/total must bump GUARDRAILS_VERSION.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import { DEFAULT_DURATION_CONFIG, EVIDENCE_CEILINGS } from '../config';
import { runGuardrails } from '../runGuardrails';
import { GUARDRAILS_VERSION } from '../version';
import { CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT } from './synthetic';
import { checkHomophoneErrors } from '../homophoneErrors';
import type { ExcusedQolError } from '../../judgement/types';
import { buildScoringEnvelope } from '../../envelope/buildEnvelope';
import type { BuildScoringEnvelopeInput } from '../../envelope/buildEnvelope';

/**
 * Re-pinned with the v0.3 bump (Workstream C): the hashed input gained
 * `clampEffect*`, so the value necessarily moves. runGuardrails's own output is
 * unchanged — verified by ceilingApplied.test.ts and the golden diff, which
 * show no mark moving on any unclamped path.
 */
const GUARDRAILS_FIXTURE_HASH = 'c9c581662c6597e9f068ada857f628c1367c74c8262f693e248badc2be67c626';

/**
 * Stage 6 (guardrails-v0.7): the sound-alike guardrail's output for fixed step
 * records — excused and resolved, re-ask failed, re-run relisted — so a change
 * to when either homophone trigger fires needs a GUARDRAILS_VERSION bump.
 */
const EXCUSED: ExcusedQolError = {
  source: 'topic1',
  turnId: 'q1',
  quote: "j'ai joué au football",
  kind: 'grammar',
  correction: "j'ai jouer au football",
  reason: 'inaudible',
  nearPairIds: [],
};
function homophoneEffect() {
  const run = (record: Parameters<typeof checkHomophoneErrors>[2]) =>
    checkHomophoneErrors(CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT, record);
  return {
    none: run(undefined),
    resolved: run({ excusedErrors: [EXCUSED], reAsk: 'applied', excusedInReAsk: 0 }),
    failed: run({ excusedErrors: [EXCUSED], reAsk: 'failed', excusedInReAsk: 0 }),
    relisted: run({ excusedErrors: [EXCUSED], reAsk: 'applied', excusedInReAsk: 1 }),
  };
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/**
 * Fixed, literal envelope inputs — this is a pin, not a scenario test, so every
 * field is constant and none comes from real scoreAttempt provenance.
 */
function envelopeInput(
  criterionAdjustments: BuildScoringEnvelopeInput['criterionAdjustments'],
): BuildScoringEnvelopeInput {
  return {
    attemptId: 'guardrails-pin',
    sessionId: 'guardrails-pin-session',
    scoredAt: '2025-01-01T00:00:00.000Z',
    transcript: CLEAN_LONG_TRANSCRIPT,
    assessment: CLEAN_ASSESSMENT,
    evidenceProfile: buildEvidenceProfile(CLEAN_LONG_TRANSCRIPT),
    stt: {
      model: 'pin',
      modelVersion: 'pin',
      provider: 'pin',
      languageCode: 'fr',
      alignmentModel: null,
      diarizationModel: null,
      decodeParamsHash: 'pin',
      confidenceSource: 'faster-whisper-probability',
      promptBiasedRetries: 0,
      transcribedAt: '2025-01-01T00:00:00.000Z',
    },
    transcriptVersion: { schemaVersion: 'session-transcript-v1', assemblerVersion: 'stt-assembler-v1' },
    transcriptQuality: { meanWordConfidence: 1, lowConfidenceSpanRatio: 0, lowConfidenceSpanCount: 0 },
    userCorrected: false,
    llm: { provider: 'gemini', model: 'pin', selfConsistencyRuns: 1 },
    qualityOfLanguageLlm: { provider: 'gemini', model: 'pin', selfConsistencyRuns: 1 },
    versions: {
      rubricVersion: 'pin',
      scoringEngineVersion: 'pin',
      evidenceDetectorVersion: 'pin',
      scoringPromptVersion: 'pin',
      guardrailsVersion: 'pin',
    },
    guardrailTriggers: [],
    criterionAdjustments,
  };
}

/** Only the fields a clamp is allowed to move — keeps the pin off unrelated envelope churn. */
function clampEffect(criterionAdjustments: BuildScoringEnvelopeInput['criterionAdjustments']) {
  const envelope = buildScoringEnvelope(envelopeInput(criterionAdjustments));
  return {
    communication: { mark: envelope.communication.mark, band: envelope.communication.band },
    qualityOfLanguage: {
      mark: envelope.qualityOfLanguage.mark,
      band: envelope.qualityOfLanguage.band,
    },
    total: envelope.total,
    criterionAdjustments: envelope.criterionAdjustments,
  };
}

describe('guardrails version pin', () => {
  it('runGuardrails output + config + clamp effect hash matches GUARDRAILS_FIXTURE_HASH', () => {
    const evidence = buildEvidenceProfile(CLEAN_LONG_TRANSCRIPT);
    const report = runGuardrails(CLEAN_ASSESSMENT, evidence, CLEAN_LONG_TRANSCRIPT);
    // Phase 5: EVIDENCE_CEILINGS joins the hashed inputs for the same reason
    // DEFAULT_DURATION_CONFIG is here — promoting a detector by adding a ceiling
    // must be impossible without a GUARDRAILS_VERSION bump in the same commit.
    const actual = sha256({
      config: DEFAULT_DURATION_CONFIG,
      ceilings: EVIDENCE_CEILINGS,
      report,
      // Workstream C: the real (empty) path and a forced clamp, so both "no
      // ceiling fired" and "a ceiling fired" are pinned.
      clampEffectUnclamped: clampEffect(report.adjustments),
      clampEffectForced: clampEffect([
        { criterion: 'qualityOfLanguage', proposedMark: CLEAN_ASSESSMENT.qualityOfLanguage.mark, finalMark: 3 },
      ]),
      homophoneEffect: homophoneEffect(),
    });

    expect(
      actual,
      `guardrail output or clamp application changed — bump GUARDRAILS_VERSION (currently "${GUARDRAILS_VERSION}") and update GUARDRAILS_FIXTURE_HASH together in this commit`,
    ).toBe(GUARDRAILS_FIXTURE_HASH);
  });
});
