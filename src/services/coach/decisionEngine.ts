// ── Coach Decision Engine ─────────────────────────────────────────────────────
// Implements the daily next-best-action algorithm.  Pure, deterministic, no
// React, no network.  Given the current learner profile, belief snapshot,
// recent evidence, and goal, it returns a DailyPlan that drives:
//   • the "Today's Focus" card on Home
//   • session blend biasing in sessionBuilder
//   • urgency banners

import type { CoachBeliefSnapshot } from '../../types/beliefs';
import type {
  CoachProfile,
  DailyPlan,
  CandidateAction,
  CandidateActionType,
  UrgencyType,
  SessionBlend,
} from '../../types/coach';
import type { EvidenceEvent } from '../../types/evidence';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { getCoachProfile, getActiveGoal, daysUntilExam } from './coachProfileService';
import { getBeliefSnapshot, getRecentEvidence } from './coachStorage';
import { getSkillLabel } from './skillGraph';

const EXAM_URGENCY_DAYS = 14;
const OVERDUE_REVIEW_DAYS = 10;

// ── Urgency detection ─────────────────────────────────────────────────────────

function detectUrgency(profile: CoachProfile, evidence: EvidenceEvent[]): {
  urgency: UrgencyType;
  message?: string;
} {
  const days = daysUntilExam(profile);
  if (days !== null && days <= EXAM_URGENCY_DAYS) {
    return {
      urgency: 'exam_soon',
      message: `Your exam is in ${days} day${days === 1 ? '' : 's'} — time to focus!`,
    };
  }

  const lastSeen = mostRecentEvidenceDate(evidence);
  if (lastSeen !== null) {
    const daysSinceLastEvidence = (Date.now() - lastSeen) / 86400000;
    if (daysSinceLastEvidence > OVERDUE_REVIEW_DAYS) {
      return {
        urgency: 'overdue_review',
        message: `It's been ${Math.floor(daysSinceLastEvidence)} days since your last session. Let's pick up where you left off.`,
      };
    }
  }

  if (profile.habits.streakDays > 0 && profile.habits.lastActiveAt) {
    const daysSinceActive = (Date.now() - new Date(profile.habits.lastActiveAt).getTime()) / 86400000;
    if (daysSinceActive > 1.1) {
      return {
        urgency: 'streak_at_risk',
        message: `Your ${profile.habits.streakDays}-day streak is at risk today.`,
      };
    }
  }

  if (isConfidenceDropping(profile)) {
    return { urgency: 'confidence_drop', message: 'Your scores have been slipping — a focused session will help.' };
  }

  return { urgency: 'none' };
}

function mostRecentEvidenceDate(evidence: EvidenceEvent[]): number | null {
  if (!evidence.length) return null;
  const ts = evidence.map(e => new Date(e.occurredAt).getTime());
  return Math.max(...ts);
}

function isConfidenceDropping(profile: CoachProfile): boolean {
  return profile.affect.confidenceScore < 0.45 && profile.affect.motivationPattern === 'declining';
}

// ── Candidate scoring ─────────────────────────────────────────────────────────

function scoreCandidate(
  type: CandidateActionType,
  targetSkillIds: string[],
  snapshot: CoachBeliefSnapshot | null,
  profile: CoachProfile,
  urgency: UrgencyType,
  evidence: EvidenceEvent[],
): number {
  let score = 50;

  // Urgency alignment
  if (urgency === 'exam_soon' && type === 'exam_mock') score += 30;
  if (urgency === 'overdue_review' && type === 'review_weak_skill') score += 20;
  if (urgency === 'confidence_drop' && type === 'confidence_session') score += 25;
  if (urgency === 'streak_at_risk' && type === 'general_practice') score += 10;

  // Goal alignment
  const goal = getActiveGoal(profile);
  if (goal?.type === 'igcse' || goal?.type === 'gcse') {
    if (type === 'exam_mock') score += 15;
  }
  if (goal?.type === 'conversation_fluency' || goal?.type === 'travel') {
    if (type === 'roleplay') score += 15;
  }

  // Weak skill bonus
  if (snapshot && targetSkillIds.length > 0) {
    const weakestMastery = Math.min(
      ...targetSkillIds.map(id => snapshot.skills[id]?.mastery ?? 0.5),
    );
    score += Math.round((1 - weakestMastery) * 30);
  }

  // Recency penalty — avoid recommending same type as last evidence
  const lastType = evidence[0]?.context?.mode;
  if (lastType === 'exam' && type === 'exam_mock') score -= 10;

  // Confidence guardrail — don't push high-difficulty stretch if anxious
  if (type === 'stretch_skill' && profile.affect.anxietyRisk > 0.6) score -= 20;

  // Daily novelty — mild variety bonus for non-review types
  if (type === 'roleplay' && evidence.length > 5) score += 5;

  return Math.max(0, Math.min(100, score));
}

// ── Candidate generation ──────────────────────────────────────────────────────

function buildCandidates(
  snapshot: CoachBeliefSnapshot | null,
  profile: CoachProfile,
  urgency: UrgencyType,
  evidence: EvidenceEvent[],
): CandidateAction[] {
  const candidates: CandidateAction[] = [];

  // --- Review weak skill (requires snapshot) ---
  if (snapshot) {
    const weak2 = snapshot.weakestSkillIds.slice(0, 2);
    if (weak2.length > 0) {
      const score = scoreCandidate('review_weak_skill', weak2, snapshot, profile, urgency, evidence);
      const labels = weak2.map(getSkillLabel).join(' & ');
      candidates.push({
        type: 'review_weak_skill',
        score,
        targetSkillIds: weak2,
        rationale: `Focus on ${labels} (your weakest area${weak2.length > 1 ? 's' : ''}).`,
        suggestedMode: 'quick',
      });
    }

    // --- Stretch skill (highest mastery skill that is < 0.9) ---
    const strongIds = snapshot.strongestSkillIds.filter(
      id => (snapshot.skills[id]?.mastery ?? 0) < 0.9,
    );
    if (strongIds.length > 0) {
      const stretchId = strongIds[0];
      const score = scoreCandidate('stretch_skill', [stretchId], snapshot, profile, urgency, evidence);
      candidates.push({
        type: 'stretch_skill',
        score,
        targetSkillIds: [stretchId],
        rationale: `Push ${getSkillLabel(stretchId)} from good to excellent.`,
        suggestedMode: 'deep_dive',
      });
    }
  }

  // --- Exam mock (always a candidate if goal is exam-oriented) ---
  const goal = getActiveGoal(profile);
  if (goal?.type === 'igcse' || goal?.type === 'gcse' || goal?.type === 'delf' || urgency === 'exam_soon') {
    const score = scoreCandidate('exam_mock', [], snapshot, profile, urgency, evidence);
    candidates.push({
      type: 'exam_mock',
      score,
      targetSkillIds: [],
      rationale: 'Simulate exam conditions to build confidence and timing.',
      suggestedMode: 'standard',
    });
  }

  // --- Roleplay ---
  const score2 = scoreCandidate('roleplay', [], snapshot, profile, urgency, evidence);
  candidates.push({
    type: 'roleplay',
    score: score2,
    targetSkillIds: [],
    rationale: 'A scenario-based speaking exercise to build real-world fluency.',
    suggestedMode: 'standard',
  });

  // --- Confidence session (when confidence is low) ---
  if (profile.affect.confidenceScore < 0.5 || urgency === 'confidence_drop') {
    const score = scoreCandidate('confidence_session', [], snapshot, profile, urgency, evidence);
    candidates.push({
      type: 'confidence_session',
      score,
      targetSkillIds: [],
      rationale: 'A familiar topic session to rebuild momentum and confidence.',
      suggestedMode: 'quick',
    });
  }

  // --- General practice (always fallback) ---
  const scoreGp = scoreCandidate('general_practice', [], snapshot, profile, urgency, evidence);
  candidates.push({
    type: 'general_practice',
    score: scoreGp,
    targetSkillIds: [],
    rationale: 'A well-rounded speaking session across all areas.',
    suggestedMode: 'standard',
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// ── Session blend ─────────────────────────────────────────────────────────────

function buildSessionBlend(top: CandidateAction, snapshot: CoachBeliefSnapshot | null): SessionBlend {
  const weak2 = snapshot?.weakestSkillIds.slice(0, 2) ?? [];

  // Base blend ratios — adjusted by action type
  let reviewPct = 30;
  let targetPct = 30;
  let stretchPct = 10;

  if (top.type === 'review_weak_skill') { reviewPct = 45; targetPct = 25; stretchPct = 5; }
  if (top.type === 'stretch_skill')     { reviewPct = 15; targetPct = 20; stretchPct = 35; }
  if (top.type === 'exam_mock')         { reviewPct = 20; targetPct = 35; stretchPct = 15; }
  if (top.type === 'confidence_session'){ reviewPct = 10; targetPct = 50; stretchPct = 5; }

  const warmupPct = 20;
  const choicePct = 100 - warmupPct - reviewPct - targetPct - stretchPct;

  return {
    warmupPct,
    reviewPct,
    targetSkillPct: targetPct,
    stretchPct,
    choicePct: Math.max(0, choicePct),
    focusSkillIds: top.targetSkillIds.length > 0 ? top.targetSkillIds : weak2,
    focusTopicKey: top.targetTopicKey,
  };
}

// ── Explanation text ─────────────────────────────────────────────────────────

function buildExplanation(
  top: CandidateAction,
  urgency: UrgencyType,
  profile: CoachProfile,
): string {
  const goal = getActiveGoal(profile);
  const goalStr = goal ? ` to support your ${goal.label} goal` : '';

  if (urgency === 'exam_soon') {
    return `Your exam is coming up fast — today we are doing timed exam practice${goalStr}.`;
  }
  if (urgency === 'overdue_review') {
    return `Welcome back! Today we will ease in with a review session${goalStr}.`;
  }
  if (top.type === 'review_weak_skill' && top.targetSkillIds.length > 0) {
    const labels = top.targetSkillIds.map(getSkillLabel).join(' and ');
    return `Today we are targeting ${labels} — the area your evidence shows needs the most attention${goalStr}.`;
  }
  if (top.type === 'confidence_session') {
    return `Your confidence has been a bit low lately. Today is an easy session to get your flow back${goalStr}.`;
  }
  if (top.type === 'roleplay') {
    return `A scenario-based session today — real conversation practice is the fastest way to improve${goalStr}.`;
  }
  if (top.type === 'exam_mock') {
    return `Exam-mode practice today to build timing and confidence${goalStr}.`;
  }
  return `A balanced speaking session today${goalStr}. Focus on staying fluent and varied.`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate (and persist) the DailyPlan. Call once per day or after each session.
 * Reading the stored plan is cheap; re-generating forces fresh scoring.
 */
export function generateDailyPlan(
  opts?: {
    profile?: CoachProfile;
    snapshot?: CoachBeliefSnapshot | null;
    evidence?: EvidenceEvent[];
    forceRegenerate?: boolean;
  },
): DailyPlan {
  const todayKey = new Date().toISOString().slice(0, 10);
  const cached = storageGet<DailyPlan | null>(STORAGE_KEYS.coachDailyPlan, null);

  // Return cached plan if it was generated today and not forced
  if (!opts?.forceRegenerate && cached && cached.generatedAt.slice(0, 10) === todayKey) {
    return cached;
  }

  const profile = opts?.profile ?? getCoachProfile();
  const snapshot = opts?.snapshot ?? getBeliefSnapshot();
  const evidence = opts?.evidence ?? getRecentEvidence(50);

  const { urgency, message } = detectUrgency(profile, evidence);
  const candidates = buildCandidates(snapshot, profile, urgency, evidence);
  const topAction = candidates[0] ?? {
    type: 'general_practice' as const,
    score: 50,
    targetSkillIds: [],
    rationale: 'General practice session.',
    suggestedMode: 'standard' as const,
  };

  const blend = buildSessionBlend(topAction, snapshot);
  const explanation = buildExplanation(topAction, urgency, profile);

  const plan: DailyPlan = {
    generatedAt: new Date().toISOString(),
    urgency,
    urgencyMessage: message,
    topAction,
    allCandidates: candidates,
    sessionBlend: blend,
    explanation,
  };

  storageSet(STORAGE_KEYS.coachDailyPlan, plan);
  return plan;
}

/** Read today's plan without regenerating. Returns null if none exists. */
export function getDailyPlan(): DailyPlan | null {
  return storageGet<DailyPlan | null>(STORAGE_KEYS.coachDailyPlan, null);
}

/** Invalidate cached plan (call after completing a session). */
export function invalidateDailyPlan(): void {
  storageSet(STORAGE_KEYS.coachDailyPlan, null);
}
