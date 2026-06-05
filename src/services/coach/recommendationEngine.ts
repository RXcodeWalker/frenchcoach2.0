// ── Coach MVP: recommendation engine ───────────────────────────────────────────
// Deterministic, rule-based next-best-action. Reads the latest belief snapshot and
// recent evidence; always returns a recommendation WITH a human-readable rationale.
// No React, no network, no ML. Persists the active recommendation for the next
// session to read.

import type { CoachBeliefSnapshot, SkillBelief } from '../../types/beliefs';
import type { EvidenceEvent } from '../../types/evidence';
import type { CoachRecommendation, RecommendationRationale } from '../../types/coach';
import {
  LEARNER_ID,
  getRecommendation,
  saveRecommendation,
  getBeliefSnapshot,
  getRecentEvidence,
  getActiveGoal,
} from './coachStorage';
import { getSkillLabel } from './skillGraph';

const POLICY_VERSION = 'coach-mvp-1';
const WEAK_MASTERY_THRESHOLD = 0.6;

function makeId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function goalLabel(): string {
  return getActiveGoal().label;
}

function avoidanceSkillIdsFromEvidence(evidence: EvidenceEvent[]): string[] {
  const ids = new Set<string>();
  for (const ev of evidence) {
    if (ev.result.avoided && ev.evidenceType === 'behavior') {
      (ev.observation.avoidanceSkillIds ?? []).forEach(id => ids.add(id));
    }
  }
  return [...ids];
}

function mostRecentTopicKey(evidence: EvidenceEvent[]): string | undefined {
  for (const ev of evidence) {
    if (ev.context.topicKey) return ev.context.topicKey;
  }
  return undefined;
}

function weakestSkill(snapshot: CoachBeliefSnapshot): SkillBelief | null {
  const id = snapshot.weakestSkillIds[0];
  return id ? snapshot.skills[id] ?? null : null;
}

function buildReviewWeakSkill(
  skill: SkillBelief,
  isAvoided: boolean,
): CoachRecommendation {
  const label = getSkillLabel(skill.nodeId);
  const masteryPct = Math.round(skill.mastery * 100);

  const evidenceSummary = isAvoided
    ? `You tend to avoid ${label} when questions invite it, and your mastery is around ${masteryPct}%.`
    : `${label} is your weakest area right now (about ${masteryPct}% mastery, seen ${skill.evidenceCount} times).`;

  const rationale: RecommendationRationale = {
    primaryReason: `Target ${label} because it is currently holding your score back.`,
    evidenceSummary,
    goalLinks: [`Supports your goal: ${goalLabel()}.`],
    targetWeaknesses: [`${label} (${masteryPct}% mastery${isAvoided ? ', frequently avoided' : ''}).`],
    successCriteria: [
      `Use ${label} correctly in at least one answer.`,
      `Avoid the recurring mistake the coach flagged last time.`,
    ],
    alternativesConsidered: [
      { title: 'General practice', whyNot: 'A focused weakness exists that is higher leverage right now.' },
    ],
    confidence: Math.max(0.4, Math.min(0.95, skill.confidence || 0.5)),
  };

  return {
    id: makeId(),
    learnerId: LEARNER_ID,
    generatedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
    type: 'review_weak_skill',
    title: `Practice ${label}`,
    description: isAvoided
      ? `Let's deliberately use ${label} instead of avoiding it.`
      : `A short focused set to strengthen ${label}.`,
    targetSkillIds: [skill.nodeId],
    suggestedMode: 'quick',
    rationale,
    status: 'active',
  };
}

function buildContinueTopic(topicKey: string): CoachRecommendation {
  const rationale: RecommendationRationale = {
    primaryReason: `Keep building momentum on ${topicKey}.`,
    evidenceSummary: `You have recent activity on ${topicKey} and no single skill is critically weak.`,
    goalLinks: [`Supports your goal: ${goalLabel()}.`],
    targetWeaknesses: [],
    successCriteria: [`Complete a session and keep your average score steady or rising.`],
    alternativesConsidered: [
      { title: 'Switch topics', whyNot: 'Consolidating the current topic is more useful right now.' },
    ],
    confidence: 0.5,
  };

  return {
    id: makeId(),
    learnerId: LEARNER_ID,
    generatedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
    type: 'continue_topic',
    title: `Continue ${topicKey}`,
    description: `Keep practicing ${topicKey} to lock in progress.`,
    targetSkillIds: [],
    targetTopicKey: topicKey,
    suggestedMode: 'standard',
    rationale,
    status: 'active',
  };
}

function buildDefault(): CoachRecommendation {
  const rationale: RecommendationRationale = {
    primaryReason: 'Start with a general speaking session so the coach can learn your strengths.',
    evidenceSummary: 'There is not enough evidence yet to target a specific weakness.',
    goalLinks: [`Supports your goal: ${goalLabel()}.`],
    targetWeaknesses: [],
    successCriteria: ['Complete a short speaking session to generate your first insights.'],
    alternativesConsidered: [],
    confidence: 0.3,
  };

  return {
    id: makeId(),
    learnerId: LEARNER_ID,
    generatedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
    type: 'continue_topic',
    title: 'Speak a little',
    description: 'A general speaking session to get started.',
    targetSkillIds: [],
    suggestedMode: 'quick',
    rationale,
    status: 'active',
  };
}

/**
 * Generate, persist, and return the next recommendation. Pure decision logic over
 * the provided (or stored) snapshot and recent evidence.
 */
export function generateRecommendation(
  snapshot?: CoachBeliefSnapshot | null,
  recentEvidence?: EvidenceEvent[],
): CoachRecommendation {
  const snap = snapshot ?? getBeliefSnapshot();
  const evidence = recentEvidence ?? getRecentEvidence(20);

  let recommendation: CoachRecommendation;

  const avoidedIds = avoidanceSkillIdsFromEvidence(evidence);
  const weak = snap ? weakestSkill(snap) : null;

  if (weak && weak.mastery < WEAK_MASTERY_THRESHOLD) {
    const isAvoided = avoidedIds.includes(weak.nodeId);
    recommendation = buildReviewWeakSkill(weak, isAvoided);
  } else if (snap && avoidedIds.length > 0 && snap.skills[avoidedIds[0]]) {
    recommendation = buildReviewWeakSkill(snap.skills[avoidedIds[0]], true);
  } else {
    const topicKey = mostRecentTopicKey(evidence);
    recommendation = topicKey ? buildContinueTopic(topicKey) : buildDefault();
  }

  saveRecommendation(recommendation);
  return recommendation;
}

/** Read the currently stored recommendation, if any. */
export function getActiveRecommendation(): CoachRecommendation | null {
  return getRecommendation();
}

/** Update the status of the stored recommendation (e.g. when accepted). */
export function setRecommendationStatus(status: CoachRecommendation['status']): void {
  const current = getRecommendation();
  if (!current) return;
  saveRecommendation({ ...current, status });
}
