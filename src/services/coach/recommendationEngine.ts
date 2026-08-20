// ── Coach MVP: recommendation engine ───────────────────────────────────────────
// Deterministic, rule-based next-best-action. Reads the latest belief snapshot and
// recent evidence; always returns a recommendation WITH a human-readable rationale.
// No React, no network, no ML. Persists the active recommendation for the next
// session to read.

import type { EvidenceBeliefSnapshot, EvidenceDerivedSkillBelief } from '../../types/beliefs';
import type { EvidenceEvent } from '../../types/evidence';
import type { CoachRecommendation, RecommendationRationale } from '../../types/coach';
import type { CognitiveDemand } from '../../domain/learn/demand/types';
import {
  LEARNER_ID,
  getRecommendation,
  saveRecommendation,
  getBeliefSnapshot,
  getRecentEvidence,
} from './coachStorage';
import { getActiveGoal } from './coachProfileService';
import { getSkillLabel, isSkillReady } from './skillGraph';
import { getActiveProblem } from './interventionService';

const POLICY_VERSION = 'coach-mvp-1';
const WEAK_MASTERY_THRESHOLD = 0.6;

/** docs §7 CognitiveDemand vocabulary has no learner-facing label elsewhere; small and local. */
const DEMAND_LABELS: Record<CognitiveDemand, string> = {
  describe: 'describing things',
  explain: 'explaining your reasoning',
  justify: 'justifying an opinion',
  compare: 'comparing options',
  hypothesize: 'hypothetical (conditional) answers',
};

function demandLabel(nodeId: string): string {
  const demand = nodeId.slice('demand:'.length) as CognitiveDemand;
  return DEMAND_LABELS[demand] ?? nodeId;
}

function makeId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function goalLabel(): string {
  return getActiveGoal()?.label ?? 'General Speaking';
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

function weakestSkill(snapshot: EvidenceBeliefSnapshot): EvidenceDerivedSkillBelief | null {
  const id = snapshot.weakestSkillIds[0];
  return id ? snapshot.skills[id] ?? null : null;
}

function buildReviewWeakSkill(
  skill: EvidenceDerivedSkillBelief,
  isAvoided: boolean,
  readinessReasons: string[] = [],
): CoachRecommendation {
  const label = getSkillLabel(skill.nodeId);
  const masteryPct = Math.round(skill.mastery * 100);
  const lowConfidence = skill.confidence < 0.3;

  const evidenceSummary = isAvoided
    ? `You tend to avoid ${label} when questions invite it, and your mastery is around ${masteryPct}%.`
    : `${label} is your weakest area right now (about ${masteryPct}% mastery, seen ${skill.evidenceCount} times).${
        lowConfidence ? ' Confidence is still low — I am learning your level.' : ''
      }`;

  const rationale: RecommendationRationale = {
    primaryReason: readinessReasons.length > 0
      ? readinessReasons[0]
      : `Target ${label} because it is currently holding your score back.`,
    evidenceSummary,
    goalLinks: [`Supports your goal: ${goalLabel()}.`],
    targetWeaknesses: [`${label} (${masteryPct}% mastery${isAvoided ? ', frequently avoided' : ''}).`],
    successCriteria: [
      `Use ${label} correctly in at least one answer.`,
      `Avoid the recurring mistake the coach flagged last time.`,
    ],
    readinessReasons,
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

/**
 * Forced recommendation when an unresolved recurring-grammar problem exists.
 * Takes priority over the standard weakness ranking so the learner is steered
 * back to the skill they keep missing until the recovery drill resolves it.
 */
function buildProblemRecommendation(
  nodeId: string,
  failedDrills: number,
  skill: EvidenceDerivedSkillBelief | undefined,
): CoachRecommendation {
  const label = getSkillLabel(nodeId);
  const masteryPct = skill ? Math.round(skill.mastery * 100) : null;

  const rationale: RecommendationRationale = {
    primaryReason: `You keep slipping on ${label} — let's break the pattern with a focused recovery loop.`,
    evidenceSummary: `${label} has failed in multiple recent answers${
      masteryPct !== null ? ` (about ${masteryPct}% mastery)` : ''
    }, so it is now a tracked problem.`,
    goalLinks: [`Supports your goal: ${goalLabel()}.`],
    targetWeaknesses: [`${label} (recurring mistake${failedDrills > 0 ? `, ${failedDrills} drill miss${failedDrills > 1 ? 'es' : ''}` : ''}).`],
    successCriteria: [
      'Complete the recovery drill without skipping.',
      `Use ${label} correctly in your next answer.`,
    ],
    readinessReasons: [],
    alternativesConsidered: [
      { title: 'Move on to a new topic', whyNot: 'A recurring mistake is unresolved and will keep capping your scores.' },
    ],
    confidence: 0.7,
  };

  return {
    id: makeId(),
    learnerId: LEARNER_ID,
    generatedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
    type: 'review_weak_skill',
    title: `Recover ${label}`,
    description: `A short recovery drill plus targeted practice to fix ${label}.`,
    targetSkillIds: [nodeId],
    suggestedMode: 'quick',
    rationale,
    status: 'active',
  };
}

/**
 * Forced recommendation when an unresolved demand:* problem exists (docs
 * §10 "Recommendations" row). Lower priority than a grammar problem
 * (buildProblemRecommendation) — see generateRecommendation's ordering.
 */
function buildDemandProblemRecommendation(nodeId: string): CoachRecommendation {
  const label = demandLabel(nodeId);
  const demand = nodeId.slice('demand:'.length) as CognitiveDemand;

  const rationale: RecommendationRationale = {
    primaryReason: `You keep struggling with ${label} — let's target that specifically.`,
    evidenceSummary: `Recent answers show a pattern with ${label}, so it is now a tracked focus area.`,
    goalLinks: [`Supports your goal: ${goalLabel()}.`],
    targetWeaknesses: [`${label} (recurring demand problem).`],
    successCriteria: [`Successfully handle a question that requires ${label}.`],
    readinessReasons: [],
    alternativesConsidered: [
      { title: 'Move on to a new topic', whyNot: 'This demand keeps coming up short and will keep capping your scores.' },
    ],
    confidence: 0.6,
  };

  return {
    id: makeId(),
    learnerId: LEARNER_ID,
    generatedAt: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
    type: 'review_weak_skill',
    title: `Practice ${label}`,
    description: `A session with questions that push you to focus on ${label}.`,
    targetSkillIds: [],
    targetDemand: demand,
    suggestedMode: 'standard',
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
  snapshot?: EvidenceBeliefSnapshot | null,
  recentEvidence?: EvidenceEvent[],
): CoachRecommendation {
  const snap = snapshot ?? getBeliefSnapshot();
  const evidence = recentEvidence ?? getRecentEvidence(20);

  let recommendation: CoachRecommendation;

  // 1. Highest priority: an unresolved recurring-grammar problem. Force the
  //    learner back to that node with a recovery-focused rationale. Checked
  //    before the general getActiveProblem() lookup so a grammar problem
  //    always outranks a demand:* one when both are active (docs §10).
  const problem = getActiveProblem();
  if (problem && problem.status === 'active' && !problem.nodeId.startsWith('demand:')) {
    recommendation = buildProblemRecommendation(
      problem.nodeId,
      problem.failedDrills ?? 0,
      snap?.skills[problem.nodeId],
    );
    saveRecommendation(recommendation);
    return recommendation;
  }

  // 1b. Next priority: an unresolved demand:* problem (docs §10).
  if (problem && problem.status === 'active' && problem.nodeId.startsWith('demand:')) {
    recommendation = buildDemandProblemRecommendation(problem.nodeId);
    saveRecommendation(recommendation);
    return recommendation;
  }

  const avoidedIds = avoidanceSkillIdsFromEvidence(evidence);
  const weak = snap ? weakestSkill(snap) : null;

  if (snap && weak && weak.mastery < WEAK_MASTERY_THRESHOLD) {
    // Prerequisite gate: if the weakest skill is blocked by an under-developed
    // prerequisite, redirect practice to the prerequisite first.
    const readiness = isSkillReady(weak.nodeId, snap);
    if (!readiness.ready && readiness.blockers.length > 0) {
      const prereqId = readiness.blockers[0];
      const prereqBelief = snap.skills[prereqId];
      if (prereqBelief) {
        const reason = `${getSkillLabel(prereqId)} needs work before ${getSkillLabel(weak.nodeId)}.`;
        recommendation = buildReviewWeakSkill(prereqBelief, avoidedIds.includes(prereqId), [reason]);
        saveRecommendation(recommendation);
        return recommendation;
      }
    }
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
