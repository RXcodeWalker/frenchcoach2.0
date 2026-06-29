import { storageGet, storageSet, STORAGE_KEYS } from './storage';

export type EntryPoint = 'navigation' | 'deep-link' | 'home-card' | 'coach-recommendation';

interface FeatureInterestRecord {
  featureId: string;
  viewCount: number;
  lastViewedAt: string;
  entryPoints: Partial<Record<EntryPoint, number>>;
}

export function recordFeatureInterest(featureId: string, entryPoint: EntryPoint = 'navigation'): void {
  const all = storageGet<Record<string, FeatureInterestRecord>>(STORAGE_KEYS.featureInterest, {});
  const prev = all[featureId] ?? { featureId, viewCount: 0, lastViewedAt: '', entryPoints: {} };
  all[featureId] = {
    ...prev,
    viewCount: prev.viewCount + 1,
    lastViewedAt: new Date().toISOString(),
    entryPoints: { ...prev.entryPoints, [entryPoint]: (prev.entryPoints[entryPoint] ?? 0) + 1 },
  };
  storageSet(STORAGE_KEYS.featureInterest, all);
}

export function getFeatureInterestReport(): FeatureInterestRecord[] {
  return Object.values(
    storageGet<Record<string, FeatureInterestRecord>>(STORAGE_KEYS.featureInterest, {})
  ).sort((a, b) => b.viewCount - a.viewCount);
}
