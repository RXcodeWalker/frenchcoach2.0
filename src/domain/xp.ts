/**
 * Canonical XP and gem gain formula. All XP awards must go through this function
 * so there is a single source of truth. Booster multipliers are applied by the
 * service layer (progressionService.awardXP) because they require reading storage.
 */
export function computeXPGain(score: number, streak: number): { gain: number; gemsGain: number } {
  const base        = 10;
  const scoreBonus  = Math.round((score / 10) * 15); // 0–15 XP
  const streakBonus = Math.min(streak, 7) * 2;        // 0–14 XP
  const gain        = base + scoreBonus + streakBonus;
  const gemsGain    = Math.floor(gain / 10) + (score >= 8 ? 5 : 0);
  return { gain, gemsGain };
}

/**
 * Participation-only XP: no score term. For sessions with no real assessed
 * score (score: null) — e.g. an exam whose scoring service call failed —
 * so completing it still earns something, without inventing a score to
 * feed computeXPGain. Deliberately no score-derived gems bonus either.
 */
export function computeParticipationXPGain(streak: number): { gain: number; gemsGain: number } {
  const base        = 10;
  const streakBonus = Math.min(streak, 7) * 2; // 0–14 XP
  const gain         = base + streakBonus;
  const gemsGain     = Math.floor(gain / 10);
  return { gain, gemsGain };
}
