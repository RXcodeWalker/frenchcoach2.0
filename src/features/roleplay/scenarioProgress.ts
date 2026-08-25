/**
 * Stage 8 — learner progress for the roleplay graph runtime.
 *
 * Implements "Persistence & versioning semantics" and "Unlock semantics" from
 * the Explore/Roleplay overhaul plan. Runtime-only: never written back into
 * authored content (registry.ts deep-freezes graph/meta/deck separately).
 */
import { storageGet, storageSet } from '../../services/persistence/storage';
import { UNLOCK_THRESHOLD } from './constants';

export const SCENARIO_PROGRESS_KEY = 'frenchCoach_scenarioProgress';

export interface ScenarioProgressEntry {
  completedMissionIds: string[];
  sessionsCompleted: number;
  /** 0..1, monotonic — never decreases on replay. */
  bestCompletionRatio: number;
  lastPlayedAt: string;
  /** Presence = the completion bonus has already been granted for this scenario. */
  completionBonusAwardedAt?: string;
}

export interface ScenarioProgressState {
  version: 1;
  scenarios: Record<string, ScenarioProgressEntry>;
}

function emptyState(): ScenarioProgressState {
  return { version: 1, scenarios: {} };
}

/**
 * storageGet returns the fallback on corrupt JSON but does not validate
 * shape — an unknown version resets to empty rather than being coerced, so a
 * future version bump gets an explicit migration function instead of a silent
 * reinterpretation of old data.
 */
function isValidShape(value: unknown): value is ScenarioProgressState {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.scenarios === 'object' &&
    v.scenarios !== null &&
    !Array.isArray(v.scenarios)
  );
}

export function readScenarioProgress(): ScenarioProgressState {
  const raw = storageGet<unknown>(SCENARIO_PROGRESS_KEY, null);
  if (!isValidShape(raw)) return emptyState();
  return raw;
}

function writeScenarioProgress(state: ScenarioProgressState): void {
  storageSet(SCENARIO_PROGRESS_KEY, state);
}

export function getScenarioProgressEntry(scenarioId: string): ScenarioProgressEntry | undefined {
  return readScenarioProgress().scenarios[scenarioId];
}

/** 0 for a scenario never played — matches a fresh ScenarioProgressEntry's implicit ratio. */
export function getBestCompletionRatio(scenarioId: string): number {
  return getScenarioProgressEntry(scenarioId)?.bestCompletionRatio ?? 0;
}

/**
 * Records one finished session's outcome for a scenario. Idempotent by
 * construction: `completedMissionIds` is a set union (replaying cannot
 * double-count), and `bestCompletionRatio` is `Math.max` (a worse replay
 * never regresses displayed mastery). Mission ids that no longer exist in the
 * current authored content are not filtered here — the caller passes only
 * ids from the current mission set, so `readScenarioProgress` callers that
 * recompute a ratio against current content naturally exclude stale ones.
 */
export function recordScenarioSession(
  scenarioId: string,
  completedMissionIds: readonly string[],
  ratio: number,
): ScenarioProgressEntry {
  const state = readScenarioProgress();
  const existing = state.scenarios[scenarioId];
  const merged: ScenarioProgressEntry = {
    completedMissionIds: Array.from(
      new Set([...(existing?.completedMissionIds ?? []), ...completedMissionIds]),
    ),
    sessionsCompleted: (existing?.sessionsCompleted ?? 0) + 1,
    bestCompletionRatio: Math.max(existing?.bestCompletionRatio ?? 0, ratio),
    lastPlayedAt: new Date().toISOString(),
    ...(existing?.completionBonusAwardedAt !== undefined
      ? { completionBonusAwardedAt: existing.completionBonusAwardedAt }
      : {}),
  };
  state.scenarios[scenarioId] = merged;
  writeScenarioProgress(state);
  return merged;
}

/**
 * Marks the one-time scenario-completion bonus as granted, exactly once
 * across replays and page reloads. Returns whether it was newly granted this
 * call (false if already awarded, or if no mission has ever completed).
 *
 * Deliberately not called from anywhere yet: the plan bans `dispatchAddXP`
 * from the roleplay runtime but does not specify what mechanism should grant
 * this bonus instead (orchestrateAttempt requires a real per-turn
 * Session/Question/FeedbackV2, none of which exists for a scenario-level
 * milestone). Wiring the actual reward is left for that decision.
 */
export function claimCompletionBonus(scenarioId: string): boolean {
  const state = readScenarioProgress();
  const entry = state.scenarios[scenarioId];
  if (!entry || entry.completedMissionIds.length === 0) return false;
  if (entry.completionBonusAwardedAt) return false;
  state.scenarios[scenarioId] = { ...entry, completionBonusAwardedAt: new Date().toISOString() };
  writeScenarioProgress(state);
  return true;
}

/**
 * A scenario is unlocked once every dependency has reached UNLOCK_THRESHOLD
 * completion. No dependencies (tier 1) is vacuously unlocked. An unauthored
 * dependency has no progress entry, so its ratio is 0 and it can never
 * satisfy the threshold — the dependent stays locked, matching "a
 * placeholder can never gate-open something."
 */
export function isUnlocked(dependencies: readonly string[]): boolean {
  return dependencies.every((dep) => getBestCompletionRatio(dep) >= UNLOCK_THRESHOLD);
}
