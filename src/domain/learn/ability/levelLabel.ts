// ── Exam-relative level wording — Learn overhaul Batch 1e. Pure. ────────────────
//
// 0520 speaking targets "A2 with elements of B1" (Teacher's Notes p.11), so the
// learner sees levels relative to the exam, with the CEFR code in brackets.
// Anything above B1 is shown as "Stretch (B1+)"; B2 and C1 are never shown.
// Display only — the engine's DemandLevel bands (docs §6.3) are unchanged.

import type { DemandLevel } from '../demand/types';
import type { AbilityResult } from './deriveAbility';
import {
  demandScoreToAbilityLevel,
  CONFIDENCE_BAND_HIDDEN_BELOW,
  CONFIDENCE_BAND_APPROXIMATE_BELOW,
} from './thresholds';

const LEVEL_LABEL: Record<DemandLevel, string> = {
  A1: 'Warm-up (A1)',
  A2: 'Exam level (A2)',
  B1: 'Stretch (B1)',
  B2: 'Stretch (B1+)',
};

export function levelLabel(level: DemandLevel): string {
  return LEVEL_LABEL[level];
}

/**
 * docs §6.3 — confidence-gated level string; never asserts a band it hasn't
 * earned. Below the gate it names the starting point selection is using
 * (docs §6.4 lets the seed shape selection) instead of an open-ended "getting
 * to know your level".
 */
export function measuredLevelDisplay(ability: AbilityResult): { band: string; caption: string } {
  const label = levelLabel(demandScoreToAbilityLevel(ability.abilityScore));
  if (ability.overallConfidence < CONFIDENCE_BAND_HIDDEN_BELOW) {
    return { band: `Starting point: ${label}`, caption: "We'll adjust as you answer." };
  }
  const caption = `from ${ability.measuredAnswers} answer${ability.measuredAnswers === 1 ? '' : 's'} we could measure`;
  if (ability.overallConfidence < CONFIDENCE_BAND_APPROXIMATE_BELOW) {
    return { band: `Around ${label}`, caption };
  }
  return { band: label, caption };
}
