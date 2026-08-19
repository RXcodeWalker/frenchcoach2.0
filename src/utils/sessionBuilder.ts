import { getTopicQuestions, QUESTIONS } from '../data/gameData';
import type { Question, SessionMode, SkillProfile, SessionQuestion, TopicMasteryEntry, DifficultyTier } from '../types';
import { preferredFirst, DEFAULT_DIFFICULTY } from './difficultyConfig';
import type { QuestionV2 } from '../types/questions';
import { inferQuestionMetadata } from '../services/content/questionMetadata';
import { isSkillReady } from '../services/coach/skillGraph';
import { getBeliefSnapshot } from '../services/coach/coachStorage';
import { getEligibleReviewQuestion, advanceReviewPoolSessions } from '../services/coach/reviewPool';
import type { SessionBlend } from '../types/coach';
import { resolveFeatureStatus } from '../config/featureFlags';
import { STORAGE_KEYS, storageGet } from '../services/persistence/storage';
import { deriveAbility, coldStart } from '../domain/learn/ability/deriveAbility';
import { aimFromMigratedTier, computeSessionTarget } from '../domain/learn/selection/sessionTarget';
import { planSlots, bandFor } from '../domain/learn/selection/planSlots';
import { selectQuestions } from '../domain/learn/selection/selectQuestions';
import type { DemandBand, SlotType } from '../domain/learn/selection/types';

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
  single: 1,
  quick: 5,
  standard: 10,
  deep_dive: 20,
  full_topic: 999,
};

export const SESSION_LABEL: Record<SessionMode, string> = {
  single: 'Single question',
  quick: 'Quick (5 questions)',
  standard: 'Standard (10 questions)',
  deep_dive: 'Deep Dive (20 questions)',
  full_topic: 'Full Topic',
};

// standard's worst case is not 10 recordings: up to PRACTICE_MAX_PER_SESSION (3)
// Say-It-Again turns and FOLLOWUP_MAX_PER_SESSION (3) follow-up turns can each
// add a recording on top of the 10 main questions — 16 recordings worst case,
// not 10. '~20 min' understated that; revised to a range that covers it.
export const SESSION_DURATION: Record<SessionMode, string> = {
  single: '~2 min',
  quick: '~10 min',
  standard: '~25–30 min',
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

/** docs §8.4 — carries the slot metadata midSessionAdjust needs; absent on the legacy path. */
export interface BuiltSessionQuestionSlot {
  questionId: string;
  slotType: SlotType;
  slotBand: DemandBand | null;
}

export interface BuiltSessionQuestions {
  questions: Question[];
  /** The question id spliced in as a spaced-review re-exposure, if any. */
  reviewQuestionId: string | null;
  /** Present only on the adaptive path (docs §8) — one entry per question in `questions`, same order. */
  slots?: BuiltSessionQuestionSlot[];
}

/**
 * docs (Learn adaptive difficulty) §16 Stage 6 — flag-gated dispatcher. The
 * signature is unchanged from the legacy function so Learn.tsx's call site
 * needs no changes; `learnAdaptiveDifficulty` stays 'coming-soon' until
 * Stage 10 wires the UI (Aim picker, measured-level display) that makes the
 * adaptive path's output meaningful to show a learner.
 */
export function buildSessionQuestions(
  topicKey: string | null,
  mode: SessionMode,
  skillProfile: SkillProfile,
  topicMastery: TopicMasteryEntry | null,
  difficulty: DifficultyTier = DEFAULT_DIFFICULTY,
  focusedSkillId: string | null = null,
  sessionBlend: SessionBlend | null = null,
): BuiltSessionQuestions {
  if (resolveFeatureStatus('learnAdaptiveDifficulty') !== 'live') {
    return buildSessionQuestionsLegacy(topicKey, mode, skillProfile, topicMastery, difficulty, focusedSkillId, sessionBlend);
  }
  return buildSessionQuestionsAdaptive(topicKey, mode, topicMastery, sessionBlend);
}

/**
 * docs §8 — slot-based selector path. Reads ability from the belief snapshot
 * directly (same source buildSessionQuestionsLegacy already reads at the
 * prerequisite gate below) rather than taking it as a parameter, exactly as
 * the legacy function reads getBeliefSnapshot() itself. Aim resolves from the
 * one-time migrated `frenchCoach_difficulty` read (docs §6.4) — no SET_AIM
 * reducer action exists yet; that lands in Stage 10.
 */
function buildSessionQuestionsAdaptive(
  topicKey: string | null,
  mode: SessionMode,
  topicMastery: TopicMasteryEntry | null,
  sessionBlend: SessionBlend | null,
): BuiltSessionQuestions {
  const pool = topicKey ? getTopicQuestions(topicKey) : [...QUESTIONS];
  const seen = new Set<string>(topicMastery?.uniqueQuestionsAnswered ?? []);

  const snapshot = getBeliefSnapshot();
  const migratedTier = storageGet<DifficultyTier | null>(STORAGE_KEYS.difficulty, null);
  // No snapshot at all yet (brand-new learner, no evidence log) -> the same
  // coldStart() path deriveAbility itself falls back to when totalWeight is 0.
  const ability = snapshot ? deriveAbility(snapshot, migratedTier ?? undefined) : coldStart(migratedTier ?? undefined);
  const aim = aimFromMigratedTier(migratedTier);
  const sessionTarget = computeSessionTarget(ability.abilityScore, aim);

  const target = mode === 'full_topic'
    ? (pool.length > seen.size ? pool.length - seen.size : pool.length)
    : SESSION_TARGET[mode];

  const blend: SessionBlend = sessionBlend ?? {
    warmupPct: 20,
    reviewPct: 30,
    targetSkillPct: 30,
    stretchPct: 10,
    choicePct: 10,
    focusSkillIds: [],
  };

  const slots = planSlots({ sessionBlend: blend, sessionTarget, count: target });

  advanceReviewPoolSessions();
  const { selected } = selectQuestions(
    {
      pool,
      slots,
      chosenIds: new Set<string>(),
      seenIds: seen,
      focusSkillIds: blend.focusSkillIds,
      activeDemandProblem: null,
      getReviewQuestion: (chosenIds) => {
        if (!topicKey) return null;
        const alreadyInSession = new Set([...seen, ...chosenIds]);
        return getEligibleReviewQuestion(topicKey, alreadyInSession);
      },
    },
    { beliefSnapshot: snapshot },
  );

  const reviewPick = selected.find((s) => s.slot === 'review');
  return {
    questions: selected.map((s) => s.question),
    reviewQuestionId: reviewPick ? reviewPick.question.id : null,
    // docs §8.4 — the *planned* band for the slot type, not necessarily the
    // exact band the escalation ladder (§8.3) ultimately matched under; this
    // is what midSessionAdjust needs to shift a target band by -1.0.
    slots: selected.map((s) => ({
      questionId: s.question.id,
      slotType: s.slot,
      slotBand: bandFor(s.slot, sessionTarget),
    })),
  };
}

function buildSessionQuestionsLegacy(
  topicKey: string | null,
  mode: SessionMode,
  skillProfile: SkillProfile,
  topicMastery: TopicMasteryEntry | null,
  difficulty: DifficultyTier = DEFAULT_DIFFICULTY,
  focusedSkillId: string | null = null,
  sessionBlend: SessionBlend | null = null,
): BuiltSessionQuestions {
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

  const selected = applyDifficultyDistribution(sorted, target);

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

  // Phase 3 Slice E: advance the cooldown counter for every pooled item once
  // per new session start, then (deliberately not touching
  // applyDifficultyDistribution's math above) splice an eligible failed
  // question into the LAST slot — never touches how the other target-1
  // questions were chosen. Sessions <4 questions get no reserved slot; the
  // last valid index is always used, never an out-of-range one.
  advanceReviewPoolSessions();
  let reviewQuestionId: string | null = null;
  if (topicKey && target >= 4) {
    // Exclude questions already in this session's selection, not just the
    // learner's historical `seen` set — otherwise a question the difficulty
    // distribution already picked could be spliced in a second time.
    const alreadyInSession = new Set([...seen, ...selected.map(q => q.id)]);
    const reviewCandidate = getEligibleReviewQuestion(topicKey, alreadyInSession);
    if (reviewCandidate && selected.length === target) {
      selected[target - 1] = reviewCandidate;
      reviewQuestionId = reviewCandidate.id;
    }
  }

  return { questions: selected, reviewQuestionId };
}

// Widened to accept QuestionV2 — QuestionV2 is a structural superset of Question
// so the returned SessionQuestion.question field is still type-compatible.
export function makeSessionQuestion(
  question: Question | QuestionV2,
  isReview = false,
  slotInfo?: BuiltSessionQuestionSlot,
): SessionQuestion {
  return {
    question: question as Question,
    status: 'pending',
    attempts: [],
    bestScore: null,
    savedVocab: [],
    isReview,
    slotType: slotInfo?.slotType,
    slotBand: slotInfo?.slotBand,
  };
}

