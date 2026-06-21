// ── Coach MVP: Intervention loop contracts ─────────────────────────────────────
// Minimal shapes for the recurring-grammar remediation loop:
//   detect a LearningProblem → deliver an Intervention (MicroDrill) →
//   record an InterventionOutcome → update problem status → influence the next
//   recommendation. A deliberate subset of the fuller architecture spec.

/** Lifecycle of a tracked learning problem. */
export type ProblemStatus =
  | 'active'      // unresolved; the coach should steer the learner back to it
  | 'monitoring'  // one successful drill; watching for durability
  | 'resolved';   // remediated (two successful drills)

export interface LearningProblem {
  id: string;
  learnerId: string;
  /** Diagnostic skill node this problem concerns. */
  nodeId: string;
  /** MVP only models recurring errors (not avoidance/confidence problems). */
  problemType: 'error';
  /** 0–1 — scaled by how many recent failures contributed. */
  severity: number;
  /** Evidence event IDs that triggered/feed this problem. */
  evidenceIds: string[];
  status: ProblemStatus;
  detectedAt: string;
  updatedAt: string;
  /** Count of recovery drills passed (>= 0.67 immediate success). */
  successfulDrills?: number;
  /** Count of recovery drills failed (< 0.5 immediate success). */
  failedDrills?: number;
}

export interface Intervention {
  id: string;
  learnerId: string;
  problemId: string;
  nodeId: string;
  /** MVP delivers only retrieval-practice (sentence-rebuild MicroDrill). */
  strategyType: 'retrieval_practice';
  targetNodeIds: string[];
  /** Session the drill was offered in (for traceability). */
  deliveredInSessionId?: string;
  deliveredAt: string;
}

export interface InterventionOutcome {
  id: string;
  interventionId: string;
  problemId: string;
  nodeId: string;
  /** 0–1 — fraction of drill items answered correctly. */
  immediateSuccess: number;
  correct: number;
  total: number;
  evaluatedAt: string;
}
