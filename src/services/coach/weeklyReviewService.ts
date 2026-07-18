// ── Weekly Review Service ─────────────────────────────────────────────────────
// Generates a structured WeeklyReview from the past 7 days of evidence,
// belief snapshots, and analytics data.  Pure, deterministic, no React.

import type { WeeklyReview, ExamReadiness, SkillMovement } from '../../types/coach';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { getBeliefSnapshot, getRecentEvidence } from './coachStorage';
import { getSkillLabel } from './skillGraph';
import { getCoachProfile, daysUntilExam } from './coachProfileService';
import { getStats as _getStats } from '../analytics/analyticsService';

const WEEK_MS = 7 * 86400000;

// ── Internal helpers ──────────────────────────────────────────────────────────

function dateKey(ms = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function isWithinWeek(isoDate: string): boolean {
  return Date.now() - new Date(isoDate).getTime() < WEEK_MS;
}

function evDate(ev: import('../../types/evidence').EvidenceEvent): string {
  return ev.occurredAt;
}

// ── Skill movement ────────────────────────────────────────────────────────────

function computeSkillMovements(
  currentMastery: Record<string, number>,
  previousMastery: Record<string, number>,
): { improved: SkillMovement[]; slipping: SkillMovement[] } {
  const improved: SkillMovement[] = [];
  const slipping: SkillMovement[] = [];

  for (const [skillId, after] of Object.entries(currentMastery)) {
    const before = previousMastery[skillId] ?? after;
    const delta = after - before;
    const movement: SkillMovement = {
      skillId,
      label: getSkillLabel(skillId),
      before,
      after,
      delta,
    };
    if (delta > 0.05) improved.push(movement);
    if (delta < -0.05) slipping.push(movement);
  }

  improved.sort((a, b) => b.delta - a.delta);
  slipping.sort((a, b) => a.delta - b.delta);
  return { improved, slipping };
}

// ── Avoidance detection ───────────────────────────────────────────────────────

function detectAvoidancePatterns(): string[] {
  const evidence = getRecentEvidence(100);
  const avoidCounts: Record<string, number> = {};
  for (const ev of evidence) {
    if (!isWithinWeek(evDate(ev))) continue;
    if (ev.result.avoided) {
      for (const id of ev.observation.avoidanceSkillIds ?? []) {
        avoidCounts[id] = (avoidCounts[id] ?? 0) + 1;
      }
    }
  }
  return Object.entries(avoidCounts)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

// ── Top mistakes ──────────────────────────────────────────────────────────────

function findTopMistakes(): string[] {
  const evidence = getRecentEvidence(100);
  const nodeCounts: Record<string, number> = {};
  for (const ev of evidence) {
    if (!isWithinWeek(evDate(ev))) continue;
    for (const nodeId of ev.targetNodeIds) {
      if (ev.result.success === false) {
        nodeCounts[nodeId] = (nodeCounts[nodeId] ?? 0) + 1;
      }
    }
  }
  return Object.entries(nodeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

// ── Confidence trend ──────────────────────────────────────────────────────────

function computeConfidenceTrend(): WeeklyReview['confidenceTrend'] {
  const evidence = getRecentEvidence(30);
  const weekEvidence = evidence.filter(ev => isWithinWeek(evDate(ev)));
  if (weekEvidence.length < 3) return 'unknown';

  const scores = weekEvidence
    .map(ev => ev.result.score ?? null)
    .filter((s): s is number => s !== null);
  if (scores.length < 3) return 'unknown';

  const half = Math.floor(scores.length / 2);
  const older = scores.slice(0, half);
  const newer = scores.slice(half);
  const oldAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const newAvg = newer.reduce((a, b) => a + b, 0) / newer.length;
  const delta = newAvg - oldAvg;
  if (delta > 0.5) return 'rising';
  if (delta < -0.5) return 'falling';
  return 'stable';
}

// ── Exam readiness ────────────────────────────────────────────────────────────

function computeExamReadiness(profile: ReturnType<typeof getCoachProfile>): ExamReadiness | undefined {
  const days = daysUntilExam(profile);
  const snapshot = getBeliefSnapshot();
  const stats = _getStats();

  if (!days) return undefined;
  // No real scored sessions yet — nothing to predict readiness from; don't fabricate one from a default score.
  if (stats.avgScore == null) return undefined;

  const avgScore = stats.avgScore;
  const skillBias = snapshot
    ? Object.values(snapshot.skills).reduce((sum, s) => sum + s.mastery, 0) /
      Math.max(1, Object.keys(snapshot.skills).length)
    : 0.5;

  const predicted = Math.min(100, Math.round((avgScore / 10) * 60 + skillBias * 40));
  const low = Math.max(0, predicted - 10);
  const high = Math.min(100, predicted + 10);

  const topRisks: string[] = snapshot?.weakestSkillIds
    .slice(0, 3)
    .map(id => `Weak: ${getSkillLabel(id)}`) ?? [];

  if (stats.streak === 0) {
    topRisks.push('No recent practice streak');
  }

  let readinessLevel: ExamReadiness['readinessLevel'] = 'on_track';
  if (predicted < 45) readinessLevel = 'critical';
  else if (predicted < 60) readinessLevel = 'at_risk';

  return { predictedScore: predicted, confidenceInterval: [low, high], topRisks, daysUntilExam: days, readinessLevel };
}

// ── Focus priorities ──────────────────────────────────────────────────────────

function buildFocusPriorities(
  improved: SkillMovement[],
  slipping: SkillMovement[],
  avoidance: string[],
  topMistakes: string[],
): string[] {
  const bullets: string[] = [];

  if (slipping.length > 0) {
    const labels = slipping.slice(0, 2).map(m => m.label).join(' & ');
    bullets.push(`Reinforce ${labels} — your mastery dipped this week.`);
  }

  if (avoidance.length > 0) {
    bullets.push(`Stop avoiding ${getSkillLabel(avoidance[0])} — face it deliberately.`);
  }

  if (topMistakes.length > 0 && slipping.length === 0) {
    bullets.push(`Target ${getSkillLabel(topMistakes[0])} — most frequent error this week.`);
  }

  if (improved.length > 0 && bullets.length < 2) {
    bullets.push(`Keep building on ${improved[0].label} — you improved by ${Math.round(improved[0].delta * 100)}%.`);
  }

  if (bullets.length === 0) {
    bullets.push('Great consistency! Challenge yourself with deeper-dive sessions.');
  }

  return bullets.slice(0, 3);
}

// ── Tutor summary ─────────────────────────────────────────────────────────────

function buildTutorSummary(
  sessionsCompleted: number,
  trend: WeeklyReview['confidenceTrend'],
  improved: SkillMovement[],
  slipping: SkillMovement[],
): string {
  const sessionStr = sessionsCompleted === 0
    ? 'No sessions completed this week'
    : `You completed ${sessionsCompleted} session${sessionsCompleted > 1 ? 's' : ''} this week`;

  const trendStr = trend === 'rising' ? ', and your scores are improving'
    : trend === 'falling' ? ', but your scores have been slipping'
    : '';

  const gainStr = improved.length > 0
    ? `. ${improved[0].label} is your biggest win`
    : '';

  const riskStr = slipping.length > 0
    ? `. Watch out for ${slipping[0].label}`
    : '';

  return `${sessionStr}${trendStr}${gainStr}${riskStr}.`;
}

// ── Seen state helpers ────────────────────────────────────────────────────────

function getCurrentWeekKey(): string {
  const d = new Date();
  const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dayOfWeek + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function markWeeklyReviewSeen(): void {
  storageSet(STORAGE_KEYS.coachWeeklyReviewSeen, { weekKey: getCurrentWeekKey() });
}

export function hasSeenWeeklyReviewThisWeek(): boolean {
  const stored = storageGet<{ weekKey: string } | null>(STORAGE_KEYS.coachWeeklyReviewSeen, null);
  return stored?.weekKey === getCurrentWeekKey();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate and persist a WeeklyReview from the last 7 days of evidence.
 * Call once per week, or when the user explicitly requests a review.
 */
export function generateWeeklyReview(): WeeklyReview {
  const profile = getCoachProfile();
  const snapshot = getBeliefSnapshot();
  const evidence = getRecentEvidence(200);

  const weekEvidence = evidence.filter(ev => isWithinWeek(evDate(ev)));
  const sessionsCompleted = new Set(weekEvidence.map(ev => ev.sourceSessionId)).size;
  const totalMinutes = sessionsCompleted * 8; // approximate

  // ── Skill movement (current vs one-week-ago beliefs) ───────────────────────
  const currentMastery: Record<string, number> = {};
  const previousMastery: Record<string, number> = {};

  if (snapshot) {
    for (const [id, skill] of Object.entries(snapshot.skills)) {
      currentMastery[id] = skill.mastery;
    }
  }

  // Approximate "previous" from older evidence (exclude this week)
  const olderEvidence = evidence.filter(ev => !isWithinWeek(evDate(ev)));
  const olderNodeScores: Record<string, number[]> = {};
  for (const ev of olderEvidence) {
    for (const nodeId of ev.targetNodeIds) {
      if (!olderNodeScores[nodeId]) olderNodeScores[nodeId] = [];
      olderNodeScores[nodeId].push(ev.result.success === true ? 1 : 0);
    }
  }
  for (const [id, scores] of Object.entries(olderNodeScores)) {
    previousMastery[id] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const { improved, slipping } = computeSkillMovements(currentMastery, previousMastery);
  const avoidancePatterns = detectAvoidancePatterns();
  const topMistakeIds = findTopMistakes();
  const confidenceTrend = computeConfidenceTrend();

  // Newly visible: skills that appeared in evidence this week but not before
  const oldNodeIds = new Set(Object.keys(olderNodeScores));
  const newlyVisible = weekEvidence
    .flatMap(ev => ev.targetNodeIds)
    .filter(id => !oldNodeIds.has(id))
    .filter((id, i, arr) => arr.indexOf(id) === i);

  const examReadiness = computeExamReadiness(profile);
  const weekFocusPriorities = buildFocusPriorities(improved, slipping, avoidancePatterns, topMistakeIds);
  const tutorSummary = buildTutorSummary(sessionsCompleted, confidenceTrend, improved, slipping);

  const now = new Date();
  const periodStart = dateKey(Date.now() - WEEK_MS);
  const periodEnd = dateKey();

  const review: WeeklyReview = {
    generatedAt: now.toISOString(),
    periodStart,
    periodEnd,
    sessionsCompleted,
    totalMinutes,
    improved,
    slipping,
    newlyVisible,
    topMistakeIds,
    avoidancePatterns,
    confidenceTrend,
    examReadiness,
    weekFocusPriorities,
    tutorSummary,
  };

  storageSet(STORAGE_KEYS.coachWeeklyReview, review);
  return review;
}

/** Read the most recently stored weekly review without regenerating. */
export function getLastWeeklyReview(): WeeklyReview | null {
  return storageGet<WeeklyReview | null>(STORAGE_KEYS.coachWeeklyReview, null);
}

/** Lightweight summary (kept for backward compatibility with any UI that imported this). */
export interface WeeklyReviewSummary {
  generatedAt: string;
  sessionsObserved: number;
  focusAreas: string[];
  hasData: boolean;
}

export function getWeeklyReviewSummary(): WeeklyReviewSummary {
  const last = getLastWeeklyReview();
  const evidence = getRecentEvidence(50);
  const weekEvidence = evidence.filter(ev => isWithinWeek(evDate(ev)));

  if (!last) {
    return { generatedAt: new Date().toISOString(), sessionsObserved: 0, focusAreas: [], hasData: false };
  }

  return {
    generatedAt: last.generatedAt,
    sessionsObserved: last.sessionsCompleted,
    focusAreas: last.weekFocusPriorities.slice(0, 3),
    hasData: weekEvidence.length > 0,
  };
}
