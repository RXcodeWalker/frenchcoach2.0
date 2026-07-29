/**
 * S4 pure envelope assembly, extended in S5 to carry real guardrail output and
 * in Workstream C to apply L3's evidence ceilings.
 *
 * Zero scoring JUDGEMENT — it combines already-computed values (assessment,
 * evidence, versions, transcript quality, guardrail triggers, criterion
 * adjustments) into the immutable ScoringEnvelope shape. The one arithmetic it
 * performs is applying a clamp L3 already decided: substituting the ceiling's
 * finalMark, re-deriving the band by lookup in the Cambridge band table, and
 * re-adding the total. No threshold, weight or band boundary originates here.
 *
 * The clamp is applied HERE rather than by mutating the L2 assessment, so the
 * judge's proposed mark stays in the audit trail (criterionAdjustments) —
 * §3.5's "L3 produces a ceiling and a confidence, not a replacement judgement".
 *
 * Still fills in the remaining S4 sentinels (calibrationVersion/
 * gradeBoundarySeries: 'none', anchorsUsedByCriterion: [], agreement:
 * 'single_run', confidence: 'unassessed').
 */

import type { EvidenceProfile } from '../evidence/types';
import type { CeilingCriterion, CriterionAdjustment } from '../guardrails/types';
import type { SpeakingAssessment, SpeakingTranscript } from '../judgement/types';
import { COMMUNICATION, QUALITY_OF_LANGUAGE } from '../rubric';
import type { MarkBand } from '../rubric';
import type { SttMetadata, TranscriptQuality } from '../stt/types';
import { ENVELOPE_SCHEMA_VERSION } from './types';
import type {
  Criterion,
  EnvelopeBandCriterion,
  EnvelopeRolePlayTask,
  LlmProvenance,
  ScoringEnvelope,
  TranscriptVersion,
  VersionStack,
} from './types';

export interface BuildScoringEnvelopeInput {
  attemptId: string;
  sessionId: string;
  scoredAt: string;
  transcript: SpeakingTranscript;
  assessment: SpeakingAssessment;
  evidenceProfile: EvidenceProfile;
  stt: SttMetadata;
  transcriptVersion: TranscriptVersion;
  transcriptQuality: TranscriptQuality;
  userCorrected: boolean;
  llm: LlmProvenance;
  versions: {
    rubricVersion: string;
    scoringEngineVersion: string;
    evidenceDetectorVersion: string;
    scoringPromptVersion: string;
    guardrailsVersion: string;
  };
  /** S5 guardrail trigger ids from runGuardrails — see guardrails/. */
  guardrailTriggers: string[];
  /**
   * Workstream C: mark clamps from runGuardrails's evidence ceilings. Omitted
   * or [] means no ceiling fired, which is every call today. Callers pass
   * `guardrailReport.adjustments` straight through — this is the field's only
   * consumer, and its absence is what let the clamp ship dead.
   */
  criterionAdjustments?: CriterionAdjustment[];
  /** See ScoringEnvelope.questionSetId — omitted when the caller has no question set provenance. */
  questionSetId?: string;
  /** See ScoringEnvelope.questionSetHash. */
  questionSetHash?: string;
  regradedFrom?: string;
}

const EMPTY_ANCHORS: Record<Criterion, string[]> = {
  rolePlayTask: [],
  communication: [],
  qualityOfLanguage: [],
};

function toEnvelopeRolePlayTask(task: SpeakingAssessment['rolePlay']['tasks'][number]): EnvelopeRolePlayTask {
  return {
    taskId: task.taskId,
    mark: task.mark,
    confidence: 'unassessed',
    justification: task.descriptorApplied,
    evidenceSpans: task.evidenceSpans,
  };
}

const BANDS_BY_CRITERION: Record<CeilingCriterion, readonly MarkBand[]> = {
  communication: COMMUNICATION.bands,
  qualityOfLanguage: QUALITY_OF_LANGUAGE.bands,
};

/**
 * The band a clamped mark falls in, by min/max lookup in the Cambridge table
 * (rubric.ts COMMUNICATION.bands / QUALITY_OF_LANGUAGE.bands). A scan over
 * sourced data — no boundary is computed, inferred or invented here (I8).
 *
 * Throws rather than guessing if the mark falls outside every band: that means
 * a ceiling's maxMark is out of the 0–15 range, which is a config error to
 * surface loudly, not to paper over with a nearest-band fallback.
 */
function bandForMark(criterion: CeilingCriterion, mark: number): MarkBand {
  const band = BANDS_BY_CRITERION[criterion].find((b) => mark >= b.min && mark <= b.max);
  if (!band) {
    throw new Error(
      `buildScoringEnvelope: clamped ${criterion} mark ${mark} falls outside every Cambridge band`,
    );
  }
  return band;
}

/**
 * Build the envelope's view of a band criterion, applying L3's clamp when one
 * was issued. All three of mark / band / (caller's) total must move together —
 * a clamped mark left with L2's band, or a stale total, is an internally
 * inconsistent envelope.
 */
function toEnvelopeBandCriterion(
  assessment: SpeakingAssessment['communication'],
  criterion: CeilingCriterion,
  adjustment: CriterionAdjustment | undefined,
): EnvelopeBandCriterion {
  if (!adjustment) {
    return {
      mark: assessment.mark,
      band: assessment.band,
      confidence: 'unassessed',
      justification: assessment.justification,
      evidenceSpans: assessment.evidenceSpans,
    };
  }

  const band = bandForMark(criterion, adjustment.finalMark);
  return {
    mark: adjustment.finalMark,
    band: { min: band.min, max: band.max, label: band.label },
    confidence: 'unassessed',
    // L2's reasoning is retained verbatim; criterionAdjustments records that a
    // ceiling overrode the mark it argued for.
    justification: assessment.justification,
    evidenceSpans: assessment.evidenceSpans,
  };
}

export function buildScoringEnvelope(input: BuildScoringEnvelopeInput): ScoringEnvelope {
  const versions: VersionStack = {
    envelopeSchemaVersion: ENVELOPE_SCHEMA_VERSION,
    rubricVersion: input.versions.rubricVersion,
    scoringEngineVersion: input.versions.scoringEngineVersion,
    evidenceDetectorVersion: input.versions.evidenceDetectorVersion,
    scoringPromptVersion: input.versions.scoringPromptVersion,
    guardrailsVersion: input.versions.guardrailsVersion,
    calibrationVersion: 'none',
    gradeBoundarySeries: 'none',
  };

  const criterionAdjustments = input.criterionAdjustments ?? [];
  const adjustmentFor = (criterion: CeilingCriterion): CriterionAdjustment | undefined =>
    criterionAdjustments.find((a) => a.criterion === criterion);

  const communication = toEnvelopeBandCriterion(
    input.assessment.communication,
    'communication',
    adjustmentFor('communication'),
  );
  const qualityOfLanguage = toEnvelopeBandCriterion(
    input.assessment.qualityOfLanguage,
    'qualityOfLanguage',
    adjustmentFor('qualityOfLanguage'),
  );

  // Recomputed from the post-clamp marks rather than taken from
  // assessment.total, which is L2's pre-clamp sum. Role play is out of a
  // ceiling's scope (CeilingCriterion), so its total passes through.
  const total = input.assessment.rolePlay.total + communication.mark + qualityOfLanguage.mark;

  const envelope: ScoringEnvelope = {
    attemptId: input.attemptId,
    sessionId: input.sessionId,
    scoredAt: input.scoredAt,
    contentProvenance: input.transcript.contentProvenance,
    versions,
    llm: input.llm,
    stt: input.stt,
    transcriptVersion: input.transcriptVersion,
    transcriptConfidence: {
      meanWordConfidence: input.transcriptQuality.meanWordConfidence,
      lowConfidenceSpanRatio: input.transcriptQuality.lowConfidenceSpanRatio,
      lowConfidenceSpanCount: input.transcriptQuality.lowConfidenceSpanCount,
      userCorrected: input.userCorrected,
    },
    anchorsUsedByCriterion: EMPTY_ANCHORS,
    rolePlayTasks: input.assessment.rolePlay.tasks.map(toEnvelopeRolePlayTask),
    communication,
    qualityOfLanguage,
    total,
    criterionAdjustments,
    guardrailTriggers: input.guardrailTriggers,
    selfConsistencyOutcomes: { agreement: 'single_run', rerunsRequested: 0 },
    evidenceProfileSnapshot: input.evidenceProfile,
    transcriptSnapshot: input.transcript,
  };

  if (input.questionSetId !== undefined) {
    envelope.questionSetId = input.questionSetId;
  }
  if (input.questionSetHash !== undefined) {
    envelope.questionSetHash = input.questionSetHash;
  }
  if (input.regradedFrom !== undefined) {
    envelope.regradedFrom = input.regradedFrom;
  }

  return envelope;
}
