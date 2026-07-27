/**
 * S2 Layer-1 evidence subset types.
 * This is intentionally a subset of the full EvidenceProfile in architecture §3.3.
 */

import type { DetectorRun, Observation } from './framework/observation';

export type TimeFrame = 'past' | 'present' | 'future' | 'conditional';

export type TimeFrameAlignment = 'aligned' | 'misaligned' | 'no_verb';

export interface QuestionTimeFrameEvidence {
  questionId: string;
  expectedTimeFrame: TimeFrame | null;
  detectedTimeFrame: TimeFrame | null;
  alignment: TimeFrameAlignment;
}

export interface ResponseCountEvidence {
  questionId: string;
  wordCount: number;
  responseCount: number;
}

export interface FillerDensityEvidence {
  questionId: string;
  fillerCount: number;
  wordCount: number;
  density: number;
}

export interface RolePlayPartsEvidence {
  taskId: string;
  partsExpected: 1 | 2;
  partsAddressed: 0 | 1 | 2;
}

/**
 * S4: candidate speaking time/word count per topic conversation, for the S5
 * insufficient-evidence-duration guardrail (02-scoring-pipeline-architecture.md
 * §3.5). `candidateSpeakingDurationS` is 0 when no turn in the conversation
 * carries `candidateResponseDurationS` (hand-authored transcripts with no
 * timing source) — absence is not a penalty signal here, L3 decides that.
 */
export interface TopicConversationDurationEvidence {
  conversationId: 'topic1' | 'topic2';
  candidateSpeakingDurationS: number;
  candidateWordCount: number;
}

export interface EvidenceProfileSubset {
  timeFrameAlignmentByQuestion: QuestionTimeFrameEvidence[];
  responseCountsByQuestion: ResponseCountEvidence[];
  fillerDensityByQuestion: FillerDensityEvidence[];
  rolePlayPartsByTask: RolePlayPartsEvidence[];
  topicConversationDurationByConversation: TopicConversationDurationEvidence[];
}

/**
 * Phase 1 (i-am-building-an-cosmic-cascade.md §10.1/§10.7): the full L1
 * evidence record that replaces EvidenceProfileSubset as the type built once
 * per attempt and injected into both the L2 prompt and the envelope
 * snapshot (§9.4 R1). The five EvidenceProfileSubset fields are preserved
 * verbatim (§9.5 R2) so guardrails/envelopeView, which read them by name,
 * need no changes.
 *
 * Phase 3 (§10.7 Phase 3): `observations`/`features`/`detectorRuns`/
 * `detectorVersions` are now populated by the full detector fleet
 * (framework/phase3Detectors.ts). This widening is additive per §9.5 — no
 * existing field changed shape, and none of these four are in the L2 prompt
 * allow-list (judgement/prompt.ts PROMPT_EVIDENCE_ALLOW_LIST), so no mark
 * moves as a result.
 */
export interface EvidenceProfile extends EvidenceProfileSubset {
  schemaVersion: 'evidence-profile-v1';
  /** Flat, append-only fact log — one entry per Observation emitted by any successful detector. */
  observations: Observation[];
  /** Derived rollups (TTR, tense histogram, ...) — see features/project.ts. */
  features: Record<string, number | string | boolean>;
  /** One entry per registered detector (success/disabled/dependency_unavailable/version_mismatch/failed). */
  detectorRuns: DetectorRun[];
  detectorVersions: Record<string, string>;
}
