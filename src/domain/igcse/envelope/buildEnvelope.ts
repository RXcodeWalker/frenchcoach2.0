/**
 * S4 pure envelope assembly. Zero scoring logic — combines already-computed
 * values (assessment, evidence, versions, transcript quality) into the
 * immutable ScoringEnvelope shape. Fills in the S4 sentinels
 * (guardrailsVersion/calibrationVersion/gradeBoundarySeries: 'none',
 * anchorsUsedByCriterion: [], guardrailTriggers: [], agreement: 'single_run',
 * confidence: 'unassessed') — never conditionals about marks/bands/evidence.
 */

import type { EvidenceProfileSubset } from '../evidence/types';
import type { SpeakingAssessment, SpeakingTranscript } from '../judgement/types';
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
  evidenceProfile: EvidenceProfileSubset;
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
  };
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

function toEnvelopeBandCriterion(assessment: SpeakingAssessment['communication']): EnvelopeBandCriterion {
  return {
    mark: assessment.mark,
    band: assessment.band,
    confidence: 'unassessed',
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
    guardrailsVersion: 'none',
    calibrationVersion: 'none',
    gradeBoundarySeries: 'none',
  };

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
    communication: toEnvelopeBandCriterion(input.assessment.communication),
    qualityOfLanguage: toEnvelopeBandCriterion(input.assessment.qualityOfLanguage),
    total: input.assessment.total,
    guardrailTriggers: [],
    selfConsistencyOutcomes: { agreement: 'single_run', rerunsRequested: 0 },
    evidenceProfileSnapshot: input.evidenceProfile,
    transcriptSnapshot: input.transcript,
  };

  if (input.regradedFrom !== undefined) {
    envelope.regradedFrom = input.regradedFrom;
  }

  return envelope;
}
