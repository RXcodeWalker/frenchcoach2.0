/**
 * S11 question-bank authoring contract — distinct from the S3 annotator
 * contract (stt/types.ts SessionQuestion/SessionQuestionSet). Scoring tags
 * that stt/types.ts leaves optional-with-silent-fallback are REQUIRED here,
 * so a mistagged item fails loudly at validate-time instead of silently
 * degrading a score (see architecture doc §1.6).
 *
 * `content` is the ONLY part hashed for score-reproducibility (§3.5); `review`
 * is mutable operational metadata excluded from the hash. subTopic/difficulty/
 * targetStructures are authored selection/coaching metadata — never a rubric
 * signal (05-doc) — and, being outside `content`'s hashed projection, never
 * perturb the hash either.
 *
 * 0520-specific. NOT a board abstraction (CLAUDE.md hard constraint #1).
 */

import type { SessionPart } from '../../../domain/igcse/stt/types';
import type { TimeFrame } from '../../../domain/igcse/evidence/types';

export type TopicArea = 'A' | 'B' | 'C' | 'D' | 'E';

/** Free-form within a topic area; validator requires non-empty. */
export type SubTopic = string;

export type Difficulty = 'foundation' | 'core' | 'higher';

/** Closed 0520-relevant list — extend as authored content demands. */
export type TargetStructure =
  | 'present'
  | 'perfect'
  | 'imperfect'
  | 'near-future'
  | 'simple-future'
  | 'conditional'
  | 'opinion'
  | 'justification'
  | 'comparison'
  | 'negation';

export type ContentProvenance = 'original-practice';

export interface AuthoredQuestion {
  /** Immutable, never renumbered across a revision (see §8.1 no-reuse guard). */
  questionId: string;
  part: SessionPart;
  mainText: string;
  /** Topic Q3–Q5 MUST be non-empty — enforced by the validator, not the type. */
  alternativeTexts: string[];
  /** Required for topic questions; role-play tasks carry the set-level topicArea instead. */
  topicArea?: TopicArea;
  /** Selection/coaching only — never a rubric signal. Required for topic questions. */
  subTopic?: SubTopic;
  /** Selection/coaching only — never a rubric signal. Required for topic questions. */
  difficulty?: Difficulty;
  /** Selection/coaching only — never a rubric signal. Required (≥1) for topic questions. */
  targetStructures?: TargetStructure[];
  /** Required for topic questions — kills the silent cue-word fallback (architecture doc §1.6). */
  expectedTimeFrame?: TimeFrame;
  /** Explicit, never defaulted (stt/types.ts SessionQuestion defaults to 1 when absent). */
  partsExpected: 1 | 2;
  /** Required iff partsExpected === 2; validator rejects otherwise. */
  secondPartText?: string;
}

/** One 5-task transactional role-play scenario (TN instruction style). */
export interface RolePlayScenario {
  scenarioId: string;
  topicArea: TopicArea;
  title: string;
  /** Validator: exactly 5, every task.part === 'rolePlay'. */
  tasks: AuthoredQuestion[];
}

export interface AuthoredTopic {
  topicArea: TopicArea;
  subTopic: SubTopic;
  /** Validator: exactly 5 (Q1..Q5), every question.part matches the topic slot. */
  questions: AuthoredQuestion[];
  /** Extends the existing SessionQuestionSet.furtherQuestions tuple guard. */
  furtherQuestions: readonly [string, string];
}

/** Immutable authored exam content — the ONLY thing that feeds the content hash (§3.5). */
export interface AuthoredContent {
  rolePlay: RolePlayScenario;
  topic1: AuthoredTopic;
  topic2: AuthoredTopic;
}

export interface ReviewStatus {
  status: 'draft' | 'approved';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

/** Full record: stable identity + frozen schema id + immutable content + mutable operational metadata. */
export interface AuthoredQuestionSet {
  /** Stable content identity, never reassigned to different content (§8.1). */
  questionSetId: string;
  schemaVersion: 'question-bank-v1';
  /** Hashed; operational fields below are NOT. */
  content: AuthoredContent;
  /** Asserted, never TN-derived. */
  provenance: ContentProvenance;
  /** Operational, mutable — excluded from the content hash (§3.3). */
  review: ReviewStatus;
}
