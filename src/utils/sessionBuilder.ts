import { getTopicQuestions, QUESTIONS } from '../data/gameData';
import type { Question, SessionMode, SkillProfile, SessionQuestion, TopicMasteryEntry, DifficultyTier } from '../types';
import { preferredFirst, DEFAULT_DIFFICULTY } from './difficultyConfig';
import type { QuestionV2, SessionFilters, CEFRLevel, SkillType } from '../types/questions';
import { contentClient } from '../services/content/contentClient';
import { inferQuestionMetadata } from '../services/content/questionMetadata';
import { isSkillReady } from '../services/coach/skillGraph';
import { getBeliefSnapshot } from '../services/coach/coachStorage';
import type { SessionBlend } from '../types/coach';

/**
 * Coach loop: does this question exercise the skill the coach asked us to focus
 * on? Uses heuristic metadata inference (grammar focus + skill type) so plain
 * Question records can still be biased toward a recommended skill.
 */
function matchesFocusSkill(q: Question, focusedSkillId: string | null): boolean {
  if (!focusedSkillId) return false;
  const meta = inferQuestionMetadata(q);
  return meta.grammarFocus.includes(focusedSkillId) || meta.skill === focusedSkillId;
}

export const SESSION_TARGET: Record<SessionMode, number> = {
  quick: 5,
  standard: 10,
  deep_dive: 20,
  full_topic: 999,
};

export const SESSION_LABEL: Record<SessionMode, string> = {
  quick: 'Quick (5 questions)',
  standard: 'Standard (10 questions)',
  deep_dive: 'Deep Dive (20 questions)',
  full_topic: 'Full Topic',
};

export const SESSION_DURATION: Record<SessionMode, string> = {
  quick: '~10 min',
  standard: '~20 min',
  deep_dive: '~40 min',
  full_topic: 'All questions',
};

function getWeakSkillIds(skillProfile: SkillProfile): string[] {
  return Object.entries(skillProfile)
    .filter(([, entry]) => entry.score < 0.55)
    .sort((a, b) => a[1].score - b[1].score)
    .map(([id]) => id);
}

function applyDifficultyDistribution(questions: Question[], target: number): Question[] {
  if (questions.length <= target) return questions;

  const d1 = questions.filter(q => q.difficulty === 1);
  const d2 = questions.filter(q => q.difficulty === 2);
  const d3 = questions.filter(q => q.difficulty === 3);

  const want1 = Math.round(target * 0.6);
  const want2 = Math.round(target * 0.3);
  const want3 = target - want1 - want2;

  const pick = (pool: Question[], n: number) => pool.slice(0, Math.max(0, n));

  const selected = [
    ...pick(d1, want1),
    ...pick(d2, want2),
    ...pick(d3, want3),
  ];

  // Fill remaining slots from whatever is left
  if (selected.length < target) {
    const used = new Set(selected.map(q => q.id));
    for (const q of questions) {
      if (!used.has(q.id)) {
        selected.push(q);
        if (selected.length >= target) break;
      }
    }
  }

  return selected.slice(0, target);
}

export function buildSessionQuestions(
  topicKey: string | null,
  mode: SessionMode,
  skillProfile: SkillProfile,
  topicMastery: TopicMasteryEntry | null,
  difficulty: DifficultyTier = DEFAULT_DIFFICULTY,
  focusedSkillId: string | null = null,
  sessionBlend: SessionBlend | null = null,
): Question[] {
  const allQuestions = preferredFirst(
    topicKey ? getTopicQuestions(topicKey) : [...QUESTIONS],
    difficulty,
  );
  const seen = new Set<string>(topicMastery?.uniqueQuestionsAnswered ?? []);

  // If the decision engine provided a blend, merge its focus skills with the
  // provided focusedSkillId.  The blend's focusTopicKey is respected already
  // via the topicKey parameter passed by the caller.
  const blendSkillIds = sessionBlend?.focusSkillIds ?? [];
  let effectiveFocusSkill =
    focusedSkillId ??
    (blendSkillIds.length > 0 ? blendSkillIds[0] : null);

  // Prerequisite gate: if the focus skill is blocked by an under-developed
  // prerequisite, sort questions toward that prerequisite instead so the
  // learner builds the foundation before the harder skill.
  if (effectiveFocusSkill) {
    const { ready, blockers } = isSkillReady(effectiveFocusSkill, getBeliefSnapshot());
    if (!ready && blockers.length > 0) {
      effectiveFocusSkill = blockers[0];
    }
  }

  const weakSkillIds = blendSkillIds.length > 0
    ? blendSkillIds
    : getWeakSkillIds(skillProfile);

  const unseen = allQuestions.filter(q => !seen.has(q.id));
  const seenQs = allQuestions.filter(q => seen.has(q.id));

  // Sort unseen: coach-focused skill first, then by difficulty ascending.
  // The focused skill comes from the active recommendation / session blend.
  const sorted = [...unseen].sort((a, b) => {
    const fa = matchesFocusSkill(a, effectiveFocusSkill) ? 0 : 1;
    const fb = matchesFocusSkill(b, effectiveFocusSkill) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return a.difficulty - b.difficulty;
  });

  // If we have weak skills, interleave some difficulty-2 questions earlier to target them
  if (weakSkillIds.length > 0 && sorted.length > 3) {
    const d2ForWeak = sorted.filter(q => q.difficulty === 2).slice(0, Math.ceil(weakSkillIds.length / 2));
    const others = sorted.filter(q => !d2ForWeak.includes(q));
    // Insert d2 weak-targeting questions at position 2-3 in the sequence
    sorted.splice(0, sorted.length, ...others.slice(0, 2), ...d2ForWeak, ...others.slice(2));
  }

  const target = mode === 'full_topic'
    ? (unseen.length > 0 ? unseen.length : allQuestions.length)
    : SESSION_TARGET[mode];

  let selected = applyDifficultyDistribution(sorted, target);

  // Pad with seen questions if needed
  if (selected.length < target && seenQs.length > 0) {
    const usedIds = new Set(selected.map(q => q.id));
    for (const q of seenQs) {
      if (!usedIds.has(q.id)) {
        selected.push(q);
        if (selected.length >= target) break;
      }
    }
  }

  return selected;
}

// Widened to accept QuestionV2 — QuestionV2 is a structural superset of Question
// so the returned SessionQuestion.question field is still type-compatible.
export function makeSessionQuestion(question: Question | QuestionV2): SessionQuestion {
  return {
    question: question as Question,
    status: 'pending',
    attempts: [],
    bestScore: null,
    savedVocab: [],
  };
}

// ── buildSession ──────────────────────────────────────────────────────────────
// New multi-dimensional session builder. Runs alongside buildSessionQuestions()
// which is kept intact for all existing call sites.
//
// Returns QuestionV2[] — a structural superset of Question[], so results can be
// passed directly to coachService.evaluate(), apiClient.getAIFeedback(), and
// makeSessionQuestion() without any downstream changes.

// Per-exam distribution: how many questions of each skill type to include.
const EXAM_DISTRIBUTIONS: Record<string, { skill: SkillType; count: number }[]> = {
  IGCSE: [
    { skill: 'roleplay',     count: 5 },
    { skill: 'description',  count: 2 },
    { skill: 'opinion',      count: 2 },
    { skill: 'narration',    count: 1 },
  ],
  DELF: [
    { skill: 'presentation', count: 1 },
    { skill: 'opinion',      count: 3 },
    { skill: 'conversation', count: 2 },
  ],
  GCSE: [
    { skill: 'roleplay',     count: 4 },
    { skill: 'description',  count: 2 },
    { skill: 'opinion',      count: 2 },
  ],
};

// Maps grammar skill IDs (from SKILL_DEFS) to the SkillType they relate to.
// Used in adaptive mode to derive which skill types to prioritise.
const GRAMMAR_TO_SKILL: Partial<Record<string, SkillType>> = {
  tense_past:   'narration',
  hypothetical: 'hypothetical',
  subjunctive:  'opinion',
  comparative:  'comparison',
  opinion:      'opinion',
  connectors:   'presentation',
  contrast:     'comparison',
  relative_pron:'description',
};

// Estimates the learner's likely proficiency level from their skill profile scores.
function inferCEFRFromProfile(profile: SkillProfile): CEFRLevel {
  const scores = Object.values(profile).map(e => e.score);
  if (scores.length === 0) return 'A2';
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg < 0.35) return 'A1';
  if (avg < 0.55) return 'A2';
  if (avg < 0.75) return 'B1';
  return 'B2';
}

// Scores a question by how well it targets a learner's current weaknesses.
function adaptiveScore(
  q: QuestionV2,
  weakSkillIds: string[],
  weakSkillTypes: SkillType[],
  seenSet: Set<string>,
): number {
  let score = 0;
  if (seenSet.has(q.id)) score -= 20;
  score += q.grammarFocus.filter(g => weakSkillIds.includes(g)).length * 10;
  if (weakSkillTypes.includes(q.skill)) score += 8;
  return score;
}

// Generic difficulty distribution for QuestionV2 arrays.
function applyDifficultyDistributionV2(questions: QuestionV2[], target: number): QuestionV2[] {
  if (questions.length <= target) return questions;

  const d1 = questions.filter(q => q.difficulty === 1);
  const d2 = questions.filter(q => q.difficulty === 2);
  const d3 = questions.filter(q => q.difficulty === 3);

  const want1 = Math.round(target * 0.6);
  const want2 = Math.round(target * 0.3);
  const want3 = target - want1 - want2;

  const pick = (pool: QuestionV2[], n: number) => pool.slice(0, Math.max(0, n));
  const selected = [
    ...pick(d1, want1),
    ...pick(d2, want2),
    ...pick(d3, want3),
  ];

  if (selected.length < target) {
    const used = new Set(selected.map(q => q.id));
    for (const q of questions) {
      if (!used.has(q.id)) { selected.push(q); if (selected.length >= target) break; }
    }
  }

  return selected.slice(0, target);
}

export async function buildSession(
  filters: SessionFilters,
  skillProfile?: SkillProfile,
): Promise<QuestionV2[]> {
  const {
    topicKey,
    level,
    skill,
    exam,
    adaptive = false,
    excludeIds = [],
    mode = 'standard',
    examSetId,
  } = filters;

  const targetCount = filters.maxCount ?? (mode === 'full_topic' ? 999 : SESSION_TARGET[mode]);

  // ── Path 1: pre-defined exam set ──────────────────────────────────────────
  if (examSetId) {
    const set = await contentClient.getExamSet(examSetId);
    const questions = await contentClient.getQuestionsByIds(set.question_ids);
    return questions.slice(0, targetCount);
  }

  // ── Path 2: exam framework distribution ───────────────────────────────────
  if (exam) {
    const distribution = EXAM_DISTRIBUTIONS[exam];
    if (distribution) {
      const buckets = await Promise.all(
        distribution.map(async ({ skill: s, count }) => {
          const pool = await contentClient.queryQuestions({
            examTag: exam,
            skill: s,
            level,
            validationStates: ['approved'],
          });
          const available = pool.filter(q => !excludeIds.includes(q.id));
          return applyDifficultyDistributionV2(available, count);
        }),
      );
      return buckets.flat().slice(0, targetCount);
    }
    // Unrecognised exam framework — fall through to filtered path with examTag filter
    const pool = await contentClient.queryQuestions({
      examTag: exam, level, skill, validationStates: ['approved'],
    });
    return applyDifficultyDistributionV2(
      pool.filter(q => !excludeIds.includes(q.id)),
      targetCount,
    );
  }

  // ── Path 3: adaptive (SkillProfile-driven) ────────────────────────────────
  if (adaptive && skillProfile) {
    const weakSkillIds = Object.entries(skillProfile)
      .filter(([, e]) => e.score < 0.55)
      .sort((a, b) => a[1].score - b[1].score)
      .map(([id]) => id);

    const weakSkillTypes = [...new Set(
      weakSkillIds.map(id => GRAMMAR_TO_SKILL[id]).filter((t): t is SkillType => !!t),
    )];

    const inferredLevel = level ?? inferCEFRFromProfile(skillProfile);

    const pool = await contentClient.queryQuestions({
      topicKey,
      level: inferredLevel,
      validationStates: ['approved'],
    });

    const seenSet = new Set(excludeIds);
    const scored = pool
      .map(q => ({ q, s: adaptiveScore(q, weakSkillIds, weakSkillTypes, seenSet) }))
      .sort((a, b) => b.s - a.s);

    return scored.slice(0, targetCount).map(({ q }) => q);
  }

  // ── Path 4: direct filter (level + topic + skill) ─────────────────────────
  const pool = await contentClient.queryQuestions({
    topicKey,
    level,
    skill,
    validationStates: ['approved'],
  });

  const unseen = pool.filter(q => !excludeIds.includes(q.id));
  const seen   = pool.filter(q =>  excludeIds.includes(q.id));

  let selected = applyDifficultyDistributionV2(
    unseen.sort((a, b) => a.difficulty - b.difficulty),
    targetCount,
  );

  // Pad with seen questions if pool is thin
  if (selected.length < targetCount) {
    const usedIds = new Set(selected.map(q => q.id));
    for (const q of seen) {
      if (!usedIds.has(q.id)) { selected.push(q); if (selected.length >= targetCount) break; }
    }
  }

  return selected;
}
