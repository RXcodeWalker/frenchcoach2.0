/**
 * Adaptive feedback depth (docs Stage 3) — a pedagogical decision, not a
 * word-count heuristic. A short answer with dense errors and a missed demand
 * deserves depth; a long, clean, demand-satisfying answer deserves brevity.
 *
 * Pure function over four inputs the client already has before the network
 * request is sent: response length, error/opportunity density (from the
 * offline evaluator's rule count — the same 23 rules coachService always
 * runs), demand fit (evaluateDemandSatisfaction's verdict), and how much
 * evidence is actually available (response tier, whether demands resolved
 * server-side at all for this question).
 *
 * `depth` sent by the client is a hint only — the server owns the ceiling
 * (docs Stage 3: "Server-side maximum item counts and max_tokens per depth,
 * applied regardless of what the client asked for").
 */
import type { ResponseTier } from '../../../types';
import type { DemandSatisfactionState } from '../demand/satisfaction';
import { wordCount } from '../demand/textCues';

export type FeedbackDepth = 'brief' | 'standard' | 'deep';

export interface ComputeDepthInput {
  transcript: string;
  /** Count of offline-evaluator rule hits (grammar.critical.length + grammar.polish.length) — error/opportunity density. */
  errorCount: number;
  /** evaluateDemandSatisfaction's verdict for this question, or undefined when the question carries no demands. */
  demandSatisfaction?: DemandSatisfactionState;
  responseTier: ResponseTier;
}

const LONG_ANSWER_WORDS = 60;
const SHORT_ANSWER_WORDS = 30;
const HIGH_DENSITY_ERRORS = 3;

/**
 * Tier 0/1 (empty or 1-3 words) carry no real evidence to expand on — always
 * brief regardless of the other inputs, since there's nothing to say more
 * about beyond "try again". Tiers 2/3 use the full heuristic below.
 */
export function computeDepth(input: ComputeDepthInput): FeedbackDepth {
  if (input.responseTier <= 1) {
    return 'brief';
  }

  const words = wordCount(input.transcript);
  const missedDemand = input.demandSatisfaction === 'not_attempted';
  const highDensity = input.errorCount >= HIGH_DENSITY_ERRORS;

  // Short-with-errors or a missed demand always earns depth, regardless of length.
  if (missedDemand || (words < SHORT_ANSWER_WORDS && input.errorCount > 0)) {
    return 'deep';
  }

  // Long and clean (demand met or unknown, low error density) earns brevity.
  if (words >= LONG_ANSWER_WORDS && !highDensity && input.demandSatisfaction !== 'not_attempted') {
    return 'brief';
  }

  if (highDensity) {
    return 'deep';
  }

  return 'standard';
}
