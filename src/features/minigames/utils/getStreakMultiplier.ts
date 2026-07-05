export interface StreakTier {
  minStreak: number;
  multiplier: number;
}

/** Default tiers shared by RapidFire, SurvivalMode, and SpeedSpeaking. */
export const DEFAULT_STREAK_TIERS: StreakTier[] = [
  { minStreak: 20, multiplier: 5 },
  { minStreak: 10, multiplier: 3 },
  { minStreak: 5, multiplier: 2 },
  { minStreak: 3, multiplier: 1.5 },
];

/** RapidFire/SpeedSpeaking/Survival streak tiers without the 5× tier. */
export const STANDARD_STREAK_TIERS: StreakTier[] = [
  { minStreak: 10, multiplier: 3 },
  { minStreak: 5, multiplier: 2 },
  { minStreak: 3, multiplier: 1.5 },
];

export function getStreakMultiplier(
  streak: number,
  tiers: StreakTier[] = STANDARD_STREAK_TIERS
): number {
  for (const tier of tiers) {
    if (streak >= tier.minStreak) return tier.multiplier;
  }
  return 1;
}
