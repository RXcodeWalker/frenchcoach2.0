// ── Coach MVP: belief projection ───────────────────────────────────────────────
// The diagnostic engine (frenchCoach_sde) stays the source of truth for mastery.
// This service drives it (runAfterSession) and then projects getSkillProfile()
// into a coach-friendly CoachBeliefSnapshot that the recommendation engine reads.

import type { FeedbackV2, AvoidanceSignal, SkillProfile, SkillEntry } from '../../types';
import type { CoachBeliefSnapshot, SkillBelief, TopicBelief, BeliefTrend } from '../../types/beliefs';
import { runAfterSession, getSkillProfile, SKILL_DEFS } from '../coaching/diagnosticEngine';
import { getTopicMasteryAll } from '../analytics/analyticsService';
import { getSkillLabel } from './skillGraph';
import { LEARNER_ID, saveBeliefSnapshot } from './coachStorage';

const PROJECTION_VERSION = 'coach-mvp-1';

function confidenceFromCount(n: number): number {
  return 1 - 1 / (1 + n * 0.25);
}

function trendFromRecentScores(recentScores?: number[]): BeliefTrend {
  if (!recentScores || recentScores.length < 4) return 'unknown';
  const mid = Math.floor(recentScores.length / 2);
  const oldAvg = recentScores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const newAvg =
    recentScores.slice(mid).reduce((a, b) => a + b, 0) / (recentScores.length - mid);
  const delta = newAvg - oldAvg;
  if (delta > 0.1) return 'improving';
  if (delta < -0.1) return 'declining';
  return 'stable';
}

function avoidanceScoreFor(entry: SkillEntry): number {
  const mistakes = entry.mistakes ?? [];
  if (mistakes.length === 0) return 0;
  const avoided = mistakes.filter(m => m.transcript === '[AVOIDED]').length;
  return Math.round((avoided / mistakes.length) * 100) / 100;
}

function recurringIssuesFor(entry: SkillEntry): string[] {
  const mistakes = entry.mistakes ?? [];
  const corrections = mistakes
    .map(m => m.corrected)
    .filter((c): c is string => !!c && c !== '[AVOIDED]');
  return [...new Set(corrections)].slice(0, 3);
}

function toSkillBelief(id: string, entry: SkillEntry): SkillBelief {
  return {
    nodeId: id,
    label: entry.name || getSkillLabel(id),
    category: SKILL_DEFS[id]?.category ?? 'grammar',
    mastery: entry.score,
    confidence: Math.round(confidenceFromCount(entry.feedbackCount) * 100) / 100,
    trend: trendFromRecentScores(entry.recentScores),
    avoidanceScore: avoidanceScoreFor(entry),
    evidenceCount: entry.feedbackCount,
    lastObservedAt: entry.lastSeen ? new Date(entry.lastSeen).toISOString() : null,
    recurringIssueIds: recurringIssuesFor(entry),
  };
}

function projectTopics(): Record<string, TopicBelief> {
  const all = getTopicMasteryAll();
  const topics: Record<string, TopicBelief> = {};
  for (const [key, entry] of Object.entries(all)) {
    topics[key] = {
      topicKey: key,
      sessionsCompleted: entry.sessionsCompleted ?? 0,
      averageScore: entry.averageScore ?? 0,
      uniqueQuestionsAnswered: entry.uniqueQuestionsAnswered?.length ?? 0,
      mastered: !!entry.mastered,
      lastSessionAt: entry.lastSessionAt ?? null,
    };
  }
  return topics;
}

/** Build a snapshot from the current diagnostic profile (no engine mutation). */
export function projectSnapshot(profile?: SkillProfile): CoachBeliefSnapshot {
  const skillProfile = profile ?? getSkillProfile();
  const skills: Record<string, SkillBelief> = {};

  for (const [id, entry] of Object.entries(skillProfile)) {
    skills[id] = toSkillBelief(id, entry);
  }

  const ranked = Object.values(skills);

  const weakestSkillIds = ranked
    .filter(s => s.mastery < 0.6 && s.evidenceCount >= 2)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5)
    .map(s => s.nodeId);

  const strongestSkillIds = ranked
    .filter(s => s.mastery >= 0.85 && s.confidence > 0.4)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 5)
    .map(s => s.nodeId);

  return {
    learnerId: LEARNER_ID,
    generatedAt: new Date().toISOString(),
    projectionVersion: PROJECTION_VERSION,
    skills,
    topics: projectTopics(),
    weakestSkillIds,
    strongestSkillIds,
  };
}

/**
 * Drive the diagnostic engine from a completed answer, then project & persist a
 * fresh belief snapshot. Returns the snapshot for the orchestrator.
 */
export function updateFromFeedback(
  feedback: FeedbackV2,
  avoidanceSignals: AvoidanceSignal[],
): CoachBeliefSnapshot {
  runAfterSession(feedback, avoidanceSignals);
  const snapshot = projectSnapshot();
  saveBeliefSnapshot(snapshot);
  return snapshot;
}
