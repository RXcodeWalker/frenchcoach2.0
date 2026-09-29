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

/**
 * The closed sub-topic list per topic area, from the 0520 syllabus 2025–27
 * (Syl p.14; exam-conduct §22). The syllabus lists these as examples of what
 * each area covers; the app uses them as its closed `subTopic` vocabulary so a
 * conversation is always declared against one real sub-topic, and the
 * validator can check it belongs to the topic's area (`sub-topic-not-in-area`).
 * Strings are the syllabus's own English headings, verbatim.
 */
export const SUB_TOPICS_BY_AREA = {
  A: ['Time expressions', 'Food and drink', 'The human body and health', 'Travel and transport'],
  B: ['Self, family and friends', 'In the home', 'Colours', 'Clothes and accessories', 'Leisure time'],
  C: [
    'People and places',
    'The natural world, the environment, the climate and the weather',
    'Communications and technology',
    'The built environment',
    'Measurements',
    'Materials',
  ],
  D: ['Education', 'Work'],
  E: ['Countries, nationalities and languages', 'Culture, customs, faiths and celebrations'],
} as const satisfies Record<TopicArea, readonly string[]>;

export type SubTopic = (typeof SUB_TOPICS_BY_AREA)[TopicArea][number];

/**
 * Syllabus sub-topics too thin to carry a 4-minute conversation on their own.
 * Valid `subTopic` values (they're in the syllabus), but never a standalone
 * topic — enforced authoring-side by corpusLint's `thin-sub-topic`, never at
 * runtime (see docs/guides/corpus-matrix.md).
 */
export const THIN_SUB_TOPICS: readonly SubTopic[] = ['Time expressions', 'Colours', 'Measurements', 'Materials'];

/** Topic conversation 1 draws from A or B; topic conversation 2 from C, D or E (TN p.3, Syl p.19; exam-conduct §21). */
export const TOPIC_SLOT_AREAS: Readonly<Record<'topic1' | 'topic2', readonly TopicArea[]>> = {
  topic1: ['A', 'B'],
  topic2: ['C', 'D', 'E'],
};

/** How the examiner addresses the candidate in the role play (TN pp.16–24 pattern): friend roles tu, stranger/official roles vous. */
export type ExaminerRegister = 'tu' | 'vous';

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
  /**
   * The alternative question's **ordered parts** (D9, exam-conduct §13) — not a
   * list of separate alternatives. The engine asks `[0]`, waits for an answer,
   * then `[1]`, the same way a main question's second part works; a two-part
   * main question's alternative keeps the two-part shape.
   *
   * Topic Q3–Q5 MUST be non-empty; topic Q1–Q2 and role-play tasks MUST be
   * empty (TN p.6, p.7) — all enforced by the validator, not the type.
   */
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

/** One 5-question transactional role-play scenario, examiner-question style. */
export interface RolePlayScenario {
  scenarioId: string;
  topicArea: TopicArea;
  title: string;
  /**
   * How the examiner addresses the candidate, set by the examiner's role
   * (content-authoring §3). Unhashed, like `setup`: it never reaches
   * SessionQuestionSet. Checked authoring-side only (patternLint's
   * `register-mismatch` warning).
   */
  examinerRegister: ExaminerRegister;
  /**
   * French scene-setting paragraph: who the candidate is, the situation, and
   * who the examiner plays ("Je suis…"). Spoken by the examiner and shown on
   * the candidate prep card; NOT projected into SessionQuestionSet (UI layer
   * only — see ExamMode.tsx) and so never enters the content hash.
   */
  setup: string;
  /** Validator: exactly 5, every task.part === 'rolePlay'. mainText is an examiner-asked question. */
  tasks: AuthoredQuestion[];
}

export interface AuthoredTopic {
  topicArea: TopicArea;
  subTopic: SubTopic;
  /**
   * Short French name of the conversation's subject, spoken by the UI when the
   * conversation starts (TN p.7 #12, p.8 #17; exam-conduct §5). Unhashed, like
   * `setup`: never projected into SessionQuestionSet, so it never enters the
   * content hash, the ConductLog or the judge input.
   */
  title: string;
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
