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
  rapidFire:         'coming-soon',
  speedSpeaking:     'coming-soon',
  wordDrop:          'coming-soon',
  bossBattle:        'coming-soon',
  emojiMaster:       'live',
  survivalMode:      'coming-soon',
  speakingArena:     'coming-soon',
  challenges:        'coming-soon',
  listeningMode:     'coming-soon',
  sentenceRebuilder: 'coming-soon',
  accentAnalyzer:    'live',
  learnTranscriptConfirm: 'live',
  learnPracticeStep: 'live',
  learnFollowUp: 'live',
  learnSpacedReview: 'live',
  shadowingMode: 'live',
} satisfies Record<string, FeatureStatus>;

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
