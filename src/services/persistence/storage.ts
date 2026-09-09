// Central registry of all localStorage keys. Edit here, not at call sites.
export const STORAGE_KEYS = {
  analytics:      'frenchCoach_v2',
  progression:    'frenchCoach_progression',
  diagnosticSDE:  'frenchCoach_sde',
  topicMastery:   'frenchCoach_topicMastery',
  masteredDrills: 'frenchCoach_masteredDrills',
  darkMode:       'frenchCoach_darkMode',
  // 'paper' (the warm exam voice) | 'app' (follow the core token theme)
  examVoice:      'frenchCoach_examVoice',
  aiEngine:       'frenchCoach_aiEngine',
  difficulty:     'frenchCoach_difficulty',
  // docs (Learn adaptive difficulty) §6.4/§16 Stage 10 — replaces `difficulty`
  // as the learner-facing control on the adaptive path. `difficulty` itself is
  // left in place for one release (rollback safety) and is still read once by
  // aimFromMigratedTier() as the seed when no `aim` value exists yet.
  aim:            'frenchCoach_aim',
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
  // ── Tier-1 local-only product metrics (Phase 2 Slice 5) ────────────────────────
  localCounters: 'frenchCoach_localCounters',
  // ── Phase 3 Slice E: spaced re-exposure review pool ─────────────────────────────
  reviewPool: 'frenchCoach_reviewPool',
  // ── Pronunciation history cloud sync (accent-analyzer plan §13, D3) ──────────────
  pronunciationHistory:          'frenchCoach_pronunciationHistory',
  syncedPronunciationIds:        'frenchCoach_syncedPronunciationIds',
  pendingSyncPronunciationIds:   'frenchCoach_pendingSyncPronunciationIds',
  // ── XP ledger cloud sync (social layer plan §1.3, §2.2, §5) ───────────────────────
  xpEventLog:              'frenchCoach_xpEventLog',
  syncedXpEventIds:        'frenchCoach_syncedXpEventIds',
  pendingSyncXpEventIds:   'frenchCoach_pendingSyncXpEventIds',
  // ── Emoji Master personal bests (versioned payload) ─────────────────────────────
  emojiMasterBests: 'frenchCoach_emojiMasterBests',
  // ── Shop economy: mint queue + provisional balance cache (Shop plan §14.1, §14.7) ──
  pendingMintQueue:      'frenchCoach_pendingMintQueue',
  shopBalanceCache:      'frenchCoach_shopBalanceCache',
  shopInventoryCache:    'frenchCoach_shopInventoryCache',
  // ── Daily Challenge Phase 1: claim-recovery checkpoint (Fix 4) ──────────────────
  dailyChallengePendingClaim: 'frenchCoach_dailyChallengePendingClaim',
  // ── Friend Duels Phase 2: claim-recovery checkpoints, keyed by duelId ────────────
  // (plural — multiple duels can be in flight at once, unlike Daily Challenge's
  // single-slot key; see duelsService.ts for the full rationale)
  duelPendingClaims: 'frenchCoach_duelPendingClaims',
  // ── League Power prerequisite (plan i-am-implementing-phase-hashed-karp.md,
  // Part A4): persisted claimed-state for Challenges.tsx's weekly-challenge
  // claim button, closing the unbounded re-click XP exploit.
  claimedChallengeIds: 'frenchCoach_claimedChallengeIds',
  // ── Phase 4: Shadowing Mode — local history, cloud sync, and preferences ────────
  shadowingHistory:              'frenchCoach_shadowingHistory',
  syncedShadowingIds:            'frenchCoach_syncedShadowingIds',
  pendingSyncShadowingIds:       'frenchCoach_pendingSyncShadowingIds',
  shadowingDetailedFeedback:     'frenchCoach_shadowingDetailedFeedback',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// ── Identity-scoped storage (auth overhaul plan §5/§6) ──────────────────────
// Device-scoped keys are never namespaced by identity — shared across whoever
// uses this browser. Everything else defaults to `${base}::${identity}`.
const DEVICE_SCOPED = new Set<string>([
  STORAGE_KEYS.darkMode,
  STORAGE_KEYS.aiEngine,
  STORAGE_KEYS.contentCache,
  STORAGE_KEYS.newsCache,
  STORAGE_KEYS.guestMode,
  STORAGE_KEYS.featureFlagOverrides,
  STORAGE_KEYS.featureInterest,
  STORAGE_KEYS.localCounters,
]);

let activeScope: string | null = null;

/** Pure in-memory assignment — no I/O, safe to call from anywhere. */
export function setStorageScope(identity: string): void {
  activeScope = identity;
}

function scopedKey(base: string): string {
  if (activeScope === null || DEVICE_SCOPED.has(base)) return base;
  return `${base}::${activeScope}`;
}

/**
 * Effectful — must only be called from an effect (never render/a lazy
 * initializer). Implements the ownership-aware legacy/guest copy rules
 * (plan §6, rules 1 and 2). Additive-only: never deletes a source key, and
 * every individual key copy is idempotent (skips keys already present at
 * the destination), so a crash mid-loop is always safe to retry.
 */
export function prepareStorageScope(identity: string): void {
  const claimMarkerKey = `frenchCoach_scopeClaimed::${identity}`;
  if (localStorage.getItem(claimMarkerKey) === 'true') return;

  const legacyRecord = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.migrationV1);
      return raw === null ? null : (JSON.parse(raw) as { userId?: string } | null);
    } catch {
      return null;
    }
  })();

  const legacyOwner = legacyRecord?.userId ?? null;

  // Rule 1: no recorded owner — legacy pool belongs to guest.
  // Rule 2: a recorded owner — legacy pool belongs only to that specific account.
  const shouldClaimLegacy =
    (legacyOwner === null && identity === 'guest') || legacyOwner === identity;

  if (shouldClaimLegacy) {
    for (const base of Object.values(STORAGE_KEYS)) {
      if (DEVICE_SCOPED.has(base)) continue;
      const destKey = `${base}::${identity}`;
      if (localStorage.getItem(destKey) !== null) continue;
      const legacyValue = localStorage.getItem(base);
      if (legacyValue === null) continue;
      try {
        localStorage.setItem(destKey, legacyValue);
      } catch {
        // quota exceeded or storage unavailable — degrade silently, never throw
      }
    }
  }

  try {
    localStorage.setItem(claimMarkerKey, 'true');
  } catch {
    // storage unavailable — next load safely retries, every copy is idempotent
  }
}

/**
 * True if this identity has never had any identity-scoped key written on
 * this device yet — the trigger condition for plan §6 rule 3 (guest → a
 * real account's first sign-in).
 */
export function hasNoScopedDataYet(identity: string): boolean {
  return Object.values(STORAGE_KEYS).every(
    (base) => DEVICE_SCOPED.has(base) || localStorage.getItem(`${base}::${identity}`) === null,
  );
}

/**
 * Additive-only, idempotent copy of every identity-scoped key from ::guest
 * into ::identity (plan §6 rule 3). Never deletes the ::guest source. The
 * caller (AppContext's hydrateFromCloud) is responsible for only invoking
 * this on a real account's first resolution — see hasNoScopedDataYet.
 */
export function copyGuestScopeToIdentity(identity: string): void {
  for (const base of Object.values(STORAGE_KEYS)) {
    if (DEVICE_SCOPED.has(base)) continue;
    const destKey = `${base}::${identity}`;
    if (localStorage.getItem(destKey) !== null) continue;
    const guestValue = localStorage.getItem(`${base}::guest`);
    if (guestValue === null) continue;
    try {
      localStorage.setItem(destKey, guestValue);
    } catch {
      // quota exceeded or storage unavailable — degrade silently, never throw
    }
  }
}

/**
 * JSON-safe localStorage read. Returns `fallback` on missing key, corrupt JSON,
 * or any storage error — never throws, never white-screens on boot.
 */
export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(scopedKey(key));
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
    localStorage.setItem(scopedKey(key), JSON.stringify(value));
  } catch {
    // quota exceeded or storage unavailable — degrade silently, never throw
  }
}

/**
 * JSON-safe localStorage write for non-JSON string values (e.g. 'true'/'false').
 */
export function storageSetRaw(key: string, value: string): void {
  try {
    localStorage.setItem(scopedKey(key), value);
  } catch {
    // quota exceeded or storage unavailable — degrade silently, never throw
  }
}

export function storageRemove(key: string): void {
  try {
    localStorage.removeItem(scopedKey(key));
  } catch {
    // storage unavailable — degrade silently, never throw
  }
}
