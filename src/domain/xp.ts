/**
 * Canonical XP and gem gain formula. All XP awards must go through this function
 * so there is a single source of truth. Booster multipliers are applied by the
 * service layer (progressionService.awardXP) because they require reading storage.
 */
export function computeXPGain(
  score: number,
  streak: number,
  { scoreCounts = true }: XPGainOptions = {},
): { gain: number; gemsGain: number } {
  const base        = 10;
  const scoreBonus  = scoreCounts ? Math.round((score / 10) * 15) : 0; // 0–15 XP
  const streakBonus = Math.min(streak, 7) * 2;        // 0–14 XP
  const gain        = base + scoreBonus + streakBonus;
  const gemsGain    = Math.floor(gain / 10) + scoreGemBonus(score, scoreCounts);
  return { gain, gemsGain };
}

export interface XPGainOptions {
  /**
   * learn-marking §8.2 — false when the score was marked below Exam standard:
   * the attempt then earns no score bonus XP and no score gem bonus (owner
   * decision, 2026-10-18), exactly like a participation award. Default true.
   */
  scoreCounts?: boolean;
}

/** The +5 gem bonus for a score of 8 or more; zero when the score doesn't count. */
export function scoreGemBonus(score: number, scoreCounts = true): number {
  return scoreCounts && score >= 8 ? 5 : 0;
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
