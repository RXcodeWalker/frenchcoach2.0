// ── Coach Profile Service ─────────────────────────────────────────────────────
// Owns the canonical CoachProfile: creates, reads, updates, and derives
// a unified learner model from diagnosticEngine, analyticsService, and
// progressionService.

import type { CoachProfile, CoachGoal, CoachGoalType, CEFRLevel } from '../../types/coach';
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { getSkillProfile } from '../coaching/diagnosticEngine';
import { getStats, getStreakCount } from '../analytics/analyticsService';
import { LEARNER_ID, migrateLegacyLearnerId } from './learnerId';
import { getBeliefSnapshot } from './coachStorage';
import { deriveAbility } from '../../domain/learn/ability/deriveAbility';
import { demandScoreToAbilityLevel, CONFIDENCE_BAND_HIDDEN_BELOW } from '../../domain/learn/ability/thresholds';
import type { EvidenceBeliefSnapshot } from '../../types/beliefs';

// ── Default profile factory ───────────────────────────────────────────────────

function defaultProfile(): CoachProfile {
  return {
    learnerId: LEARNER_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    demographics: { ageBand: 'teen', preferredLanguage: 'en' },
    goals: [],
    activeGoalId: null,
    cefr: { estimate: 'A2', confidence: 0.3, updatedAt: new Date().toISOString() },
    affect: {
      confidenceScore: 0.5,
      anxietyRisk: 0.2,
      correctionTolerance: 0.7,
      motivationPattern: 'new',
    },
    habits: {
      streakDays: 0,
      averageSessionMinutes: 0,
      consistencyScore: 0,
      lastActiveAt: null,
    },
    onboardingComplete: false,
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function getCoachProfile(): CoachProfile {
  const stored = storageGet<CoachProfile | null>(STORAGE_KEYS.coachProfile, null);
  return stored ? migrateLegacyLearnerId(stored) : defaultProfile();
}

export function saveCoachProfile(profile: CoachProfile): void {
  storageSet(STORAGE_KEYS.coachProfile, {
    ...profile,
    updatedAt: new Date().toISOString(),
  });
}

export function updateCoachProfile(partial: Partial<Omit<CoachProfile, 'learnerId' | 'createdAt'>>): CoachProfile {
  const current = getCoachProfile();
  const updated: CoachProfile = { ...current, ...partial, updatedAt: new Date().toISOString() };
  saveCoachProfile(updated);
  return updated;
}

// ── Goal management ───────────────────────────────────────────────────────────

export function setActiveGoal(type: CoachGoalType, options?: { targetDate?: string; weeklyMinutes?: number }): CoachProfile {
  const profile = getCoachProfile();
  const label = GOAL_LABELS[type] ?? type;

  const goal: CoachGoal = {
    id: `goal_${Date.now()}`,
    type,
    label,
    targetDate: options?.targetDate,
    weeklyMinutes: options?.weeklyMinutes ?? 20,
    createdAt: new Date().toISOString(),
    active: true,
  };

  const updatedGoals = profile.goals.map(g => ({ ...g, active: false }));
  updatedGoals.push(goal);

  return updateCoachProfile({
    goals: updatedGoals,
    activeGoalId: goal.id,
    onboardingComplete: true,
  });
}

export function getActiveGoal(profile?: CoachProfile): CoachGoal | null {
  const p = profile ?? getCoachProfile();
  return p.goals.find(g => g.id === p.activeGoalId) ?? null;
}

const GOAL_LABELS: Record<CoachGoalType, string> = {
  general_speaking:     'General French Speaking',
  igcse:                'IGCSE French (Speaking)',
  gcse:                 'GCSE French (Speaking)',
  delf:                 'DELF / DALF Preparation',
  travel:               'Travel & Tourism French',
  business:             'Business French',
  conversation_fluency: 'Conversational Fluency',
};

// ── Derive & sync from existing services ────────────────────────────────────
// Called after each session to keep the profile up to date with the latest
// signals from diagnosticEngine and analyticsService.

export function syncProfileFromServices(): CoachProfile {
  const profile = getCoachProfile();

  const stats = getStats();
  const streak = getStreakCount();
  const skillProfile = getSkillProfile();

  // ── Habits ─────────────────────────────────────────────────────────────────
  const avgDuration = stats.totalSessions > 0
    ? estimateAvgMinutes(stats)
    : profile.habits.averageSessionMinutes;

  const consistencyScore = computeConsistencyScore(streak, stats.totalSessions);

  // ── CEFR estimate from deriveAbility (docs §10 "Profile" row) ──────────────
  // Was deriveCEFR(avgScore): circular per docs §3.7 — avgScore is graded
  // against the tier the learner chose, so picking Beginner inflated straight
  // to a false C1. deriveAbility reads snapshot.demands only, which are
  // resolved server-side and never see the learner's chosen difficulty tier.
  const { cefrEstimate, cefrConfidence } = deriveCEFREstimate(getBeliefSnapshot(), profile);

  // ── Affect ─────────────────────────────────────────────────────────────────
  const recentAvg = computeRecentAvg(stats);
  const confidenceScore = recentAvg != null ? recentAvg / 10 : profile.affect.confidenceScore;

  const isImproving = recentAvg != null && stats.avgScore != null && recentAvg >= stats.avgScore;
  const motivationPattern = deriveMotivationPattern(streak, stats.totalSessions, isImproving);

  // ── Avoidance → anxiety proxy ───────────────────────────────────────────────
  const skillEntries = Object.values(skillProfile);
  const lowConfSkills = skillEntries.filter(s => typeof s === 'object' && (s as { mastery?: string }).mastery === 'low').length;
  const anxietyRisk = Math.min(1, lowConfSkills / Math.max(1, skillEntries.length) * 2);

  return updateCoachProfile({
    cefr: {
      estimate: cefrEstimate,
      confidence: cefrConfidence,
      updatedAt: new Date().toISOString(),
    },
    affect: {
      ...profile.affect,
      confidenceScore,
      anxietyRisk,
      motivationPattern,
    },
    habits: {
      streakDays: streak,
      averageSessionMinutes: avgDuration,
      consistencyScore,
      lastActiveAt: new Date().toISOString(),
    },
  });
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * docs §6.2/§6.3/§10 "Profile" row. Reads snapshot.demands via deriveAbility
 * — never skills, never avgScore (kills the §3.7 circularity: avgScore is
 * graded against the learner's own chosen tier).
 *
 * DemandLevel tops out at B2 (docs §7 has no CEFRLevel C1 concept — the
 * demand ladder's anchors stop at hypothesize=8.0), while CoachProfile.cefr
 * is typed CEFRLevel (A1-C1, types/coach.ts). deriveAbility structurally
 * cannot produce 'C1'; this is not a lost case, just the ability model's own
 * ceiling (§3.12 note: the two CEFRLevel unions already disagree pre-existing
 * this change).
 *
 * Below CONFIDENCE_BAND_HIDDEN_BELOW (docs §6.3 "no band" gate), the profile
 * keeps its existing estimate/confidence rather than asserting an unearned
 * read — mirrors syncProfileFromServices' prior "no real average yet" guard.
 */
export function deriveCEFREstimate(
  snapshot: EvidenceBeliefSnapshot | null,
  profile: CoachProfile,
): { cefrEstimate: CEFRLevel; cefrConfidence: number } {
  if (!snapshot) return { cefrEstimate: profile.cefr.estimate, cefrConfidence: profile.cefr.confidence };

  const ability = deriveAbility(snapshot);
  if (ability.overallConfidence < CONFIDENCE_BAND_HIDDEN_BELOW) {
    return { cefrEstimate: profile.cefr.estimate, cefrConfidence: profile.cefr.confidence };
  }

  return {
    cefrEstimate: demandScoreToAbilityLevel(ability.abilityScore),
    cefrConfidence: ability.overallConfidence,
  };
}

function deriveMotivationPattern(
  streak: number,
  totalSessions: number,
  improving: boolean,
): CoachProfile['affect']['motivationPattern'] {
  if (totalSessions <= 3) return 'new';
  if (streak >= 7 && improving) return 'consistent';
  if (streak === 0 && totalSessions > 5) return 'declining';
  if (streak >= 3) return 'consistent';
  return 'bursty';
}

function computeConsistencyScore(streak: number, totalSessions: number): number {
  if (totalSessions === 0) return 0;
  const streakFactor = Math.min(1, streak / 14);
  const volumeFactor = Math.min(1, totalSessions / 30);
  return Math.round((streakFactor * 0.6 + volumeFactor * 0.4) * 100) / 100;
}

function estimateAvgMinutes(stats: { totalSessions: number }): number {
  // Without individual durations readily available, default to 8 min.
  return stats.totalSessions > 0 ? 8 : 0;
}

function computeRecentAvg(stats: ReturnType<typeof getStats>): number | null {
  if (!stats.recentSessions.length) return null;
  const scores = stats.recentSessions
    .slice(0, 5)
    .map((s: { score: number | null }) => s.score)
    .filter((s): s is number => typeof s === 'number');
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// ── Exam date helpers ─────────────────────────────────────────────────────────

export function setExamDate(isoDate: string): CoachProfile {
  return updateCoachProfile({ examDate: isoDate });
}

export function daysUntilExam(profile?: CoachProfile): number | null {
  const p = profile ?? getCoachProfile();
  if (!p.examDate) return null;
  const diff = new Date(p.examDate).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}
