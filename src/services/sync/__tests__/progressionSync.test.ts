import { describe, it, expect } from 'vitest';
import type { ProgressionData } from '../../progression/progressionService';
import { mergeProgressionData, cloudDiffersFromMerged, type CloudProgressionRow } from '../progressionSync';

function makeLocal(overrides: Partial<ProgressionData> = {}): ProgressionData {
  return {
    xp: 0,
    totalXP: 100,
    gems: 20,
    achievements: ['first_session'],
    inventory: { streakFreeze: 1 },
    activeBoosters: [],
    grammarCoachUses: 0,
    roleplayCount: 0,
    ...overrides,
  };
}

function makeCloud(overrides: Partial<CloudProgressionRow> = {}): CloudProgressionRow {
  return {
    gems: 30,
    achievements: ['streak_7'],
    inventory: {},
    active_boosters: [],
    migration_version: 1,
    username: null,
    avatar_emoji: null,
    equipped_frame: null,
    equipped_nameplate: null,
    ...overrides,
  };
}

describe('mergeProgressionData', () => {
  it('total_xp is no longer carried on the cloud row — merged.totalXP is always local (Phase 1.3)', () => {
    // The all-time board is ledger-backed (xp_baseline + SUM(xp_events)) and
    // the client's XP syncs via submit_xp_event, so profiles.total_xp is no
    // longer read here at all; a stale/forged cloud value can't influence the
    // local display.
    const merged = mergeProgressionData(makeLocal({ totalXP: 100 }), makeCloud());
    expect(merged.totalXP).toBe(100);

    const merged2 = mergeProgressionData(makeLocal({ totalXP: 300 }), makeCloud());
    expect(merged2.totalXP).toBe(300);
  });

  it('always uses local gems, never the cloud value (gem_events is the sole balance authority)', () => {
    const merged = mergeProgressionData(makeLocal({ gems: 20 }), makeCloud({ gems: 999 }));
    expect(merged.gems).toBe(20);
  });

  it('unions achievements without duplicates', () => {
    const merged = mergeProgressionData(
      makeLocal({ achievements: ['a', 'b'] }),
      makeCloud({ achievements: ['b', 'c'] }),
    );
    expect(new Set(merged.achievements)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('merges inventory by taking the max count per key', () => {
    const merged = mergeProgressionData(
      makeLocal({ inventory: { streakFreeze: 1, xpBoost: 3 } }),
      makeCloud({ inventory: { streakFreeze: 2, hint: 1 } }),
    );
    expect(merged.inventory).toEqual({ streakFreeze: 2, xpBoost: 3, hint: 1 });
  });

  it('merges active boosters, dropping expired ones and de-duping by id', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();
    const merged = mergeProgressionData(
      makeLocal({ activeBoosters: [{ id: 'local-1', expiresAt: future, multiplier: 2 }] }),
      makeCloud({
        active_boosters: [
          { id: 'local-1', expiresAt: future, multiplier: 2 }, // duplicate id, local wins
          { id: 'cloud-1', expiresAt: future, multiplier: 3 },
          { id: 'cloud-expired', expiresAt: past, multiplier: 5 },
        ],
      }),
    );
    expect(merged.activeBoosters.map(b => b.id).sort()).toEqual(['cloud-1', 'local-1']);
  });

  it('cross-account isolation: merging is a pure function of whatever two inputs it is given', () => {
    // Same load-bearing property as mergeSessionLists — the function itself
    // has no identity awareness. Correctness of "local" meaning "this
    // identity's local progression" is entirely the caller's (now
    // identity-scoped storageGet's) responsibility.
    const merged = mergeProgressionData(makeLocal({ totalXP: 42, achievements: [] }), makeCloud({ achievements: [] }));
    expect(merged.totalXP).toBe(42);
    expect(merged.achievements).toEqual([]);
  });
});

describe('cloudDiffersFromMerged', () => {
  it('returns false when merged matches cloud on gems and achievement count', () => {
    // total_xp is no longer compared (Phase 1.3) — only gems and
    // achievements.length. mergeProgressionData always sets merged.gems =
    // local.gems and unions achievements, so for "no diff" local must
    // already match cloud on both.
    const cloud = makeCloud({ gems: 20, achievements: ['a'] });
    const merged = mergeProgressionData(makeLocal({ gems: 20, achievements: ['a'] }), cloud);
    expect(cloudDiffersFromMerged(merged, cloud)).toBe(false);
  });

  it('returns true when the merged achievement set is larger than cloud', () => {
    const cloud = makeCloud({ gems: 20, achievements: ['a'] });
    const merged = mergeProgressionData(makeLocal({ gems: 20, achievements: ['a', 'b'] }), cloud);
    expect(cloudDiffersFromMerged(merged, cloud)).toBe(true);
  });

  it('returns true when local gems differ from cloud gems', () => {
    const cloud = makeCloud({ gems: 99, achievements: ['a'] });
    const merged = mergeProgressionData(makeLocal({ gems: 20, achievements: ['a'] }), cloud);
    expect(cloudDiffersFromMerged(merged, cloud)).toBe(true);
  });
});
