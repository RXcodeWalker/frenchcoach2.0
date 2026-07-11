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
