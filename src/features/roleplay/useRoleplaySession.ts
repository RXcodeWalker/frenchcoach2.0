/**
 * Stage 4 — roleplay session reducer and its React binding.
 *
 * The reducer is pure and synchronous. That is deliberate and load-bearing:
 * it is what lets `session.test.ts` walk all thirty graphs without mocking a
 * network layer, and it keeps the language leg (which is asynchronous, and
 * whose producer arrives in Stage 6) entirely outside the state machine.
 *
 * The scoring seam: `SUBMIT_TURN` and `RETRY` take `language` as a REQUIRED
 * field. It is never optional and never defaulted — an optional language leg
 * would invite a synthesised `{ kind: 'unscored' }` fallback, which is a
 * fabricated verdict about work that was never assessed. The caller must have
 * actually attempted scoring, even if the attempt failed. The reducer records
 * what it is given verbatim and never reads it again; invariant #6 (task
 * success and language quality are independent) is therefore enforced
 * structurally rather than by convention.
 */
import { useCallback, useMemo, useReducer } from 'react';
import {
  MAX_CONSECUTIVE_MISFIRES,
  MAX_TURNS,
  START_STATE,
} from './constants';
import { matchIntent, triggersForState } from './intentMatcher';
import { applicableMissions, completionRatio, missionStatus, resolveBranchId } from './missions';
import type { MissionStatus } from './missions';
import type {
  LanguageResult,
  Mission,
  ScenarioGraph,
  ScenarioMeta,
  TurnOutcome,
  TurnOutcomeIntentResult,
} from './types';
import type { OfflineScenarioState } from '../../types/index';

export type SessionPhase = 'briefing' | 'prep' | 'play' | 'debrief';

/**
 * How a state consumes a turn.
 *
 *  - `choice`      — has `intents`; the matcher decides the branch.
 *  - `capture`     — no `intents` but a `capture` slot; the user speaks and the
 *                    utterance is stored, then the graph advances via `next`.
 *  - `passthrough` — `next` only, nothing asked of the user (hairdresser's
 *                    `set_*` memory setters). Entered, spoken, passed through.
 *  - `terminal`    — no `next`, no `intents`. `end_session_fail` is one of
 *                    these and is a legitimate ending, not an error.
 */
export type StateKind = 'choice' | 'capture' | 'passthrough' | 'terminal';

export function stateKind(node: OfflineScenarioState | undefined): StateKind {
  if (!node) return 'terminal';
  if (node.intents && Object.keys(node.intents).length > 0) return 'choice';
  if (!node.next) return 'terminal';
  return node.capture ? 'capture' : 'passthrough';
}

/**
 * Snapshot taken before each recorded turn so `RETRY` can *replace* the last
 * outcome rather than append one. Everything a turn mutates is captured, so a
 * retry rewinds the graph position, the misfire counter, and the slot/memory
 * accumulators together — otherwise a retry after a successful advance would
 * re-score from the wrong state.
 */
interface Checkpoint {
  currentState: string;
  turnIndex: number;
  misfireCount: number;
  slots: Record<string, string>;
  memory: Record<string, unknown>;
  outcomeCount: number;
}

export interface RoleplaySessionState {
  scenarioId: string;
  /** Derived from the outcome log after every turn — never assigned directly. */
  branchId: string | undefined;
  currentState: string;
  /** Append-only, except that RETRY replaces the final entry (invariant #2). */
  outcomes: TurnOutcome[];
  slots: Record<string, string>;
  /** Session-scoped accumulator. Presentational only — never a mission condition. */
  memory: Record<string, unknown>;
  turnIndex: number;
  misfireCount: number;
  phase: SessionPhase;
  /** Seeds the stable pick from a node's `prompt[]`, so re-renders do not reshuffle it. */
  rngSeed: number;
  checkpoint: Checkpoint | undefined;
}

export type RoleplayAction =
  | { type: 'SET_PHASE'; phase: SessionPhase }
  | { type: 'START' }
  | { type: 'ADVANCE' }
  | { type: 'SUBMIT_TURN'; transcript: string; language: LanguageResult }
  | { type: 'RETRY'; transcript: string; language: LanguageResult };

export interface ReducerContext {
  graph: ScenarioGraph;
  meta: ScenarioMeta;
}

/**
 * The language leg of a `passthrough` turn (hairdresser's `set_*` nodes).
 *
 * This is NOT a default for `SUBMIT_TURN` and must never become one. It applies
 * only where the user was never asked to speak, so there is no utterance in
 * existence to grade; recording "not graded" is the honest report, not a
 * verdict about anything the learner did.
 *
 * Stage 6 handoff: `feedback` is `unknown` until Stage 6 wires FeedbackV2, at
 * which point this becomes the canonical unscored result carrying
 * `unscored: 'below_assessable_length'`, per the plan's failure table.
 */
export const PASSTHROUGH_LANGUAGE: LanguageResult = { kind: 'unscored', feedback: null };

export function createSessionState(scenarioId: string, rngSeed = 0): RoleplaySessionState {
  return {
    scenarioId,
    branchId: undefined,
    currentState: START_STATE,
    outcomes: [],
    slots: {},
    memory: {},
    turnIndex: 0,
    misfireCount: 0,
    phase: 'briefing',
    rngSeed,
    checkpoint: undefined,
  };
}

/** Words as a human would count them — NOT matcher tokens, which split elisions. */
export function countWords(transcript: string): number {
  return transcript.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Stable deterministic pick from a node's `prompt[]`. Depends only on the
 * session seed and the state name, so it survives re-render and is
 * reproducible in tests.
 */
export function pickPrompt(prompts: readonly string[], seed: number, state: string): string {
  if (prompts.length === 0) return '';
  let hash = seed >>> 0;
  for (let i = 0; i < state.length; i++) {
    hash = (Math.imul(hash, 31) + state.charCodeAt(i)) >>> 0;
  }
  return prompts[hash % prompts.length];
}

/**
 * Where a recovery skip advances to: the highest-`priority` authored branch at
 * this state, else `next`, else the first declared intent target.
 *
 * The last fallback only matters for an intent-bearing state with no authored
 * triggers, which the Stage 2 validator permits for unauthored side-branches.
 * Object key order in the graph JSON is insertion order, so it is
 * deterministic rather than arbitrary.
 */
function skipTarget(node: OfflineScenarioState, meta: ScenarioMeta, state: string): string | undefined {
  const intents = node.intents ?? {};
  const candidates = triggersForState(meta.triggers, state)
    .filter((t) => t.intent in intents)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.intent.localeCompare(b.intent));
  if (candidates.length > 0) return intents[candidates[0].intent];
  if (node.next) return node.next;
  const keys = Object.keys(intents);
  return keys.length > 0 ? intents[keys[0]] : undefined;
}

/** Shallow-merges a state's authored `memory` into the session accumulator. */
function enterState(
  graph: ScenarioGraph,
  memory: Record<string, unknown>,
  target: string,
): Record<string, unknown> {
  const authored = graph[target]?.memory;
  return authored ? { ...memory, ...authored } : memory;
}

/**
 * Commits one turn: appends the outcome, moves the graph, re-derives the
 * branch, and ends the session when a terminal or MAX_TURNS is reached.
 */
function commitTurn(
  state: RoleplaySessionState,
  ctx: ReducerContext,
  args: {
    intentResult: TurnOutcomeIntentResult;
    transcript: string;
    language: LanguageResult;
    nextState: string;
    slotFilled?: { slot: string; wordCount: number };
    slotValue?: { slot: string; value: string };
    misfireCount: number;
    checkpoint: Checkpoint;
  },
): RoleplaySessionState {
  const outcome: TurnOutcome = {
    turnIndex: state.turnIndex,
    state: state.currentState,
    transcript: args.transcript,
    intentResult: args.intentResult,
    ...(args.slotFilled ? { slotFilled: args.slotFilled } : {}),
    language: args.language,
  };

  const outcomes = [...state.outcomes.slice(0, args.checkpoint.outcomeCount), outcome];
  const slots = args.slotValue
    ? { ...state.slots, [args.slotValue.slot]: args.slotValue.value }
    : state.slots;
  const advanced = args.nextState !== state.currentState;
  const memory = advanced ? enterState(ctx.graph, state.memory, args.nextState) : state.memory;
  const turnIndex = state.turnIndex + 1;

  // Termination bound #1 (terminal state) and #2 (MAX_TURNS). Bound #3 is the
  // misfire skip, applied by the caller before it gets here.
  const reachedTerminal = stateKind(ctx.graph[args.nextState]) === 'terminal';
  const phase: SessionPhase = reachedTerminal || turnIndex >= MAX_TURNS ? 'debrief' : state.phase;

  return {
    ...state,
    currentState: args.nextState,
    outcomes,
    slots,
    memory,
    turnIndex,
    misfireCount: args.misfireCount,
    branchId: resolveBranchId(ctx.meta.branches, outcomes),
    phase,
    checkpoint: args.checkpoint,
  };
}

/**
 * Applies a user turn from `state.currentState`. Shared by SUBMIT_TURN and
 * RETRY — RETRY simply rewinds to the checkpoint first, so the two cannot
 * drift apart.
 */
function applyTurn(
  state: RoleplaySessionState,
  ctx: ReducerContext,
  transcript: string,
  language: LanguageResult,
): RoleplaySessionState {
  const node = ctx.graph[state.currentState];
  const kind = stateKind(node);
  if (kind === 'terminal' || state.turnIndex >= MAX_TURNS) return state;

  const checkpoint: Checkpoint = {
    currentState: state.currentState,
    turnIndex: state.turnIndex,
    misfireCount: state.misfireCount,
    slots: state.slots,
    memory: state.memory,
    outcomeCount: state.outcomes.length,
  };

  if (kind === 'capture' || kind === 'passthrough') {
    // No choice was asked for, so nothing can misfire here.
    const slot = node.capture;
    return commitTurn(state, ctx, {
      intentResult: { kind: 'auto_advance' },
      transcript,
      language,
      nextState: node.next as string,
      ...(slot
        ? {
            slotFilled: { slot, wordCount: countWords(transcript) },
            slotValue: { slot, value: transcript },
          }
        : {}),
      misfireCount: 0,
      checkpoint,
    });
  }

  const intents = node.intents as Record<string, string>;
  const result = matchIntent(transcript, triggersForState(ctx.meta.triggers, state.currentState));

  // A trigger naming an intent the graph does not declare is a Stage 2
  // validator error; if one ever slips through, treat it as a miss rather than
  // navigating nowhere.
  if (result.kind === 'matched' && result.intent in intents) {
    const slot = node.capture;
    return commitTurn(state, ctx, {
      intentResult: result,
      transcript,
      language,
      nextState: intents[result.intent],
      ...(slot
        ? {
            slotFilled: { slot, wordCount: countWords(transcript) },
            slotValue: { slot, value: transcript },
          }
        : {}),
      misfireCount: 0,
      checkpoint,
    });
  }

  const misfire: TurnOutcomeIntentResult =
    result.kind === 'ambiguous' ? result : { kind: 'no_match' };
  const misfireCount = state.misfireCount + 1;

  if (misfireCount >= MAX_CONSECUTIVE_MISFIRES) {
    // Termination bound #3. The turn is recorded as `skipped`, which satisfies
    // no mission condition and carries no task credit — the user is told
    // plainly that this step was not completed.
    const target = skipTarget(node, ctx.meta, state.currentState);
    return commitTurn(state, ctx, {
      intentResult: { kind: 'skipped' },
      transcript,
      language,
      nextState: target ?? state.currentState,
      misfireCount: 0,
      checkpoint,
    });
  }

  // A misfire records its outcome but does NOT advance the graph.
  return commitTurn(state, ctx, {
    intentResult: misfire,
    transcript,
    language,
    nextState: state.currentState,
    misfireCount,
    checkpoint,
  });
}

export function roleplayReducer(
  state: RoleplaySessionState,
  action: RoleplayAction,
  ctx: ReducerContext,
): RoleplaySessionState {
  switch (action.type) {
    case 'SET_PHASE':
      return state.phase === action.phase ? state : { ...state, phase: action.phase };

    case 'START':
      return {
        ...createSessionState(state.scenarioId, state.rngSeed),
        phase: 'play',
        memory: enterState(ctx.graph, {}, START_STATE),
      };

    case 'ADVANCE': {
      // Pass through a `set_*` style node: the NPC speaks, nothing is asked.
      const node = ctx.graph[state.currentState];
      if (stateKind(node) !== 'passthrough') return state;
      return applyTurn(state, ctx, '', PASSTHROUGH_LANGUAGE);
    }

    case 'SUBMIT_TURN':
      return applyTurn(state, ctx, action.transcript, action.language);

    case 'RETRY': {
      const checkpoint = state.checkpoint;
      if (!checkpoint) return state;
      const rewound: RoleplaySessionState = {
        ...state,
        currentState: checkpoint.currentState,
        turnIndex: checkpoint.turnIndex,
        misfireCount: checkpoint.misfireCount,
        slots: checkpoint.slots,
        memory: checkpoint.memory,
        outcomes: state.outcomes.slice(0, checkpoint.outcomeCount),
        branchId: resolveBranchId(ctx.meta.branches, state.outcomes.slice(0, checkpoint.outcomeCount)),
        phase: 'play',
        checkpoint: undefined,
      };
      return applyTurn(rewound, ctx, action.transcript, action.language);
    }

    default:
      return state;
  }
}

export interface RoleplaySession {
  state: RoleplaySessionState;
  /** The NPC's line at the current state, stable across re-render. */
  npcLine: string;
  /** How the current state consumes a turn. */
  kind: StateKind;
  missions: Mission[];
  status: MissionStatus;
  ratio: number;
  setPhase: (phase: SessionPhase) => void;
  start: () => void;
  advance: () => void;
  submitTurn: (transcript: string, language: LanguageResult) => void;
  retry: (transcript: string, language: LanguageResult) => void;
}

export function useRoleplaySession(
  scenarioId: string,
  graph: ScenarioGraph,
  meta: ScenarioMeta,
  rngSeed = 1,
): RoleplaySession {
  const ctx = useMemo<ReducerContext>(() => ({ graph, meta }), [graph, meta]);
  const [state, dispatch] = useReducer(
    (s: RoleplaySessionState, a: RoleplayAction) => roleplayReducer(s, a, ctx),
    undefined,
    () => createSessionState(scenarioId, rngSeed),
  );

  const node = graph[state.currentState];
  const npcLine = useMemo(
    () => pickPrompt(node?.prompt ?? [], state.rngSeed, state.currentState),
    [node, state.rngSeed, state.currentState],
  );
  const missions = useMemo(
    () => applicableMissions(meta.branches, state.outcomes),
    [meta.branches, state.outcomes],
  );
  const status = useMemo(() => missionStatus(missions, state.outcomes), [missions, state.outcomes]);

  return {
    state,
    npcLine,
    kind: stateKind(node),
    missions,
    status,
    ratio: completionRatio(status),
    setPhase: useCallback((phase: SessionPhase) => dispatch({ type: 'SET_PHASE', phase }), []),
    start: useCallback(() => dispatch({ type: 'START' }), []),
    advance: useCallback(() => dispatch({ type: 'ADVANCE' }), []),
    submitTurn: useCallback(
      (transcript: string, language: LanguageResult) =>
        dispatch({ type: 'SUBMIT_TURN', transcript, language }),
      [],
    ),
    retry: useCallback(
      (transcript: string, language: LanguageResult) =>
        dispatch({ type: 'RETRY', transcript, language }),
      [],
    ),
  };
}
