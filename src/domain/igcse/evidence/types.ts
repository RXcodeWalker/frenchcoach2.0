/**
 * S2 Layer-1 evidence subset types.
 * This is intentionally a subset of the full EvidenceProfile in architecture §3.3.
 */

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
 * `observations`/`features`/`detectorRuns` are always empty in Phase 1 —
 * no detector emits typed Observations yet (that is Phase 3). They exist now
 * so the shape is stable and additive when Phase 3 populates them, per the
 * "additive, marks don't move" discipline in §9.5.
 */
export interface EvidenceProfile extends EvidenceProfileSubset {
  schemaVersion: 'evidence-profile-v1';
  /** Flat, append-only fact log — empty until Phase 3 detectors run. */
  observations: never[];
  /** Derived rollups (TTR, tense histogram, ...) — empty until Phase 3. */
  features: Record<string, never>;
  /** One entry per registered detector — empty until Phase 3 registers feature detectors. */
  detectorRuns: never[];
  detectorVersions: Record<string, never>;
}
