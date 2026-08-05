import { STORAGE_KEYS, storageGet, storageSet, storageRemove } from '../../services/persistence/storage';
import type { GeneratedScenario } from '../../types';
import type { ArchitectDifficulty, ArchitectPersistedDraft, FavoriteScenario } from './types';

const MAX_FAVORITES = 10;

export function loadDraft(): ArchitectPersistedDraft | null {
  return storageGet<ArchitectPersistedDraft | null>(STORAGE_KEYS.scenarioArchitectDraft, null);
}

export function saveDraft(draft: Omit<ArchitectPersistedDraft, 'updatedAt'>): void {
  storageSet(STORAGE_KEYS.scenarioArchitectDraft, {
    ...draft,
    updatedAt: new Date().toISOString(),
  } satisfies ArchitectPersistedDraft);
}

export function clearDraft(): void {
  storageRemove(STORAGE_KEYS.scenarioArchitectDraft);
}

export function loadFavorites(): FavoriteScenario[] {
  return storageGet<FavoriteScenario[]>(STORAGE_KEYS.scenarioArchitectFavorites, []);
}

export function saveFavorite(description: string, scenario: GeneratedScenario): FavoriteScenario[] {
  const existing = loadFavorites().filter(f => f.scenario.title !== scenario.title);
  const next: FavoriteScenario[] = [
    {
      id: `fav-${Date.now()}`,
      description,
      scenario,
      savedAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, MAX_FAVORITES);
  storageSet(STORAGE_KEYS.scenarioArchitectFavorites, next);
  return next;
}

export function removeFavorite(id: string): FavoriteScenario[] {
  const next = loadFavorites().filter(f => f.id !== id);
  storageSet(STORAGE_KEYS.scenarioArchitectFavorites, next);
  return next;
}

export function hasSeenTutorial(): boolean {
  return storageGet(STORAGE_KEYS.scenarioArchitectTutorialSeen, false);
}

export function markTutorialSeen(): void {
  storageSet(STORAGE_KEYS.scenarioArchitectTutorialSeen, true);
}

export function isTtsMuted(): boolean {
  return storageGet(STORAGE_KEYS.scenarioArchitectTtsMuted, false);
}

export function setTtsMuted(muted: boolean): void {
  storageSet(STORAGE_KEYS.scenarioArchitectTtsMuted, muted);
}

export function defaultDifficulty(): ArchitectDifficulty {
  return storageGet<ArchitectDifficulty>(STORAGE_KEYS.scenarioArchitectDifficulty, 'standard');
}

export function persistDifficulty(difficulty: ArchitectDifficulty): void {
  storageSet(STORAGE_KEYS.scenarioArchitectDifficulty, difficulty);
}
