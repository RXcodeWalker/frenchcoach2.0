// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SCENARIO_PROGRESS_KEY,
  readScenarioProgress,
  recordScenarioSession,
  claimCompletionBonus,
  getBestCompletionRatio,
  isUnlocked,
} from '../scenarioProgress';
import { UNLOCK_THRESHOLD } from '../constants';

describe('scenarioProgress', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty for a scenario never played', () => {
    expect(getBestCompletionRatio('bakery')).toBe(0);
    expect(readScenarioProgress()).toEqual({ version: 1, scenarios: {} });
  });

  it('resets cleanly on corrupt JSON', () => {
    localStorage.setItem(SCENARIO_PROGRESS_KEY, '{not json');
    expect(readScenarioProgress()).toEqual({ version: 1, scenarios: {} });
  });

  it('resets cleanly on an unknown version rather than coercing it', () => {
    localStorage.setItem(SCENARIO_PROGRESS_KEY, JSON.stringify({ version: 2, scenarios: {} }));
    expect(readScenarioProgress()).toEqual({ version: 1, scenarios: {} });
  });

  it('resets cleanly when scenarios is not a plain object', () => {
    localStorage.setItem(SCENARIO_PROGRESS_KEY, JSON.stringify({ version: 1, scenarios: [] }));
    expect(readScenarioProgress()).toEqual({ version: 1, scenarios: {} });
  });

  it('records a session and computes best ratio', () => {
    recordScenarioSession('bakery', ['bakery_ask_bread'], 0.5);
    expect(getBestCompletionRatio('bakery')).toBe(0.5);
    const entry = readScenarioProgress().scenarios.bakery;
    expect(entry.sessionsCompleted).toBe(1);
    expect(entry.completedMissionIds).toEqual(['bakery_ask_bread']);
  });

  it('is idempotent: replaying the same mission does not double-count', () => {
    recordScenarioSession('bakery', ['bakery_ask_bread'], 0.5);
    recordScenarioSession('bakery', ['bakery_ask_bread'], 0.5);
    const entry = readScenarioProgress().scenarios.bakery;
    expect(entry.completedMissionIds).toEqual(['bakery_ask_bread']);
    expect(entry.sessionsCompleted).toBe(2);
  });

  it('unions completed mission ids across sessions', () => {
    recordScenarioSession('bakery', ['bakery_ask_bread'], 0.5);
    recordScenarioSession('bakery', ['bakery_decline_more'], 1.0);
    const entry = readScenarioProgress().scenarios.bakery;
    expect(new Set(entry.completedMissionIds)).toEqual(
      new Set(['bakery_ask_bread', 'bakery_decline_more']),
    );
  });

  it('bestCompletionRatio never regresses on a worse replay', () => {
    recordScenarioSession('bakery', ['a', 'b'], 1.0);
    recordScenarioSession('bakery', ['a'], 0.5);
    expect(getBestCompletionRatio('bakery')).toBe(1.0);
  });

  it('a renamed/removed scenario record is retained rather than pruned', () => {
    recordScenarioSession('retired_scenario', ['x'], 1.0);
    expect(getBestCompletionRatio('retired_scenario')).toBe(1.0);
  });

  it('grants the completion bonus exactly once', () => {
    recordScenarioSession('bakery', ['bakery_ask_bread'], 0.5);
    expect(claimCompletionBonus('bakery')).toBe(true);
    expect(claimCompletionBonus('bakery')).toBe(false);
    expect(readScenarioProgress().scenarios.bakery.completionBonusAwardedAt).toBeDefined();
  });

  it('does not grant the bonus when no mission has ever completed', () => {
    recordScenarioSession('bakery', [], 0);
    expect(claimCompletionBonus('bakery')).toBe(false);
  });

  it('does not grant the bonus for a scenario never played', () => {
    expect(claimCompletionBonus('bakery')).toBe(false);
  });

  it('preserves an already-awarded bonus marker across further sessions', () => {
    recordScenarioSession('bakery', ['bakery_ask_bread'], 0.5);
    claimCompletionBonus('bakery');
    const awardedAt = readScenarioProgress().scenarios.bakery.completionBonusAwardedAt;
    recordScenarioSession('bakery', ['bakery_decline_more'], 1.0);
    expect(readScenarioProgress().scenarios.bakery.completionBonusAwardedAt).toBe(awardedAt);
  });

  describe('isUnlocked', () => {
    it('is vacuously true for no dependencies', () => {
      expect(isUnlocked([])).toBe(true);
    });

    it('is false when a dependency has never been played', () => {
      expect(isUnlocked(['bakery'])).toBe(false);
    });

    it('is false when a dependency is below the unlock threshold', () => {
      recordScenarioSession('bakery', ['a'], UNLOCK_THRESHOLD - 0.1);
      expect(isUnlocked(['bakery'])).toBe(false);
    });

    it('is true once a dependency reaches the unlock threshold', () => {
      recordScenarioSession('bakery', ['a'], UNLOCK_THRESHOLD);
      expect(isUnlocked(['bakery'])).toBe(true);
    });

    it('requires every dependency to individually clear the threshold', () => {
      recordScenarioSession('bakery', ['a'], 1.0);
      recordScenarioSession('cafe', ['b'], 0.1);
      expect(isUnlocked(['bakery', 'cafe'])).toBe(false);
    });

    it('an unauthored/never-played dependency can never gate-open a scenario', () => {
      expect(isUnlocked(['nonexistent_scenario'])).toBe(false);
    });
  });
});
