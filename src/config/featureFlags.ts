import { STORAGE_KEYS, storageGet, storageSet } from '../services/persistence/storage';

export type FeatureStatus = 'live' | 'coming-soon';

export const FEATURE_FLAGS = {
  shop:              'live',
  rankings:          'live',
  dailyChallenge:    'coming-soon',
  league:            'coming-soon',
  studyGroups:       'coming-soon',
  friendChallenges:  'live',
  roadmap:           'coming-soon',
  mastery:           'coming-soon',
  fluencyHeatmap:    'coming-soon',
  rapidFire:         'live',
  speedSpeaking:     'coming-soon',
  wordDrop:          'live',
  bossBattle:        'live',
  emojiMaster:       'live',
  survivalMode:      'coming-soon',
  speakingArena:     'coming-soon',
  challenges:        'coming-soon',
  listeningMode:     'coming-soon',
  sentenceRebuilder: 'live',
  accentAnalyzer:    'live',
  learnTranscriptConfirm: 'live',
  learnPracticeStep: 'live',
  learnFollowUp: 'live',
  learnSpacedReview: 'live',
  shadowingMode: 'live',
  learnAdaptiveDifficulty: 'live',
  // learn-marking §8 — the marking-level dial and the ladder scheme. Switched
  // on by the owner on 2026-10-24 before the test gate passed ("it can be
  // inaccurate, as long as there is no bug"); see verification-log.md.
  // Rollback: set back to 'coming-soon'.
  learnMarkingLevels: 'live',
  // docs/plans/pronunciation-lab.md — the Pronunciation Lab. Off = today's
  // pronunciation cards (the rollback). Switched 'live' by the owner on
  // 2026-10-31 BEFORE the plan's §7 calibration gate passed (no real
  // recordings yet; a synthetic smoke run caught 1 of 6 swapped words — the
  // word marks may be unreliable); see verification-log.md and the waiver in
  // scripts/labCalibration/__tests__/gate.test.ts. Rollback: 'coming-soon'.
  pronunciationLab: 'live',
  // docs/systems/teacher-dashboard.md — classes, the teacher area (/teach), joining
  // (/join), homework and teacher marks. Needs backend migration 20261103091000 applied;
  // every learner surface hides itself if the class service can't be read.
  // Rollback: 'coming-soon'.
  teacherDashboard: 'live',
  // docs/systems/payments.md — Premium subscriptions (Stripe). Off until the owner
  // has set the Stripe env vars on the backend and run a test-mode purchase;
  // preview with ?ff_premium=live. Rollback: 'coming-soon' (billing keeps working
  // for existing subscribers; only the page and its links hide).
  premium: 'coming-soon',
  // Parent view: Profile's "Parent view" card + the shared /parent#<token> page
  // (backend migration 20261104090000 must be applied first). Rollback: 'coming-soon'
  // hides the card; existing links keep working until the learner turns them off.
  parentView: 'live',
  // docs/systems/learner-model.md — the per-skill learner model. The model itself
  // always records (shadow writes); these flags move ONE reader each onto it.
  // 'coming-soon' = the old reader (the rollback); preview with ?ff_<key>=live.
  // learner-model §4.3: sync the model as learner_state `skill_model`. Backend
  // migration 20261106100000 applied to production 2026-11-07; switched live by the
  // owner the same day. Rollback: 'coming-soon' (pushes and pulls of the key stop).
  learnerModelSync: 'live',
  // learner-model §7 phase 4: the Home coach (coachBriefInput) reads the model.
  learnerModelCoach: 'coming-soon',
  // learner-model §7 phase 5: Learn's ability read and focus skills read the model.
  learnerModelLearn: 'coming-soon',
  // learner-model §7 phase 6: Progress's "Grammar to work on" reads the model.
  learnerModelProgress: 'coming-soon',
}satisfies Record<string, FeatureStatus>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

type FeatureFlagOverrides = Partial<Record<FeatureFlagKey, FeatureStatus>>;

function isFeatureStatus(value: string | null): value is FeatureStatus {
  return value === 'live' || value === 'coming-soon';
}

/**
 * Resolves a flag's status: URL query param (?ff_<key>=live|coming-soon,
 * persisted to localStorage on first read) → localStorage override →
 * compile-time default. Never throws; an unrecognized query value is
 * ignored, not persisted.
 */
export function resolveFeatureStatus(key: FeatureFlagKey): FeatureStatus {
  if (typeof window !== 'undefined') {
    const queryValue = new URLSearchParams(window.location.search).get(`ff_${key}`);
    if (isFeatureStatus(queryValue)) {
      const overrides = storageGet<FeatureFlagOverrides>(STORAGE_KEYS.featureFlagOverrides, {});
      storageSet(STORAGE_KEYS.featureFlagOverrides, { ...overrides, [key]: queryValue });
      return queryValue;
    }
  }

  const overrides = storageGet<FeatureFlagOverrides>(STORAGE_KEYS.featureFlagOverrides, {});
  const override = overrides[key];
  if (isFeatureStatus(override ?? null)) {
    return override as FeatureStatus;
  }

  return FEATURE_FLAGS[key];
}
