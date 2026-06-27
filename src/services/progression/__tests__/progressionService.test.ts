// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  awardXP,
  awardGemsForXP,
  checkAchievements,
  getProgressionState,
} from '../progressionService';
import { computeXPGain } from '../../../domain/xp';

const KEY = 'frenchCoach_progression';

function seedXP(xp: number) {
  localStorage.setItem(KEY, JSON.stringify({ xp, totalXP: xp, gems: 0, achievements: [], inventory: {}, activeBoosters: [], grammarCoachUses: 0, roleplayCount: 0 }));
}

beforeEach(() => {
  localStorage.clear();
});

// ── computeXPGain (pure) ──────────────────────────────────────────────────────

describe('computeXPGain', () => {
  it('base-only: score=0, streak=0 → gain=10, gems=1', () => {
    expect(computeXPGain(0, 0)).toEqual({ gain: 10, gemsGain: 1 });
  });

  it('max gain: score=10, streak≥7 → gain=39, gems=8', () => {
    // base=10 + scoreBonus=15 + streakBonus=14 = 39; gems=floor(39/10)+5=8
    expect(computeXPGain(10, 7)).toEqual({ gain: 39, gemsGain: 8 });
  });

  it('streak capped at 7: streak=10 same as streak=7', () => {
    expect(computeXPGain(5, 10)).toEqual(computeXPGain(5, 7));
  });

  it('score bonus: score=5 → bonus=8 → gain=18', () => {
    // base=10 + round(5/10*15)=8 + 0 = 18
    expect(computeXPGain(5, 0).gain).toBe(18);
  });

  it('gem score-bonus: score≥8 adds 5 gems on top of floor(gain/10)', () => {
    const { gain, gemsGain } = computeXPGain(8, 0);
    expect(gemsGain).toBe(Math.floor(gain / 10) + 5);
  });

  it('gem score-bonus: score<8 gives no bonus gems', () => {
    const { gain, gemsGain } = computeXPGain(7, 0);
    expect(gemsGain).toBe(Math.floor(gain / 10));
  });
});

// ── awardXP ──────────────────────────────────────────────────────────────────

describe('awardXP', () => {
  it('writes XP to localStorage and returns correct totalXP', () => {
    const { totalXP, gain } = awardXP(5, 0);
    expect(totalXP).toBe(gain);
    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored.xp).toBe(totalXP);
  });

  it('applies streak multiplier end-to-end: streak=7 adds 14 extra XP vs streak=0', () => {
    localStorage.clear();
    const { gain: gainNoStreak } = awardXP(5, 0);
    localStorage.clear();
    const { gain: gainWithStreak } = awardXP(5, 7);
    expect(gainWithStreak - gainNoStreak).toBe(14);
  });

  it('accumulates across multiple calls without resetting', () => {
    const r1 = awardXP(5, 0);
    const r2 = awardXP(5, 0);
    expect(r2.totalXP).toBe(r1.totalXP + r2.gain);
  });

  it('applies active booster multiplier to gain', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    localStorage.setItem(KEY, JSON.stringify({
      xp: 0, totalXP: 0, gems: 0, achievements: [], inventory: {},
      activeBoosters: [{ id: 'double_xp', expiresAt: future, multiplier: 2 }],
      grammarCoachUses: 0, roleplayCount: 0,
    }));
    const base = computeXPGain(5, 0).gain;
    const { gain } = awardXP(5, 0);
    expect(gain).toBe(Math.round(base * 2));
  });

  it('ignores expired boosters', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    localStorage.setItem(KEY, JSON.stringify({
      xp: 0, totalXP: 0, gems: 0, achievements: [], inventory: {},
      activeBoosters: [{ id: 'double_xp', expiresAt: past, multiplier: 2 }],
      grammarCoachUses: 0, roleplayCount: 0,
    }));
    const base = computeXPGain(5, 0).gain;
    const { gain } = awardXP(5, 0);
    expect(gain).toBe(base);
  });

  it('levelUp=false when XP stays within same level', () => {
    const { levelUp } = awardXP(5, 0);
    expect(levelUp).toBe(false);
  });

  it('levelUp=true when XP crosses 500 (Beginner→Intermediate)', () => {
    seedXP(490);
    const base = computeXPGain(10, 7).gain; // 39 XP — pushes past 500
    const { levelUp } = awardXP(10, 7);
    expect(base).toBeGreaterThan(0);
    expect(levelUp).toBe(true);
  });

  it('gemsGain includes score bonus when score≥8', () => {
    const { gemsGain, gain } = awardXP(8, 0);
    expect(gemsGain).toBe(Math.floor(gain / 10) + 5);
  });

  it('gemsGain has no score bonus when score<8', () => {
    const { gemsGain, gain } = awardXP(7, 0);
    expect(gemsGain).toBe(Math.floor(gain / 10));
  });
});

// ── awardGemsForXP ───────────────────────────────────────────────────────────

describe('awardGemsForXP', () => {
  it('adds XP and gems from plain amount', () => {
    const { totalXP, totalGems } = awardGemsForXP(20);
    expect(totalXP).toBe(20);
    expect(totalGems).toBe(2); // floor(20/10)=2
  });

  it('applies booster multiplier to the amount', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    localStorage.setItem(KEY, JSON.stringify({
      xp: 0, totalXP: 0, gems: 0, achievements: [], inventory: {},
      activeBoosters: [{ id: 'double_xp', expiresAt: future, multiplier: 2 }],
      grammarCoachUses: 0, roleplayCount: 0,
    }));
    const { totalXP } = awardGemsForXP(10);
    expect(totalXP).toBe(20);
  });

  it('gem formula: floor(boostedGain / 10), no score bonus', () => {
    const { totalGems } = awardGemsForXP(25);
    expect(totalGems).toBe(2); // floor(25/10)=2
  });

  it('REGRESSION: one logical award = exactly one XP increment', () => {
    awardGemsForXP(20);
    const after1 = JSON.parse(localStorage.getItem(KEY)!);
    expect(after1.xp).toBe(20);

    awardGemsForXP(20);
    const after2 = JSON.parse(localStorage.getItem(KEY)!);
    expect(after2.xp).toBe(40);
  });
});

// ── checkAchievements ─────────────────────────────────────────────────────────

describe('checkAchievements', () => {
  it('unlocks premier_pas on first session', () => {
    const result = checkAchievements({ totalSessions: 1 });
    expect(result).toContain('premier_pas');
  });

  it('unlocks fluent when score≥8', () => {
    const result = checkAchievements({ score: 8 });
    expect(result).toContain('fluent');
  });

  it('unlocks perfectionniste when score=10', () => {
    const result = checkAchievements({ score: 10 });
    expect(result).toContain('perfectionniste');
  });

  it('unlocks examinateur in exam mode', () => {
    const result = checkAchievements({ mode: 'exam' });
    expect(result).toContain('examinateur');
  });

  it('unlocks expert when xp≥1500', () => {
    seedXP(1500);
    const result = checkAchievements({});
    expect(result).toContain('expert');
  });

  it('returns empty array when no conditions met', () => {
    const result = checkAchievements({ score: 5, totalSessions: 0 });
    expect(result).toEqual([]);
  });

  it('does not re-unlock an already-unlocked achievement', () => {
    checkAchievements({ totalSessions: 1 });
    const second = checkAchievements({ totalSessions: 1 });
    expect(second).not.toContain('premier_pas');
  });
});

// ── getProgressionState (read-only) ──────────────────────────────────────────

describe('getProgressionState', () => {
  it('returns Beginner level at 0 XP', () => {
    expect(getProgressionState().level.name).toBe('Beginner');
  });

  it('returns Intermediate at 500 XP', () => {
    seedXP(500);
    expect(getProgressionState().level.name).toBe('Intermediate');
  });

  it('returns Beast Mode at 7000 XP', () => {
    seedXP(7000);
    expect(getProgressionState().level.name).toBe('Beast Mode');
  });
});
