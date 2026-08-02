// ── Coach MVP: intervention service ────────────────────────────────────────────
// Closed loop for recurring grammar mistakes:
//   detectProblem (pure) → detectAndPersistProblem → recordIntervention (drill
//   delivered) → recordInterventionOutcome → applyOutcomeToProblem (pure) →
//   problem status drives the next recommendation.
//
// Pure functions (detectProblem, applyOutcomeToProblem) carry the logic and are
// unit-tested without storage. Thin wrappers add localStorage persistence.

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { track } from '../telemetry/telemetryService';
import type { EvidenceEvent } from '../../types/evidence';
import type { EvidenceBeliefSnapshot } from '../../types/beliefs';
import type {
  LearningProblem,
  Intervention,
  InterventionOutcome,
} from '../../types/intervention';
import { LEARNER_ID } from './coachStorage';
import { isGrammarSkill, hasMicroDrillForSkill } from './recurringGrammar';
import { LANGUAGE_SUCCESS_SCORE } from '../../domain/scoring';

const WEEK_MS = 7 * 86_400_000;
/** Avoid drill fatigue: no second intervention for a node within this window. */
const DRILL_COOLDOWN_MS = 24 * 3_600_000;
const FAILURE_SCORE_THRESHOLD = LANGUAGE_SUCCESS_SCORE;
/** Immediate-success thresholds for outcome → status transitions. */
const DRILL_PASS = 0.67;
const DRILL_FAIL = 0.5;
/** Successful drills required to mark a problem resolved. */
const RESOLVE_AFTER_SUCCESSES = 2;

const MAX_PROBLEMS = 50;
const MAX_INTERVENTIONS = 100;
const MAX_OUTCOMES = 100;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isLanguageFailure(ev: EvidenceEvent): boolean {
  if (ev.evidenceType !== 'language') return false;
  if (ev.result.success === false) return true;
  return (ev.result.score ?? 10) < FAILURE_SCORE_THRESHOLD;
}

/** True when a node's failed events repeat the same issue category (a pattern). */
function hasRepeatedIssueCategories(events: EvidenceEvent[], nodeId: string): boolean {
  const counts: Record<string, number> = {};
  for (const ev of events) {
    if (!isLanguageFailure(ev) || !ev.targetNodeIds.includes(nodeId)) continue;
    for (const cat of ev.observation.issueCategories ?? []) {
      counts[cat] = (counts[cat] ?? 0) + 1;
      if (counts[cat] >= 2) return true;
    }
  }
  return false;
}

// ── Pure detection ──────────────────────────────────────────────────────────

export interface DetectProblemOptions {
  existingProblems?: LearningProblem[];
  recentInterventions?: Intervention[];
  now?: number;
}

/**
 * Detect a recurring-grammar problem from the evidence log. All gates must hold:
 *   1. Same grammar node fails (success === false OR score < 7) >= 2× in 7 days.
 *   2. MicroDrill content exists for the node (so we can actually intervene).
 *   3. No intervention delivered for the node in the last 24h (cooldown).
 * A recurring snapshot signal (recurringIssueIds / repeated issueCategories)
 * raises the problem's severity but is not a hard gate — two failures of the
 * same node is itself the recurrence.
 *
 * Pure: no storage access. Returns the most-failed eligible node, or null.
 */
export function detectProblem(
  events: EvidenceEvent[],
  snapshot: EvidenceBeliefSnapshot | null,
  options: DetectProblemOptions = {},
): LearningProblem | null {
  const now = options.now ?? Date.now();
  const cutoff = now - WEEK_MS;
  const recentInterventions = options.recentInterventions ?? [];

  const failByNode: Record<string, string[]> = {};
  for (const ev of events) {
    if (!isLanguageFailure(ev)) continue;
    if (new Date(ev.occurredAt).getTime() < cutoff) continue;
    for (const nodeId of ev.targetNodeIds) {
      if (!isGrammarSkill(nodeId) || !hasMicroDrillForSkill(nodeId)) continue;
      (failByNode[nodeId] ??= []).push(ev.id);
    }
  }

  const candidates = Object.entries(failByNode)
    .filter(([, ids]) => ids.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [nodeId, evidenceIds] of candidates) {
    const onCooldown = recentInterventions.some(
      iv => iv.nodeId === nodeId && now - new Date(iv.deliveredAt).getTime() < DRILL_COOLDOWN_MS,
    );
    if (onCooldown) continue;

    const belief = snapshot?.skills[nodeId];
    const recurring =
      (belief?.recurringIssueIds?.length ?? 0) >= 1 ||
      hasRepeatedIssueCategories(events, nodeId);

    const severity = Math.min(1, evidenceIds.length / 3 + (recurring ? 0.2 : 0));
    const nowIso = new Date(now).toISOString();

    return {
      id: makeId('prob'),
      learnerId: LEARNER_ID,
      nodeId,
      problemType: 'error',
      severity: Math.round(severity * 100) / 100,
      evidenceIds: [...new Set(evidenceIds)],
      status: 'active',
      detectedAt: nowIso,
      updatedAt: nowIso,
      successfulDrills: 0,
      failedDrills: 0,
      isRecurring: recurring,
      recurrenceNote: evidenceIds.length >= 3 ? `Missed ${evidenceIds.length} times this week` : undefined,
    };
  }

  return null;
}

// ── Pure outcome resolution ───────────────────────────────────────────────────

/**
 * Apply a drill outcome to a problem's status:
 *   immediateSuccess >= 0.67 → 'monitoring' (→ 'resolved' after 2 successes)
 *   immediateSuccess <  0.50 → 'active' (failed; keep remediating)
 *   otherwise                → 'monitoring' (partial)
 * Pure: returns a new problem object.
 */
export function applyOutcomeToProblem(
  problem: LearningProblem,
  immediateSuccess: number,
  now: number = Date.now(),
): LearningProblem {
  let successfulDrills = problem.successfulDrills ?? 0;
  let failedDrills = problem.failedDrills ?? 0;
  let status = problem.status;

  if (immediateSuccess >= DRILL_PASS) {
    successfulDrills += 1;
    status = successfulDrills >= RESOLVE_AFTER_SUCCESSES ? 'resolved' : 'monitoring';
  } else if (immediateSuccess < DRILL_FAIL) {
    failedDrills += 1;
    status = 'active';
  } else {
    status = 'monitoring';
  }

  return {
    ...problem,
    successfulDrills,
    failedDrills,
    status,
    updatedAt: new Date(now).toISOString(),
  };
}

// ── Storage CRUD ──────────────────────────────────────────────────────────────

export function getProblems(): LearningProblem[] {
  return storageGet<LearningProblem[]>(STORAGE_KEYS.coachProblems, []);
}

function saveProblems(problems: LearningProblem[]): void {
  storageSet(STORAGE_KEYS.coachProblems, problems.slice(0, MAX_PROBLEMS));
}

export function getInterventions(): Intervention[] {
  return storageGet<Intervention[]>(STORAGE_KEYS.coachInterventions, []);
}

function saveInterventions(items: Intervention[]): void {
  storageSet(STORAGE_KEYS.coachInterventions, items.slice(-MAX_INTERVENTIONS));
}

export function getOutcomes(): InterventionOutcome[] {
  return storageGet<InterventionOutcome[]>(STORAGE_KEYS.coachInterventionOutcomes, []);
}

function saveOutcomes(items: InterventionOutcome[]): void {
  storageSet(STORAGE_KEYS.coachInterventionOutcomes, items.slice(-MAX_OUTCOMES));
}

/**
 * The most relevant unresolved problem: 'active' problems first (highest
 * severity), then 'monitoring'. Optionally filtered to a single node.
 */
export function getActiveProblem(nodeId?: string): LearningProblem | null {
  const unresolved = getProblems().filter(
    p => p.status !== 'resolved' && (!nodeId || p.nodeId === nodeId),
  );
  if (unresolved.length === 0) return null;
  unresolved.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return b.severity - a.severity;
  });
  return unresolved[0];
}

// ── Persisted detection + lifecycle ─────────────────────────────────────────────

/**
 * Detect a problem from the evidence log and persist it. If an unresolved
 * problem for the same node already exists, it is refreshed (merged evidence,
 * updated severity) rather than duplicated.
 */
export function detectAndPersistProblem(
  events: EvidenceEvent[],
  snapshot: EvidenceBeliefSnapshot | null,
): LearningProblem | null {
  const existing = getProblems();
  const detected = detectProblem(events, snapshot, {
    existingProblems: existing,
    recentInterventions: getInterventions(),
  });
  if (!detected) return null;

  const prior = existing.find(p => p.nodeId === detected.nodeId && p.status !== 'resolved');
  if (prior) {
    const merged: LearningProblem = {
      ...prior,
      evidenceIds: [...new Set([...prior.evidenceIds, ...detected.evidenceIds])],
      severity: Math.max(prior.severity, detected.severity),
      updatedAt: detected.detectedAt,
      isRecurring: detected.isRecurring,
      recurrenceNote: detected.recurrenceNote,
    };
    saveProblems(existing.map(p => (p.id === prior.id ? merged : p)));
    return merged;
  }

  saveProblems([detected, ...existing]);
  return detected;
}

/** Record that a recovery drill was delivered for a problem. */
export function recordIntervention(args: {
  problemId: string;
  nodeId: string;
  deliveredInSessionId?: string;
}): Intervention {
  const intervention: Intervention = {
    id: makeId('iv'),
    learnerId: LEARNER_ID,
    problemId: args.problemId,
    nodeId: args.nodeId,
    strategyType: 'retrieval_practice',
    targetNodeIds: [args.nodeId],
    deliveredInSessionId: args.deliveredInSessionId,
    deliveredAt: new Date().toISOString(),
  };
  saveInterventions([...getInterventions(), intervention]);
  return intervention;
}

/**
 * Record a drill outcome, persist it, and update the linked problem's status.
 * Returns the stored outcome and the updated problem (if found).
 */
export function recordInterventionOutcome(args: {
  interventionId: string;
  problemId: string;
  nodeId: string;
  correct: number;
  total: number;
  immediateSuccess: number;
}): { outcome: InterventionOutcome; problem: LearningProblem | null } {
  const outcome: InterventionOutcome = {
    id: makeId('out'),
    interventionId: args.interventionId,
    problemId: args.problemId,
    nodeId: args.nodeId,
    immediateSuccess: Math.max(0, Math.min(1, args.immediateSuccess)),
    correct: args.correct,
    total: args.total,
    evaluatedAt: new Date().toISOString(),
  };
  saveOutcomes([...getOutcomes(), outcome]);

  const problems = getProblems();
  const target = problems.find(p => p.id === args.problemId);
  if (!target) return { outcome, problem: null };

  const updated = applyOutcomeToProblem(target, outcome.immediateSuccess);
  saveProblems(problems.map(p => (p.id === target.id ? updated : p)));
  track({ name: 'drill_completed', props: { node_id: args.nodeId, immediate_success: outcome.immediateSuccess, correct: args.correct, total: args.total, problem_status: updated.status } });
  return { outcome, problem: updated };
}
