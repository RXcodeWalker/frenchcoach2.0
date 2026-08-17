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
const STRUCTURE_BONUS_CAP = 0.75;

/** Pure function: {@link QuestionDemands} -> demandScore 0-10. See docs §7. */
export function deriveDemandScore(demands: QuestionDemands): number {
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
