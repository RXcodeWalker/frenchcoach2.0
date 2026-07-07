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

export interface EvidenceProfileSubset {
  timeFrameAlignmentByQuestion: QuestionTimeFrameEvidence[];
  responseCountsByQuestion: ResponseCountEvidence[];
  fillerDensityByQuestion: FillerDensityEvidence[];
  rolePlayPartsByTask: RolePlayPartsEvidence[];
}
