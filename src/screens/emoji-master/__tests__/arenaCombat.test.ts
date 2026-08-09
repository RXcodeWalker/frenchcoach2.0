import { describe, it, expect } from 'vitest';
import {
  applyBossDamage,
  applyHeartLoss,
  BASE_DAMAGE,
  BOSS_HP,
  computeArenaDamage,
  DIFFICULTY_BONUS,
  isArenaDefeat,
  isArenaVictory,
  isOverdriveActive,
  OVERDRIVE_MULTIPLIER,
  OVERDRIVE_STREAK_THRESHOLD,
  PLAYER_HEARTS,
  preferredDifficulties,
} from '../modes/arenaCombat';

describe('arenaCombat', () => {
  it('computes base damage with difficulty and combo', () => {
    // streak 1, difficulty 1 → 12 + 2 + 0 = 14
    expect(computeArenaDamage(1, 1)).toBe(BASE_DAMAGE + 2 + DIFFICULTY_BONUS[1]);
    // streak 3, difficulty 3 → 12 + 6 + 4 = 22
    expect(computeArenaDamage(3, 3)).toBe(BASE_DAMAGE + 6 + DIFFICULTY_BONUS[3]);
  });

  it('applies overdrive multiplier at threshold', () => {
    expect(isOverdriveActive(OVERDRIVE_STREAK_THRESHOLD - 1)).toBe(false);
    expect(isOverdriveActive(OVERDRIVE_STREAK_THRESHOLD)).toBe(true);

    const raw =
      BASE_DAMAGE +
      OVERDRIVE_STREAK_THRESHOLD * 2 +
      DIFFICULTY_BONUS[1];
    expect(computeArenaDamage(OVERDRIVE_STREAK_THRESHOLD, 1)).toBe(
      raw * OVERDRIVE_MULTIPLIER
    );
  });

  it('applies boss damage and clamps at 0', () => {
    expect(applyBossDamage(100, 14)).toBe(86);
    expect(applyBossDamage(10, 50)).toBe(0);
  });

  it('loses hearts and detects defeat', () => {
    expect(applyHeartLoss(PLAYER_HEARTS)).toBe(2);
    expect(applyHeartLoss(1)).toBe(0);
    expect(isArenaDefeat(0)).toBe(true);
    expect(isArenaDefeat(1)).toBe(false);
  });

  it('detects victory only when boss dead and hearts remain', () => {
    expect(isArenaVictory(0, 1)).toBe(true);
    expect(isArenaVictory(0, 0)).toBe(false);
    expect(isArenaVictory(1, 3)).toBe(false);
  });

  it('prefers harder difficulties in phase 2', () => {
    expect(preferredDifficulties(0.6)).toEqual([1, 2]);
    expect(preferredDifficulties(0.5)).toEqual([2, 3]);
    expect(preferredDifficulties(0.2)).toEqual([2, 3]);
  });

  it('exports expected constants', () => {
    expect(BOSS_HP).toBe(100);
    expect(PLAYER_HEARTS).toBe(3);
  });
});
