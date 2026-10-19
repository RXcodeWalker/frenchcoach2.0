/**
 * The two request hints Learn's feedback call computes on the client, before
 * the network request: the prompt's DETERMINISTIC SIGNALS and the adaptive
 * feedback depth. Pure (no storage, network or browser globals), so the backend
 * Learn-marking eval harness can reproduce exactly what a real request carries
 * (`scripts/learnMarking/clientInputs.ts`). Moved verbatim from apiClient.ts.
 */
import type { Question } from '../../types';
import { evaluate as offlineEvaluate } from '../coaching/coachService';
import {
  hasJustification,
  hasOpinion,
  hasConnectors,
  hasPerspective,
  hasSubjunctive,
  hasConditional,
  hasPastOrFuture,
} from '../coaching/diagnosticEngine';
import { wordCount as demandWordCount } from '../../domain/learn/demand/textCues';
import { evaluateDemandSatisfaction } from '../../domain/learn/demand/satisfaction';
import { computeDepth, type FeedbackDepth } from '../../domain/learn/feedback/computeDepth';

/**
 * Client-computed L1 marker readout for the prompt's DETERMINISTIC SIGNALS
 * section (docs §9.2) — same detectors evaluateDemandSatisfaction uses for L1
 * evidence (docs §9.3), read-only here: this never feeds evidence itself,
 * only what the backend renders as "already measured — do not contradict".
 */
export function buildDemandSignals(transcript: string, question: Question): Record<string, unknown> | undefined {
  if (!question.demands) return undefined;
  return {
    cognitiveDemand: question.demands.cognitiveDemand,
    wordCount: demandWordCount(transcript),
    hasJustification: hasJustification(transcript),
    hasOpinion: hasOpinion(transcript),
    hasConnectors: hasConnectors(transcript),
    hasPerspective: hasPerspective(transcript),
    hasSubjunctive: hasSubjunctive(transcript),
    hasConditional: hasConditional(transcript),
    hasPastOrFuture: hasPastOrFuture(transcript),
  };
}

/**
 * Adaptive feedback depth (docs Stage 3) — computed client-side as a hint the
 * server may clamp. Error/opportunity density comes from the offline
 * evaluator's rule count (the same 23 rules coachService always runs,
 * independent of which engine ends up answering) rather than re-implementing
 * detection here; demand fit reuses evaluateDemandSatisfaction, the same
 * detector the prompt's DETERMINISTIC SIGNALS section is built from.
 */
export function buildRequestDepth(transcript: string, question: Question, tier: 0 | 1 | 2 | 3): FeedbackDepth {
  const offline = offlineEvaluate(transcript, question);
  const errorCount = (offline.grammar?.critical?.length ?? 0) + (offline.grammar?.polish?.length ?? 0);
  const demandSatisfaction = question.demands
    ? evaluateDemandSatisfaction(transcript, question.demands)
    : undefined;
  return computeDepth({ transcript, errorCount, demandSatisfaction, responseTier: tier });
}
