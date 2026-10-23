import type { DemandLevel, LearnStructure, QuestionDemands } from './types';

const BASE_SCORE: Record<QuestionDemands['cognitiveDemand'], number> = {
  describe: 2.0,
  explain: 4.0,
  justify: 6.0,
  compare: 6.5,
  hypothesize: 8.0,
};

const STRUCTURE_BONUS_SET: ReadonlySet<LearnStructure> = new Set([
  'subjunctive',
  'conditional',
  'comparison',
]);
const STRUCTURE_BONUS_PER_MATCH = 0.25;
/**
 * A describe question set in the past or future is at least A2: the CEFR
 * Companion Volume (2020), Sustained monologue: describing experience, puts
 * "past activities and personal experiences" and "plans and arrangements" at
 * A2, so describe's A1 base (2.0) under-rates them. UNVALIDATED as a number —
 * 3.0 is the A2 band's lower edge (`demandScoreToLevel`). The Python port in
 * backend/main.py keeps the same rule, but no backend prompt renders it (the
 * one-call ladder prompt that did was replaced by Design D's checklist), so
 * the v6 prompt stays untouched.
 */
export const DESCRIBE_PAST_FUTURE_FLOOR = 3.0;
const STRUCTURE_BONUS_CAP = 0.75;

/**
 * The additive score before the describe floor. Exported only so `learn:levels`
 * can report which questions the floor moved; everything else uses
 * {@link deriveDemandScore}.
 */
export function deriveDemandScoreBeforeFloor(demands: QuestionDemands): number {
  let score = BASE_SCORE[demands.cognitiveDemand];

  if (demands.timeFrames.includes('conditional')) {
    score += 1.0;
  }
  if (new Set(demands.timeFrames).size >= 3) {
    score += 0.5;
  }

  if (demands.responseLoad === 'extended') {
    score += 0.75;
  } else if (demands.responseLoad === 'short') {
    score -= 0.75;
  }

  const structureMatches = demands.structures.filter((s) => STRUCTURE_BONUS_SET.has(s)).length;
  score += Math.min(structureMatches * STRUCTURE_BONUS_PER_MATCH, STRUCTURE_BONUS_CAP);

  if (demands.lexicalReach === 'abstract') {
    score += 0.25;
  }

  return clamp(score, 0, 10);
}

/** Pure function: {@link QuestionDemands} -> demandScore 0-10. See docs §7. */
export function deriveDemandScore(demands: QuestionDemands): number {
  const score = deriveDemandScoreBeforeFloor(demands);
  if (
    demands.cognitiveDemand === 'describe' &&
    (demands.timeFrames.includes('past') || demands.timeFrames.includes('future'))
  ) {
    return Math.max(score, DESCRIBE_PAST_FUTURE_FLOOR);
  }
  return score;
}

/** Pure function: demandScore -> displayed DemandLevel. See docs §6.3. */
export function demandScoreToLevel(demandScore: number): DemandLevel {
  if (demandScore < 3.0) return 'A1';
  if (demandScore < 5.0) return 'A2';
  if (demandScore < 7.5) return 'B1';
  return 'B2';
}

/** Convenience composition: {@link QuestionDemands} -> {@link DemandLevel}. */
export function deriveDemandLevel(demands: QuestionDemands): DemandLevel {
  return demandScoreToLevel(deriveDemandScore(demands));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
