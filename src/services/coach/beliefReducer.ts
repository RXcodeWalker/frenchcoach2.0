// ── Phase 2: Evidence-driven belief reducer ────────────────────────────────────
// Two pure functions are the entire public API:
//
//   reduceEvidenceToBeliefState(events)
//     Folds a list of EvidenceEvents into a per-skill accumulator map.
//     Stateless: pass all relevant events every call, or the stored state
//     plus a delta batch once incremental updates are needed.
//
//   projectEvidenceBeliefSnapshot(state, diagnosticFallback?)
//     Converts the accumulator map into the EvidenceBeliefSnapshot that
//     future recommendation and UI consumers will read. Falls back to
//     diagnosticEngine data for skills with insufficient evidence.
//
// Neither function reads or writes localStorage.
// Neither function has side effects.
// Both are safe to run in Node (no browser API calls).

import type { EvidenceEvent } from '../../types/evidence';
import type { SkillProfile } from '../../types';
import type {
  BeliefObservation,
  BeliefTrend,
  EvidenceDerivedSkillBelief,
  EvidenceBeliefSnapshot,
  SkillBeliefState,
} from '../../types/beliefs';
import { SKILL_DEFS } from '../coaching/diagnosticEngine';
import { LANGUAGE_SUCCESS_SCORE } from '../../domain/scoring';

// ── Constants ─────────────────────────────────────────────────────────────────

const HALF_LIFE_DAYS = 14;
const LAMBDA = Math.log(2) / HALF_LIFE_DAYS;

/** Events whose composite weight falls below this threshold are too noisy to
 *  update any skill belief. Short/garbled answers, empty transcripts, and
 *  low-confidence evaluators all produce weights below this floor. */
export const MIN_RELIABLE_WEIGHT = 0.15;

/** No single event can contribute more than this weight, regardless of how
 *  reliable it was, so a single outlier session cannot dominate the model. */
export const MAX_EVENT_WEIGHT = 0.80;

/** Keep the last N language observations per skill for trend analysis. */
const RECENT_OBS_WINDOW = 20;

/**
 * Laplace / uniform prior: start at (1, 1) so the first observation does not
 * produce extreme mastery values of 0 or 1.
 */
const PRIOR_ALPHA = 1.0;
const PRIOR_BETA  = 1.0;

/** Version string — bump when the reduction algorithm changes so cached
 *  belief state from old versions can be detected and rebuilt.
 *  Bumped to evidence-v2 in Phase 2: evidenceBuilder now derives per-event
 *  result.success from per-node observation outcomes (deriveNodeOutcome) when
 *  observations exist, rather than purely from the score >= LANGUAGE_SUCCESS_SCORE
 *  threshold — a real behavior change to what beliefs are computed from
 *  existing cached evidence, so old snapshots must be rebuilt. */
export const REDUCER_VERSION = 'evidence-v2';

// ── Weighting tables ──────────────────────────────────────────────────────────

/**
 * How strongly each activity mode's evidence counts relative to free practice.
 * Exam evidence is down-weighted because timed pressure and repeated questions
 * in a single sitting can distort the per-skill signal.
 */
const SOURCE_WEIGHTS: Record<string, number> = {
  practice: 1.00,
  story:    0.80,
  exam:     0.60,
};

/**
 * Upper bound on the reliability multiplier per evaluator type.
 * Prevents an over-confident offline engine from matching a calibrated LLM.
 */
const EVALUATOR_CAPS: Record<string, number> = {
  human:        1.00,
  llm:          0.85,
  speech_model: 0.70,
  heuristic:    0.60,
  offline:      0.50,
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function recencyWeight(occurredAt: string): number {
  const daysSince = (Date.now() - new Date(occurredAt).getTime()) / 86_400_000;
  return Math.exp(-LAMBDA * Math.max(0, daysSince));
}

function trendFromObservations(obs: BeliefObservation[]): BeliefTrend {
  if (obs.length < 4) return 'unknown';
  const mid = Math.floor(obs.length / 2);
  const rate = (slice: BeliefObservation[]) =>
    slice.filter(o => o.success).length / slice.length;
  const delta = rate(obs.slice(mid)) - rate(obs.slice(0, mid));
  if (delta >  0.20) return 'improving';
  if (delta < -0.20) return 'declining';
  return 'stable';
}

function emptyBeliefState(nodeId: string): SkillBeliefState {
  return {
    nodeId,
    alpha:           PRIOR_ALPHA,
    beta:            PRIOR_BETA,
    weightedSuccess: 0,
    weightedFailure: 0,
    weightedEvidence: 0,
    rawEvidenceCount: 0,
    avoidance: { weightedAvoided: 0, weightedInvited: 0 },
    recentObservations: [],
    sourceBreakdown: {},
    recurringIssueIds: [],
    lastObservedAt: null,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the composite weight for a single EvidenceEvent.
 *
 * weight = min(reliability × evaluatorCap, MAX_EVENT_WEIGHT)
 *          × sourceWeight
 *          × recencyWeight
 *
 * Exported so callers can inspect weights in tests without running the full
 * fold, and so future consumers (e.g. a UI debug panel) can show why an
 * event was counted or discarded.
 */
export function computeEventWeight(event: EvidenceEvent): number {
  const { assessmentConfidence, taskValidity, signalQuality, evaluator } = event.reliability;
  const reliability    = assessmentConfidence * taskValidity * signalQuality;
  const evaluatorCap   = EVALUATOR_CAPS[evaluator] ?? 0.65;
  const sourceWeight   = SOURCE_WEIGHTS[event.context.mode] ?? 0.70;
  const recency        = recencyWeight(event.occurredAt);

  return Math.min(reliability * evaluatorCap, MAX_EVENT_WEIGHT) * sourceWeight * recency;
}

/**
 * Pure fold: convert a flat list of EvidenceEvents into a per-skill belief
 * accumulator map.
 *
 * Events are sorted oldest-first before processing so that `recentObservations`
 * windows are always in chronological order regardless of input ordering.
 *
 * Noise controls applied:
 * - Language events below MIN_RELIABLE_WEIGHT are silently dropped.
 * - Avoidance (behavior) events are tracked separately and always included
 *   (avoidance is a useful signal even when the observation quality is low).
 * - Events with no targetNodeIds contribute nothing.
 */
export function reduceEvidenceToBeliefState(
  events: EvidenceEvent[],
): Record<string, SkillBeliefState> {
  const state: Record<string, SkillBeliefState> = {};

  const sorted = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  for (const event of sorted) {
    if (event.targetNodeIds.length === 0) continue;

    // ── Avoidance (behavior) events ─────────────────────────────────────────
    if (event.evidenceType === 'behavior') {
      const w = computeEventWeight(event);
      for (const nodeId of event.targetNodeIds) {
        if (!state[nodeId]) state[nodeId] = emptyBeliefState(nodeId);
        const s = state[nodeId];
        s.avoidance.weightedAvoided += w;
        s.avoidance.weightedInvited += w;
        if (!s.lastObservedAt || event.occurredAt > s.lastObservedAt) {
          s.lastObservedAt = event.occurredAt;
        }
      }
      continue;
    }

    // ── Language evidence events ─────────────────────────────────────────────
    if (event.evidenceType !== 'language') continue;

    const weight = computeEventWeight(event);
    if (weight < MIN_RELIABLE_WEIGHT) continue;

    const rawReliability =
      event.reliability.assessmentConfidence *
      event.reliability.taskValidity *
      event.reliability.signalQuality;

    // success is explicit when present; fall back to score threshold only
    // when a real score exists. An event with neither (unscored offline
    // attempt, no confident observations either way) has no success/failure
    // signal at all — it must not be silently treated as a failure via
    // `(undefined ?? 0) >= LANGUAGE_SUCCESS_SCORE`.
    const hasSuccessSignal = event.result.success !== undefined || event.result.score !== undefined;
    const isSuccess =
      event.result.success !== undefined
        ? event.result.success
        : (event.result.score ?? 0) >= LANGUAGE_SUCCESS_SCORE;

    for (const nodeId of event.targetNodeIds) {
      if (!state[nodeId]) state[nodeId] = emptyBeliefState(nodeId);
      const s = state[nodeId];

      // Beta distribution accumulators — skip entirely when there's no real
      // success/failure signal, rather than defaulting to "failure".
      if (hasSuccessSignal) {
        if (isSuccess) {
          s.weightedSuccess += weight;
          s.alpha           += weight;
        } else {
          s.weightedFailure += weight;
          s.beta            += weight;
        }
      }
      s.weightedEvidence += weight;
      s.rawEvidenceCount += 1;

      // Source breakdown
      const mode = event.context.mode;
      s.sourceBreakdown[mode] = (s.sourceBreakdown[mode] ?? 0) + weight;

      // Bounded observation window (oldest-first)
      const obs: BeliefObservation = {
        occurredAt:    event.occurredAt,
        sourceEventId: event.id,
        mode,
        score:         event.result.score,
        success:       isSuccess,
        weight,
        reliability:   rawReliability,
      };
      s.recentObservations.push(obs);
      if (s.recentObservations.length > RECENT_OBS_WINDOW) {
        s.recentObservations.shift();
      }

      // Recurring issue categories (unique, last 5)
      for (const cat of event.observation.issueCategories ?? []) {
        if (!s.recurringIssueIds.includes(cat)) {
          s.recurringIssueIds.push(cat);
          if (s.recurringIssueIds.length > 5) s.recurringIssueIds.shift();
        }
      }

      if (!s.lastObservedAt || event.occurredAt > s.lastObservedAt) {
        s.lastObservedAt = event.occurredAt;
      }
    }
  }

  return state;
}

/**
 * Pure projection: convert a belief state map into an EvidenceBeliefSnapshot.
 *
 * For each skill node defined in SKILL_DEFS:
 * - If weightedEvidence >= MIN_EVIDENCE_WEIGHT: derive mastery/confidence
 *   from the Beta distribution. Mark no fallback.
 * - Otherwise: fall back to diagnosticFallback if provided. Set
 *   `fallbackUsed: 'diagnosticEngine'` so consumers know the source.
 * - If neither: omit the skill (not enough data to surface it).
 *
 * weakestSkillIds / strongestSkillIds only include evidence-derived skills
 * (not fallback entries) to prevent stale diagnostic data from polluting
 * the recommendation target list.
 */
export function projectEvidenceBeliefSnapshot(
  beliefState: Record<string, SkillBeliefState>,
  diagnosticFallback?: SkillProfile,
  learnerId = 'local-user',
): EvidenceBeliefSnapshot {
  const skills: Record<string, EvidenceDerivedSkillBelief> = {};
  let totalEvidenceProcessed = 0;

  // Minimum total weighted evidence before we trust the evidence path
  const MIN_EVIDENCE_WEIGHT = 0.5;

  const allIds = new Set<string>([
    ...Object.keys(beliefState),
    ...(diagnosticFallback ? Object.keys(diagnosticFallback) : []),
  ]);

  for (const nodeId of allIds) {
    const def = SKILL_DEFS[nodeId];
    if (!def) continue;

    const s = beliefState[nodeId];

    // ── Diagnostic fallback path ─────────────────────────────────────────────
    if (!s || s.weightedEvidence < MIN_EVIDENCE_WEIGHT) {
      const fb = diagnosticFallback?.[nodeId];
      if (!fb) continue;

      skills[nodeId] = {
        nodeId,
        label:    def.name,
        category: def.category,
        mastery:  Math.round(fb.score * 100) / 100,
        // Cap confidence low so fallback data doesn't crowd out real evidence
        confidence:       Math.min(0.40, 0.10 * fb.feedbackCount),
        uncertainty:      0.80,
        trend:            'unknown',
        avoidanceScore:   0,
        evidenceCount:    fb.feedbackCount,
        weightedEvidence: 0,
        reliabilityMean:  0,
        lastObservedAt:   fb.lastSeen ? new Date(fb.lastSeen).toISOString() : null,
        recurringIssueIds: [],
        sourceBreakdown:  {},
        fallbackUsed:     'diagnosticEngine',
      };
      continue;
    }

    // ── Evidence-derived path ────────────────────────────────────────────────
    totalEvidenceProcessed += s.rawEvidenceCount;

    // Beta mean: expected mastery given the accumulated evidence
    const mastery = s.alpha / (s.alpha + s.beta);

    // Confidence grows with weighted evidence volume (asymptotic to 1)
    const confidence = 1 - 1 / (1 + s.weightedEvidence * 0.30);

    // Uncertainty: high when confidence is low; reduced when signal is consistent
    const balance = s.weightedEvidence > 0
      ? Math.abs(s.weightedSuccess - s.weightedFailure) / s.weightedEvidence
      : 0;
    const uncertainty = Math.max(0, (1 - confidence) * (1 - balance * 0.50));

    // Reliability mean across recent observations
    const reliabilityMean = s.recentObservations.length > 0
      ? s.recentObservations.reduce((sum, o) => sum + o.reliability, 0) /
        s.recentObservations.length
      : 0;

    // Avoidance score: proportion of invited occurrences that were avoided
    const { weightedAvoided, weightedInvited } = s.avoidance;
    const avoidanceScore = weightedInvited > 0
      ? Math.round((weightedAvoided / weightedInvited) * 100) / 100
      : 0;

    skills[nodeId] = {
      nodeId,
      label:       def.name,
      category:    def.category,
      mastery:         Math.round(mastery         * 100) / 100,
      confidence:      Math.round(confidence      * 100) / 100,
      uncertainty:     Math.round(uncertainty     * 100) / 100,
      trend:           trendFromObservations(s.recentObservations),
      avoidanceScore,
      evidenceCount:   s.rawEvidenceCount,
      weightedEvidence: Math.round(s.weightedEvidence * 100) / 100,
      reliabilityMean: Math.round(reliabilityMean * 100) / 100,
      lastObservedAt:  s.lastObservedAt,
      recurringIssueIds: [...s.recurringIssueIds],
      sourceBreakdown:   { ...s.sourceBreakdown },
    };
  }

  // Only evidence-derived skills participate in priority rankings
  const evidenceBased = Object.values(skills).filter(s => !s.fallbackUsed);

  const weakestSkillIds = evidenceBased
    .filter(s => s.mastery < 0.60 && s.confidence > 0.20)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5)
    .map(s => s.nodeId);

  const strongestSkillIds = evidenceBased
    .filter(s => s.mastery >= 0.80 && s.confidence > 0.35)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 5)
    .map(s => s.nodeId);

  return {
    learnerId,
    generatedAt:            new Date().toISOString(),
    reducerVersion:         REDUCER_VERSION,
    skills,
    weakestSkillIds,
    strongestSkillIds,
    totalEvidenceProcessed,
  };
}
