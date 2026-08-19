// C1 and C2 are intentionally excluded — the platform has no content, rubrics,
// or evaluation logic for those levels. Add them only when content exists.
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2';

// The skill a question primarily exercises.
export type SkillType =
  | 'narration'      // recounting events; typically requires past tense
  | 'opinion'        // giving and justifying a viewpoint
  | 'comparison'     // comparing two things, places, or people
  | 'hypothetical'   // si-clause / conditional thinking
  | 'conversation'   // dialogue / back-and-forth exchange
  | 'roleplay'       // scenario-based interaction with a defined role
  | 'presentation'   // extended monologue / prepared speech
  | 'description';   // describing a person, place, image, or object

// 'ai_generated' and 'imported' are reserved for Phase 5+; included now to keep
// the type forward-compatible so contentClient filtering logic compiles cleanly.
export type QuestionSource = 'manual' | 'past_paper' | 'ai_generated' | 'imported';

// Per-level rubric entry — what is expected of a learner at this CEFR level.
// Used by the evaluation engine to grade answers differently depending on targetLevel.
export interface LevelRubricEntry {
  vocabulary: string;
  grammar: string;
  discourse: string;
  communication: string;
}

// QuestionV2 is a strict superset of the existing Question interface.
// All existing fields are preserved unchanged so every call site that receives
// a Question continues to work without modification.
export interface QuestionV2 {
  // ── Existing Question fields (unchanged) ──────────────────────────────────
  id: string;
  topicKey: string;
  text: string;
  hint: string;
  // `difficulty` = topic/content complexity (how abstract or conceptually demanding
  // the subject matter is). This is INDEPENDENT of CEFR proficiency level.
  // A difficulty-1 question can still be answered at B2; a difficulty-3 question
  // may be inaccessible at A1 not because the learner lacks vocabulary but because
  // the concept itself requires more world knowledge. Kept as `difficulty` (not
  // renamed) to preserve backwards compatibility with all existing call sites.
  difficulty: 1 | 2 | 3;
  followUps: string[];
  modelAnswer: string;
  keyVocab: { fr: string; en: string }[];
  isPastPaper?: boolean;
  year?: number;
  paperCode?: string;

  // ── New: CEFR proficiency dimension ───────────────────────────────────────
  // Which CEFR proficiency levels can meaningfully engage with this question.
  // Most questions support all four levels — the same prompt can be answered
  // with simple A1 sentences or complex B2 discourse. A very abstract topic
  // (e.g. "La crise climatique mondiale") may be narrowed to ['B1', 'B2'].
  //
  // ⚠ For migrated questions, values are INFERRED heuristically and should be
  // treated as a starting point for curation, not permanent truth. Override
  // `supported_levels` in Supabase during content review.
  supportedLevels: CEFRLevel[];

  // Whether supportedLevels was manually curated (true) or heuristically inferred.
  levelsCurated?: boolean;

  // ── New: skill / grammar classification ───────────────────────────────────
  skill: SkillType;
  grammarFocus: string[];       // grammar_tags.id values (e.g. 'tense_past', 'subjunctive')
  vocabularyFocus: string[];    // domain labels matching topic keys (e.g. 'travel', 'food')
  estimatedDuration: number;    // expected speaking time in seconds

  // ── New: exam system membership ───────────────────────────────────────────
  examTags: string[];           // exam_frameworks.id values: 'IGCSE', 'DELF', 'GCSE', …

  // Optional per-question per-level rubric overrides.
  // If absent, evaluation falls back to global level_rubrics for the targetLevel.
  // Use for exam-specific questions that carry official marking criteria.
  levelRubrics?: Partial<Record<CEFRLevel, LevelRubricEntry>>;

  // ── Provenance ────────────────────────────────────────────────────────────
  source: QuestionSource;
  validationState: 'approved';  // only approved questions reach the client in Phase 1/2
}

// ── Session building ──────────────────────────────────────────────────────────

import type { SessionMode } from './index';

export interface SessionFilters {
  topicKey?: string;
  // `level` filters questions whose supportedLevels includes this value.
  // The same questions are returned regardless of level; only the evaluation
  // rubric changes when the learner answers.
  level?: CEFRLevel;
  skill?: SkillType;
  exam?: string;           // exam_frameworks.id
  adaptive?: boolean;      // use SkillProfile to prioritise grammar-weak questions
  excludeIds?: string[];   // question IDs already seen / answered in this topic
  maxCount?: number;       // overrides mode-derived default
  mode?: SessionMode;
  examSetId?: string;      // load a pre-defined ordered exam set
}
