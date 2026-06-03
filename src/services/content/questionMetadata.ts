import type { Question } from '../../types';
import type { CEFRLevel, QuestionV2, SkillType } from '../../types/questions';
import { EXAM_SETS } from '../../data/questions';

// ── One-time computed sets ────────────────────────────────────────────────────

// Question IDs that appear in any EXAM_SETS entry → tagged as IGCSE
const IGCSE_QUESTION_IDS = new Set(EXAM_SETS.flatMap(s => s.questions));

// Advanced topic keys whose difficulty-1 questions are still B1-appropriate
const ADVANCED_TOPICS = new Set([
  'pro', 'culture', 'lifestyle', 'news', 'slang', 'survival', 'debate', 'art',
]);

// ── supportedLevels inference ─────────────────────────────────────────────────
// Rules are heuristic starting points — all inferred questions get levelsCurated: false.
// difficulty 1 → all four levels (simple, accessible topics)
// difficulty 2 → A2/B1/B2 (requires some base competency)
// difficulty 3 → B1/B2 (abstract; A1 learners lack the conceptual vocabulary)
// isPastPaper   → minimum A2 (IGCSE content is designed for the A2–B2 range)
// Advanced topic at difficulty 1 → narrow to A2/B1/B2 (topics need some grounding)

function inferSupportedLevels(q: Question): CEFRLevel[] {
  if (q.difficulty === 3) return ['B1', 'B2'];
  if (q.difficulty === 2) return ['A2', 'B1', 'B2'];
  // difficulty 1
  if (q.isPastPaper) return ['A2', 'B1', 'B2'];
  if (ADVANCED_TOPICS.has(q.topicKey)) return ['A2', 'B1', 'B2'];
  return ['A1', 'A2', 'B1', 'B2'];
}

// ── skill inference ───────────────────────────────────────────────────────────
// Matched against question.text (lowercased). First match wins.

function inferSkill(q: Question): SkillType {
  if (q.topicKey === 'role_play') return 'roleplay';
  const t = q.text.toLowerCase();
  if (/si tu |si c[''']était|si j[''']avais|si vous/.test(t)) return 'hypothetical';
  if (/à ton avis|penses-tu|qu[''']est-ce que tu penses|quel est ton avis|selon toi/.test(t)) return 'opinion';
  if (/compare|différences?|préfères?-tu|meilleur|mieux que|plutôt|laquelle/.test(t)) return 'comparison';
  if (/qu[''']est-ce que tu as fait|raconte|quelle journée|décris une|une fois où|la dernière fois/.test(t)) return 'narration';
  if (/présente(-toi)?|décris ta ville|décris ton quartier|parle de ta région/.test(t)) return 'presentation';
  if (/tu parles|tu discutes|une conversation|dialogu/.test(t)) return 'conversation';
  return 'description';
}

// ── grammarFocus inference ────────────────────────────────────────────────────
// Matched against question.modelAnswer (lowercased). All matches are collected.
// Keys must correspond to SKILL_DEFS entries in diagnosticEngine.ts.

function inferGrammarFocus(q: Question): string[] {
  const focus: string[] = [];
  const a = q.modelAnswer.toLowerCase();

  if (/est allé|est venu|est parti|est arrivé|ai fait|a mangé|ai vu|avons/.test(a)) focus.push('tense_past');
  if (/si j[''']étais|si j[''']avais|j[''']aurais|je ferais|ce serait/.test(a)) focus.push('hypothetical');
  if (/je pense que|à mon avis|selon moi|il me semble|je crois que/.test(a)) focus.push('opinion');
  if (/plus .{1,20} que|moins .{1,20} que|aussi .{1,20} que|mieux que|meilleur/.test(a)) focus.push('comparative');
  if (/il faut que|bien que|pour que|avant que|à moins que/.test(a)) focus.push('subjunctive');
  if (/qui est|que j[''']|dont j[''']|où j[''']|ce qui|ce que/.test(a)) focus.push('relative_pron');
  if (/d[''']abord|ensuite|puis|enfin|finalement|après ça/.test(a)) focus.push('connectors');
  if (/cependant|en revanche|par contre|néanmoins|pourtant/.test(a)) focus.push('contrast');

  return [...new Set(focus)];
}

// ── examTags inference ────────────────────────────────────────────────────────

function inferExamTags(q: Question): string[] {
  if (q.isPastPaper || IGCSE_QUESTION_IDS.has(q.id)) return ['IGCSE'];
  return [];
}

// ── estimatedDuration inference ───────────────────────────────────────────────

function inferDuration(q: Question): number {
  if (q.difficulty === 1) return 90;
  if (q.difficulty === 2) return 120;
  return 150;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enriches an existing Question into a QuestionV2 using heuristic inference.
 * All existing fields are preserved unchanged — this is purely additive.
 *
 * ⚠ Inferred values (especially supportedLevels and skill) are starting points
 * for curation. levelsCurated is false for all migrated questions. Override
 * supported_levels in Supabase during content review to correct mis-inferences.
 */
export function inferQuestionMetadata(q: Question): QuestionV2 {
  return {
    // Existing fields — untouched
    id:           q.id,
    topicKey:     q.topicKey,
    text:         q.text,
    hint:         q.hint,
    difficulty:   q.difficulty,
    followUps:    q.followUps,
    modelAnswer:  q.modelAnswer,
    keyVocab:     q.keyVocab,
    isPastPaper:  q.isPastPaper,
    year:         q.year,
    paperCode:    q.paperCode,

    // New fields — inferred
    supportedLevels:   inferSupportedLevels(q),
    levelsCurated:     false,
    skill:             inferSkill(q),
    grammarFocus:      inferGrammarFocus(q),
    vocabularyFocus:   [q.topicKey],
    estimatedDuration: inferDuration(q),
    examTags:          inferExamTags(q),
    levelRubrics:      undefined,

    // Provenance
    source:          q.isPastPaper ? 'past_paper' : 'manual',
    validationState: 'approved',
  };
}
