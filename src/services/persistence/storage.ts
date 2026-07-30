// Central registry of all localStorage keys. Edit here, not at call sites.
export const STORAGE_KEYS = {
  analytics:      'frenchCoach_v2',
  progression:    'frenchCoach_progression',
  diagnosticSDE:  'frenchCoach_sde',
  topicMastery:   'frenchCoach_topicMastery',
  masteredDrills: 'frenchCoach_masteredDrills',
  darkMode:       'frenchCoach_darkMode',
  aiEngine:       'frenchCoach_aiEngine',
  difficulty:     'frenchCoach_difficulty',
  roadmap:        'frenchCoach_roadmap',
  vault:          'frenchCoach_vault',
  contentCache:   'frenchCoach_questions_v1',
  newsCache:      'frenchCoach_dailyNews',
  // ── Coach MVP ──────────────────────────────────────────────────────────────
  coachEvidence:       'frenchCoach_coachEvidence',
  coachBeliefs:        'frenchCoach_coachBeliefs',
  coachRecommendation: 'frenchCoach_coachRecommendation',
  coachGoals:          'frenchCoach_coachGoals',
  // ── Phase 2: evidence-driven belief accumulator state ─────────────────────
  coachBeliefState:    'frenchCoach_coachBeliefState',
  // ── Coach profile and decision engine ──────────────────────────────────────
  coachProfile:        'frenchCoach_coachProfile',
  coachDailyPlan:      'frenchCoach_coachDailyPlan',
  coachWeeklyReview:   'frenchCoach_coachWeeklyReview',
  // ── Coach intervention loop (recurring-grammar drills) ──────────────────────
  coachProblems:              'frenchCoach_coachProblems',
  coachInterventions:         'frenchCoach_coachInterventions',
  coachInterventionOutcomes:  'frenchCoach_coachInterventionOutcomes',
  // ── Session cloud sync ────────────────────────────────────────────────────────
  syncedSessionIds:   'frenchCoach_syncedSessionIds',
  pendingSyncSessionIds: 'frenchCoach_pendingSyncSessionIds',
  // ── Coach evidence cloud sync ─────────────────────────────────────────────────
  syncedEvidenceIds:  'frenchCoach_syncedEvidenceIds',
  // ── First-login migration ─────────────────────────────────────────────────────
  migrationV1:        'frenchCoach_migration_v1',
  // ── Weekly review seen state ──────────────────────────────────────────────────
  coachWeeklyReviewSeen: 'frenchCoach_weeklyReviewSeen',
  // ── Feature interest tracking (for prioritising gated features) ───────────────
  featureInterest: 'frenchCoach_featureInterest',
  // ── S10 examiner-simulation session engine ────────────────────────────────────
  examTranscripts:  'frenchCoach_examTranscripts',
  examConductLogs:  'frenchCoach_examConductLogs',
  // ── Exam scoring reliability §D: resume-on-reload marker ──────────────────────
  examPendingScoreSessionId: 'frenchCoach_examPendingScoreSessionId',
  // ── Guest mode (local-only auth bypass) ────────────────────────────────────────
  guestMode: 'frenchCoach_guestMode',
  // ── Feature flag runtime overrides (Phase 0.1) ─────────────────────────────────
  featureFlagOverrides: 'frenchCoach_featureFlagOverrides',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * JSON-safe localStorage read. Returns `fallback` on missing key, corrupt JSON,
 * or any storage error — never throws, never white-screens on boot.
 */
export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * JSON-safe localStorage write. Silently ignores quota errors.
 */
export function storageSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or storage unavailable — degrade silently, never throw
  }
}

/**
 * JSON-safe localStorage write for non-JSON string values (e.g. 'true'/'false').
 */
export function storageSetRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota exceeded or storage unavailable — degrade silently, never throw
  }
}

export function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // storage unavailable — degrade silently, never throw
  }
}
