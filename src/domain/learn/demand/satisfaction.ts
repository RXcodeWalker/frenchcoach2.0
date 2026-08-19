/**
 * Asymmetric L1 demand-satisfaction evaluator — docs §9.3.
 *
 * The deterministic detectors in diagnosticEngine.ts are presence-reliable
 * but absence-unreliable (one, hasConditional, is currently broken outright —
 * see docs §3.8 / Stage 4b). So this evaluator never returns a "failed"
 * verdict: only `met` (a marker was found, or the word count clears the
 * responseLoad floor), `not_attempted` (word count is far short of the
 * floor — an authoritative absence, not a marker-based one), or `unknown`
 * (no marker found, but absence cannot be established — no evidence should
 * be emitted for this case).
 */
import {
  hasJustification,
  hasOpinion,
  hasConnectors,
  hasPerspective,
  hasSubjunctive,
  hasConditional,
} from '../../../services/coaching/diagnosticEngine';
import { wordCount } from './textCues';
import type { CognitiveDemand, QuestionDemands, ResponseLoad } from './types';

export type DemandSatisfactionState = 'met' | 'not_attempted' | 'unknown';

/**
 * Minimum word counts a `responseLoad` implies — docs §7's `~15 / ~40 / ~70+`
 * anchors. Not-attempted fires only at 0.4x this floor (docs §9.3): a
 * conservative, authoritative absence, not a marker-based guess.
 */
const RESPONSE_LOAD_MIN_WORDS: Record<ResponseLoad, number> = {
  short: 15,
  developed: 40,
  extended: 70,
};

const NOT_ATTEMPTED_FACTOR = 0.4;

/**
 * cognitiveDemand -> the marker check(s) that establish `met`. Not specified
 * verbatim by docs §9.3 (that table classifies per-detector reliability, not
 * a demand-to-detector mapping) — this is this module's interpretation,
 * confirmed with the plan owner. Each entry is "reliable presence,
 * unreliable absence": a hit is authoritative; a miss can only ever mean
 * `unknown`, never a failure.
 *
 *   describe    -> no dedicated marker; word count alone decides (see evaluate()).
 *                  Consequence: describe can only ever resolve to `met` or
 *                  `not_attempted` — never `unknown`. Intentional, not a gap
 *                  to be "fixed" later — see the satisfaction.test.ts case
 *                  asserting this.
 *   explain     -> hasJustification || hasConnectors
 *   justify     -> hasJustification || hasOpinion
 *   compare     -> hasPerspective || hasConnectors
 *   hypothesize -> hasConditional || hasJustification || hasPerspective
 *                  hasConditional was fixed in Stage 4b (diagnosticEngine.ts's
 *                  regex previously required a `\b` before `ais`, which never
 *                  matched after a vowel, e.g. `j'irais` — see docs
 *                  §3.8/§9.3) and is now wired in here as planned.
 */
const COGNITIVE_DEMAND_MARKERS: Record<CognitiveDemand, (transcript: string) => boolean> = {
  describe: () => false,
  explain: (t) => hasJustification(t) || hasConnectors(t),
  justify: (t) => hasJustification(t) || hasOpinion(t),
  compare: (t) => hasPerspective(t) || hasConnectors(t),
  hypothesize: (t) => hasConditional(t) || hasJustification(t) || hasPerspective(t),
};

/**
 * A structure's own marker, reusing the same closed-list detectors. Anything
 * without a mapped detector (perfect/imperfect/near-future/simple-future/
 * negation) has no L1 signal at all and is always `unknown`.
 */
const STRUCTURE_MARKERS: Partial<Record<QuestionDemands['structures'][number], (t: string) => boolean>> = {
  opinion: hasOpinion,
  justification: hasJustification,
  subjunctive: hasSubjunctive,
  conditional: hasConditional,
};

/**
 * Evaluate whether a transcript satisfies one question's demands, per the
 * docs §9.3 asymmetric rule. Returns a verdict per structure tagged on the
 * question (word-count-only when a structure has no L1 marker at all), plus
 * one verdict for the question's cognitiveDemand.
 *
 * `not_attempted` (word count far below the responseLoad floor) is
 * authoritative and wins over a marker miss, since a near-empty transcript
 * cannot contain any marker either way. `met` from word count alone (clearing
 * the full floor) only applies to `describe`, whose demand IS the response
 * itself — for every other demand, meeting the floor is necessary but not
 * sufficient, so a marker miss there still resolves to `unknown`, never `met`.
 */
export function evaluateDemandSatisfaction(
  transcript: string,
  demands: Pick<QuestionDemands, 'cognitiveDemand' | 'structures' | 'responseLoad'>,
): DemandSatisfactionState {
  const words = wordCount(transcript);
  const minWords = RESPONSE_LOAD_MIN_WORDS[demands.responseLoad];

  if (words < minWords * NOT_ATTEMPTED_FACTOR) {
    return 'not_attempted';
  }

  if (demands.cognitiveDemand === 'describe') {
    return words >= minWords ? 'met' : 'unknown';
  }

  const demandMarker = COGNITIVE_DEMAND_MARKERS[demands.cognitiveDemand];
  if (demandMarker(transcript)) {
    return 'met';
  }

  for (const structure of demands.structures) {
    const structureMarker = STRUCTURE_MARKERS[structure];
    if (structureMarker && structureMarker(transcript)) {
      return 'met';
    }
  }

  return 'unknown';
}
