// ── Slot-based selector — docs §8. Pure types only, no logic here. ─────────────

import type { Question } from '../../../types';
import type { SessionBlend } from '../../../types/coach';
import type { CognitiveDemand, DemandProvenance } from '../demand/types';

export type SlotType = 'warmup' | 'review' | 'target' | 'stretch' | 'choice';

/** docs §8.1 — inclusive band a slot's candidates must (ideally) fall within. */
export interface DemandBand {
  lo: number;
  hi: number;
}

/** One planned slot in a session, before candidates are chosen. docs §8.1. */
export interface SessionSlot {
  type: SlotType;
  /** Absent for the `review` slot — its band is ignored; filled from the review pool. */
  band: DemandBand | null;
}

/** docs §8.1 — sessionTarget is the already-computed `clamp(abilityScore + aim, 0, 10)` value. */
export interface PlanSlotsArgs {
  sessionBlend: SessionBlend;
  sessionTarget: number;
  count: number;
}

/** docs §14.2 "why this question" — shown verbatim, never the raw score. */
export interface SelectionReason {
  slot: SlotType;
  explanation: string;
}

/** One candidate considered by scoreCandidate — docs §8.2. */
export interface SelectionCandidate {
  question: Question;
  /** demand:<CognitiveDemand> confidence for this question's own cognitiveDemand, or null when the question carries no demands (legacy/escalation-rung-4 path). */
  demandNodeConfidence: number | null;
  /** Whether this question id is in the learner's historical seen set. */
  seen: boolean;
  /** Whether this question's cognitiveDemand was already used earlier in this session's fill. */
  cognitiveDemandUsedThisSession: boolean;
}

export interface ScoreCandidateArgs {
  candidate: SelectionCandidate;
  slot: SessionSlot;
  focusSkillIds: string[];
  /** cognitiveDemand of any active demand LearningProblem, when one exists — docs §10 "Interventions". */
  activeDemandProblem: CognitiveDemand | null;
}

export const PROVENANCE_TRUST: Record<DemandProvenance, number> = {
  authored: 1.0,
  reviewed: 0.7,
  inferred: 0.3,
};

export interface SelectQuestionsArgs {
  /** Pool for this topic only — never cross-topic (docs §8.3). */
  pool: Question[];
  slots: SessionSlot[];
  chosenIds: Set<string>;
  seenIds: Set<string>;
  focusSkillIds: string[];
  activeDemandProblem: CognitiveDemand | null;
  /** Injected so review-slot filling stays the caller's existing reviewPool contract — docs §8.3 slot 1. */
  getReviewQuestion: (chosenIds: Set<string>) => Question | null;
}

export interface SelectedQuestion {
  question: Question;
  slot: SlotType;
  reason: SelectionReason;
}

export interface SelectQuestionsResult {
  selected: SelectedQuestion[];
  /** Actual count, which may be < slots.length per the docs §8.3 rung-5 fallback. */
  targetCount: number;
}
