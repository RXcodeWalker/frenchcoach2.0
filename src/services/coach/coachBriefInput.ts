// ── Coach brain inputs ─────────────────────────────────────────────────────────
// The impure half of coachBrain.ts: reads the stores the coach already owns
// (profile, belief snapshot, problems, recommendation, review pool, analytics
// history) and the question bank, and hands decideCoachBrief plain data.
// Read-only — nothing here writes.

import { QUESTIONS, TOPICS } from '../../data/gameData';
import { LEARN_TOPIC_DEPENDENCIES } from '../../data/learnTopicDependencies';
import { isTopicVisible } from '../../features/learn/sessionSetup';
import { isLearnTopicUnlocked } from '../../features/learn/topicProgress';
import { SKILL_TO_STRUCTURES, practisesAnySkill } from '../../domain/learn/selection/skillStructures';
import { getSessionHistory, getTopicMasteryAll } from '../analytics/analyticsService';
import { getCoachProfile, getActiveGoal } from './coachProfileService';
import { getBeliefSnapshot } from './coachStorage';
import { getActiveProblem } from './interventionService';
import { getActiveRecommendation } from './recommendationEngine';
import { getDueReviewCounts } from './reviewPool';
import { getSkillLabel } from './skillGraph';
import { decideCoachBrief, type CoachBrief, type CoachInput, type CoachTopic, type CoachTopicStats } from './coachBrain';

let coverageCache: Record<string, Record<string, number>> | null = null;

/** Per topic, how many questions practise each mapped coach skill. The bank is static, so computed once. */
export function topicSkillCoverage(): Record<string, Record<string, number>> {
  if (coverageCache) return coverageCache;
  const out: Record<string, Record<string, number>> = {};
  const skillIds = Object.keys(SKILL_TO_STRUCTURES);
  for (const q of QUESTIONS) {
    const structures = (q.demands?.structures ?? []) as string[];
    if (structures.length === 0) continue;
    for (const id of skillIds) {
      if (!practisesAnySkill(structures, [id])) continue;
      const row = (out[q.topicKey] ??= {});
      row[id] = (row[id] ?? 0) + 1;
    }
  }
  coverageCache = out;
  return out;
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

export function gatherCoachInput(opts: { learnAnswersLeft: number | null; now?: number }): CoachInput {
  const profile = getCoachProfile();
  const goal = getActiveGoal(profile);
  const snapshot = getBeliefSnapshot();
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
    now: opts.now ?? Date.now(),
    goalType: goal?.type ?? null,
    examDate: profile.examDate ?? null,
    sessions: getSessionHistory(),
    skills: snapshot?.skills ?? {},
    weakestSkillIds: snapshot?.weakestSkillIds ?? [],
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
export function getCoachBrief(opts: { learnAnswersLeft: number | null; now?: number }): CoachBrief | null {
  try {
    return decideCoachBrief(gatherCoachInput(opts));
  } catch {
    return null;
  }
}
