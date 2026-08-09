export const PLAYER_HEARTS = 3;
export const BOSS_HP = 100;
export const BASE_DAMAGE = 12;
export const COMBO_BONUS_PER_STREAK = 2;
export const DIFFICULTY_BONUS: Record<1 | 2 | 3, number> = {
  1: 0,
  2: 2,
  3: 4,
};
export const OVERDRIVE_STREAK_THRESHOLD = 5;
export const OVERDRIVE_MULTIPLIER = 2;
export const PHASE2_HP_RATIO = 0.5;

export function isOverdriveActive(streak: number): boolean {
  return streak >= OVERDRIVE_STREAK_THRESHOLD;
}

export function computeArenaDamage(
  streakAfterHit: number,
  difficulty: 1 | 2 | 3
): number {
  const raw =
    BASE_DAMAGE +
    streakAfterHit * COMBO_BONUS_PER_STREAK +
    DIFFICULTY_BONUS[difficulty];
  return isOverdriveActive(streakAfterHit)
    ? raw * OVERDRIVE_MULTIPLIER
    : raw;
}

export function applyBossDamage(bossHp: number, damage: number): number {
  return Math.max(0, bossHp - damage);
}

export function applyHeartLoss(hearts: number): number {
  return Math.max(0, hearts - 1);
}

export function isArenaVictory(bossHp: number, hearts: number): boolean {
  return bossHp <= 0 && hearts > 0;
}

export function isArenaDefeat(hearts: number): boolean {
  return hearts <= 0;
}

/** Prefer 1–2 while boss above half HP; prefer 2–3 in phase 2. */
export function preferredDifficulties(bossHpRatio: number): Array<1 | 2 | 3> {
  return bossHpRatio > PHASE2_HP_RATIO ? [1, 2] : [2, 3];
}
