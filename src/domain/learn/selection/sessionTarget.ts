// ── sessionTarget resolution — docs §6, §6.4. Pure. ─────────────────────────────

import type { DifficultyTier } from '../../../types';

export type Aim = 'comfortable' | 'balanced' | 'push';

const AIM_OFFSET: Record<Aim, number> = {
  comfortable: -1.0,
  balanced: 0,
  push: 1.0,
};

/** docs §6.4 — migrated DifficultyTier -> nearest Aim, for the one-time read. */
export function aimFromMigratedTier(tier: DifficultyTier | null): Aim {
  if (tier === 'beginner') return 'comfortable';
  if (tier === 'expert') return 'push';
  return 'balanced';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** docs §6 — `clamp(abilityScore + aim, 0, 10)`. */
export function computeSessionTarget(abilityScore: number, aim: Aim): number {
  return clamp(abilityScore + AIM_OFFSET[aim], 0, 10);
}
