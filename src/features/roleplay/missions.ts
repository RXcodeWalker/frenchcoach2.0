/**
 * Stage 4 — mission evaluation, as a pure fold over the append-only outcome
 * log. See "Mission semantics" and "Recovery semantics" in the overhaul plan.
 *
 * Invariants this module exists to enforce structurally:
 *
 *  - #2 Missions are *derived* from the outcome log, never set directly.
 *  - #3 A mission completes only on a real user achievement. There is no code
 *       path here that reads state entry, `memory`, or a skip.
 *  - #6 Task success and language score are independent: nothing below ever
 *       inspects `TurnOutcome.language`.
 *
 * Because it is existence-based over the whole log, completion is idempotent
 * and order-independent: replaying a turn cannot double-complete, and a retry
 * (which *replaces* the last outcome rather than appending) correctly
 * un-completes a mission it had previously satisfied.
 *
 * Settled decision, recorded so a later stage does not reopen it: `memory` is
 * NOT a MissionCondition variant. hairdresser's `set_*` nodes produce
 * `auto_advance`, so a memory condition would grant credit with no user
 * utterance behind it — the identical hole the plan closed by deleting the
 * `states` condition. Reaching `set_balayage` is already a consequence of the
 * user having matched the `balayage` intent one turn earlier, so an intent
 * condition on that state captures the achievement; a memory condition would
 * double-count it and would also fire on `set_*` nodes reached by a recovery
 * skip. `memory` stays a presentational session accumulator.
 */
import { START_STATE } from './constants';
import type { Mission, MissionCondition, ScenarioMeta, TurnOutcome } from './types';

export interface MissionStatus {
  /** Ids of the missions satisfied by the log so far. */
  completed: string[];
  /** How many missions are in play on the branch actually taken. */
  applicable: number;
  /** Whether the session reached here via at least one recovery skip. */
  skipped: boolean;
}

/**
 * A `slot` condition may be satisfied by a turn the user actually completed —
 * either a matched intent or a `next`-only `auto_advance` through a `capture`
 * node. A `skipped` turn satisfies nothing, and a misfire (`no_match` /
 * `ambiguous`) does not advance the state, so neither counts.
 */
function outcomeCountsForSlot(outcome: TurnOutcome): boolean {
  return outcome.intentResult.kind === 'matched' || outcome.intentResult.kind === 'auto_advance';
}

function conditionSatisfied(condition: MissionCondition, outcomes: readonly TurnOutcome[]): boolean {
  if (condition.kind === 'intent') {
    // Invariant #3 — only `matched` ever satisfies an intent condition.
    return outcomes.some(
      (o) =>
        o.state === condition.state &&
        o.intentResult.kind === 'matched' &&
        o.intentResult.intent === condition.intent,
    );
  }
  return outcomes.some(
    (o) =>
      o.state === condition.state &&
      outcomeCountsForSlot(o) &&
      o.slotFilled?.slot === condition.slot &&
      o.slotFilled.wordCount >= condition.minWords,
  );
}

/** A mission is complete when ALL of its conditions hold — AND, never OR. */
export function isMissionComplete(mission: Mission, outcomes: readonly TurnOutcome[]): boolean {
  // An empty `requires` would be complete-by-default, which is credit without
  // achievement; the Stage 2 validator rejects it, and this guards the runtime.
  if (mission.requires.length === 0) return false;
  return mission.requires.every((condition) => conditionSatisfied(condition, outcomes));
}

/** Whether any turn in the log was resolved by a recovery skip. */
export function hadSkips(outcomes: readonly TurnOutcome[]): boolean {
  return outcomes.some((o) => o.intentResult.kind === 'skipped');
}

/**
 * The branch the session actually entered, i.e. the FIRST matched intent at
 * `start` that names a key of `meta.branches`.
 *
 * First, not last, deliberately: bakery's `pastry` branch loops back through
 * `start` (order a pastry, say yes to "anything else?", then order bread), and
 * that second visit must not silently re-assign the session to the `bread`
 * branch and swap the mission set out from under the learner.
 */
export function resolveBranchId(
  branches: ScenarioMeta['branches'],
  outcomes: readonly TurnOutcome[],
): string | undefined {
  for (const outcome of outcomes) {
    if (outcome.state !== START_STATE) continue;
    if (outcome.intentResult.kind !== 'matched') continue;
    const intent = outcome.intentResult.intent;
    if (intent in branches) return intent;
  }
  return undefined;
}

/** The missions in play, given the branch the session actually entered. */
export function applicableMissions(
  branches: ScenarioMeta['branches'],
  outcomes: readonly TurnOutcome[],
): Mission[] {
  const branchId = resolveBranchId(branches, outcomes);
  return branchId ? [...branches[branchId].missions] : [];
}

/**
 * The fold. `missions` are the branch's missions — pass
 * `applicableMissions(meta.branches, outcomes)` unless you already know the
 * branch.
 */
export function missionStatus(
  missions: readonly Mission[],
  outcomes: readonly TurnOutcome[],
): MissionStatus {
  return {
    completed: missions.filter((m) => isMissionComplete(m, outcomes)).map((m) => m.id),
    applicable: missions.length,
    skipped: hadSkips(outcomes),
  };
}

/**
 * Completion ratio on the branch actually taken, clamped to 0..1. Zero when no
 * branch has been entered yet, so a scenario is never scored out of its full
 * cross-branch mission count.
 */
export function completionRatio(status: MissionStatus): number {
  if (status.applicable <= 0) return 0;
  return Math.min(1, status.completed.length / status.applicable);
}
