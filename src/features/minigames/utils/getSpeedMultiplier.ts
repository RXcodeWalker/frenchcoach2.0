export interface SpeedMultiplierResult {
  multiplier: number;
  label: string;
}

/** SurvivalMode speed bonus tiers (seconds to answer). */
export function getSpeedMultiplier(timeUsedSeconds: number): SpeedMultiplierResult {
  if (timeUsedSeconds < 3) {
    return { multiplier: 3, label: 'GODLIKE SPEED!' };
  }
  if (timeUsedSeconds < 5) {
    return { multiplier: 2, label: 'LIGHTNING FAST!' };
  }
  if (timeUsedSeconds < 8) {
    return { multiplier: 1.5, label: 'SPEEDY!' };
  }
  return { multiplier: 1, label: '' };
}
