export type CognitiveDemand = 'describe' | 'explain' | 'justify' | 'compare' | 'hypothesize';
export type DemandTimeFrame = 'present' | 'past' | 'future' | 'conditional';
export type ResponseLoad = 'short' | 'developed' | 'extended'; // ~15 / ~40 / ~70+ words
export type LexicalReach = 'everyday' | 'topical' | 'abstract';
export type LearnStructure =
  | 'opinion'
  | 'justification'
  | 'comparison'
  | 'negation'
  | 'perfect'
  | 'imperfect'
  | 'near-future'
  | 'simple-future'
  | 'conditional'
  | 'subjunctive';
export type DemandProvenance = 'inferred' | 'reviewed' | 'authored';

export interface QuestionDemands {
  cognitiveDemand: CognitiveDemand;
  timeFrames: DemandTimeFrame[]; // ≥1
  structures: LearnStructure[];
  responseLoad: ResponseLoad;
  lexicalReach: LexicalReach;
  /** English. What a complete answer MUST contain. Prompt material for L2 ONLY — never L1-checked. */
  sufficientAnswer: string;
  provenance: DemandProvenance;
  inferenceConfidence?: number; // present only when provenance === 'inferred'
}

export type DemandLevel = 'A1' | 'A2' | 'B1' | 'B2';

export interface DemandReviewStatus {
  status: 'draft' | 'approved';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

/** One entry in a `src/data/learn/demands/<topic>.json` file — §12. */
export interface LearnDemandsEntry {
  questionId: string;
  demands: QuestionDemands;
  /**
   * Never authored deliberately (§7: authors cannot assert a level). Present
   * only so the demand-level-mismatch validator rule has something real to
   * catch — see docs §16 example F.
   */
  checkedInLevel?: DemandLevel;
  review: DemandReviewStatus;
}

/** Shape of one `src/data/learn/demands/<topic>.json` file — §12. */
export interface LearnDemandsFile {
  schemaVersion: 'learn-demands-v1';
  topicKey: string;
  entries: LearnDemandsEntry[];
}
