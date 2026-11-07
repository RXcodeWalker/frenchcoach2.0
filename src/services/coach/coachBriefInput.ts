// ── Coach brain inputs ─────────────────────────────────────────────────────────
// The impure half of coachBrain.ts: reads the stores the coach already owns
// (profile, belief snapshot, problems, recommendation, review pool, analytics
// history) and the generated question index, and hands decideCoachBrief plain data.
// Read-only — nothing here writes.

import { TOPICS } from '../../data/topics';
import { TOPIC_SKILL_COVERAGE, TOPIC_SKILL_COVERAGE_V2 } from '../../data/questionIds';
import { LEARN_TOPIC_DEPENDENCIES } from '../../data/learnTopicDependencies';
import { isTopicVisible } from '../../features/learn/topicVisibility';
import { isLearnTopicUnlocked } from '../../features/learn/topicProgress';
import { getSessionHistory, getTopicMasteryAll } from '../analytics/analyticsService';
import { getCoachProfile, getActiveGoal } from './coachProfileService';
import { getBeliefSnapshot } from './coachStorage';
import { getActiveProblem } from './interventionService';
import { getActiveRecommendation } from './recommendationEngine';
import { getDueReviewCounts } from './reviewPool';
import { getSkillLabel } from './skillGraph';
import { decideCoachBrief, type CoachBrief, type CoachInput, type CoachTopic, type CoachTopicStats } from './coachBrain';
import { SKILL_DEFS } from '../coaching/diagnosticEngine';
import { resolveFeatureStatus } from '../../config/featureFlags';
import { coachSkillsView, examAreaStanding } from '../../domain/learnerModel/read';
import type { SyncedSkillModel } from '../../domain/learnerModel/types';
import { currentLearnerModel } from '../learnerModel/learnerModelStore';

/** learner-model §7 phase 4: is the Home coach reading the learner model? */
export function coachReadsLearnerModel(): boolean {
  return resolveFeatureStatus('learnerModelCoach') === 'live';
}

function skillMeta(id: string): { label: string; category: string } {
  return { label: SKILL_DEFS[id]?.name ?? id, category: SKILL_DEFS[id]?.category ?? 'grammar' };
}

/**
 * The learner-model half of CoachInput (pure given the model): skills and the
 * weakest ids from coachSkillsView, the exam standing from counted attempts.
 * decideCoachBrief reads them exactly as it reads the old snapshot's fields.
 */
export function learnerModelCoachFields(model: SyncedSkillModel, now: number): Pick<CoachInput, 'skills' | 'weakestSkillIds' | 'examStanding'> {
  const view = coachSkillsView(model, now, skillMeta);
  return {
    skills: view.skills,
    weakestSkillIds: view.weakestSkillIds,
    examStanding: examAreaStanding(model, now).map((a) => ({ key: a.key, mastery: a.mastery, lastMark: a.lastMark, lastMax: a.lastMax })),
  };
}

/** Per topic, how many questions practise each mapped coach skill — generated (`npm run learn:question-ids`), so Home needn't download the bank. */
export function topicSkillCoverage(): Record<string, Record<string, number>> {
  // The registry's table (a superset) once the coach reads the learner model.
  return (coachReadsLearnerModel() ? TOPIC_SKILL_COVERAGE_V2 : TOPIC_SKILL_COVERAGE) as Record<string, Record<string, number>>;
}

/** Topics the Learn grid would let the learner open (the same rule as topicDeepLink.ts). */
function openableTopics(): CoachTopic[] {
  const coverage = topicSkillCoverage();
  return TOPICS
    .filter(isTopicVisible)
    .filter(t => !t.isAdvanced || isLearnTopicUnlocked(LEARN_TOPIC_DEPENDENCIES[t.key] ?? []))
    .map(t => ({
      key: t.key,
      labelEn: t.labelEn,
      isAdvanced: t.isAdvanced === true,
      skillCoverage: coverage[t.key] ?? {},
      questionsCount: t.questionsCount,
    }));
}

export function gatherCoachInput(opts: { learnAnswersLeft: number | null; now?: number; learnerModel?: SyncedSkillModel }): CoachInput {
  const now = opts.now ?? Date.now();
  const profile = getCoachProfile();
  const goal = getActiveGoal(profile);
  const snapshot = getBeliefSnapshot();
  const fromModel = coachReadsLearnerModel() ? learnerModelCoachFields(opts.learnerModel ?? currentLearnerModel(), now) : null;
  const problem = getActiveProblem();
  const recommendation = getActiveRecommendation();

  const topicStats: Record<string, CoachTopicStats> = {};
  for (const [key, entry] of Object.entries(getTopicMasteryAll())) {
    topicStats[key] = {
      sessionsCompleted: entry.sessionsCompleted ?? 0,
      averageScore: typeof entry.averageScore === 'number' && Number.isFinite(entry.averageScore) ? entry.averageScore : null,
      lastSessionAt: entry.lastSessionAt ?? null,
    };
  }

  return {
    now,
    goalType: goal?.type ?? null,
    examDate: profile.examDate ?? null,
    sessions: getSessionHistory(),
    ...(fromModel ?? { skills: snapshot?.skills ?? {}, weakestSkillIds: snapshot?.weakestSkillIds ?? [] }),
    skillLabel: getSkillLabel,
    activeProblemNodeId:
      problem && problem.status === 'active' && !problem.nodeId.startsWith('demand:') ? problem.nodeId : null,
    focusSkillId: recommendation?.type === 'review_weak_skill' ? recommendation.targetSkillIds[0] ?? null : null,
    dueCounts: getDueReviewCounts(),
    topics: openableTopics(),
    topicStats,
    learnAnswersLeft: opts.learnAnswersLeft,
  };
}

/** The coach's brief for right now. Never throws: a broken store yields null and Home shows its plain fallback. */
export function getCoachBrief(opts: { learnAnswersLeft: number | null; now?: number; learnerModel?: SyncedSkillModel }): CoachBrief | null {
  try {
    return decideCoachBrief(gatherCoachInput(opts));
  } catch {
    return null;
  }
}
