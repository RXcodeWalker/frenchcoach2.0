/**
 * The 4-3-2 drill's flow (pure reducer; fluency-trainer §3.2).
 *
 *   countdown → recording → measuring → review → (next round's countdown | done)
 *
 * The screen owns the clocks and the recorder. This reducer only decides what
 * happens next. A round that heard no speech, or couldn't be measured, is
 * offered again and never stored as a zero. Leaving early keeps the rounds
 * already measured: `done` can be reached from any review.
 */

import { DRILL_ROUNDS_S, GET_READY_S, type DrillRoundResult } from '../../domain/fluency/drill432';

/** `tooShort`: under `MIN_SPEAKING_SPAN_S` of speech — too little to describe flow (the view leaves such answers out too). */
export type RoundOutcome = 'ok' | 'noSpeech' | 'tooShort' | 'unmeasured';

export type DrillPhase =
  | { kind: 'countdown'; round: number; left: number }
  | { kind: 'recording'; round: number }
  | { kind: 'measuring'; round: number }
  | { kind: 'review'; round: number; outcome: RoundOutcome }
  | { kind: 'done' };

export interface DrillState {
  phase: DrillPhase;
  /** One slot per round; null until that round is measured. */
  rounds: (DrillRoundResult | null)[];
}

export type DrillAction =
  | { type: 'tick' }
  | { type: 'skipCountdown' }
  | { type: 'stop' }
  | { type: 'measured'; outcome: RoundOutcome; result: DrillRoundResult | null }
  | { type: 'retry' }
  | { type: 'next' }
  | { type: 'finish' };

export function initialDrillState(): DrillState {
  return { phase: { kind: 'countdown', round: 0, left: GET_READY_S }, rounds: DRILL_ROUNDS_S.map(() => null) };
}

export function drillReducer(state: DrillState, action: DrillAction): DrillState {
  const { phase } = state;
  switch (action.type) {
    case 'tick':
      if (phase.kind !== 'countdown') return state;
      return phase.left <= 1
        ? { ...state, phase: { kind: 'recording', round: phase.round } }
        : { ...state, phase: { ...phase, left: phase.left - 1 } };
    case 'skipCountdown':
      return phase.kind === 'countdown' ? { ...state, phase: { kind: 'recording', round: phase.round } } : state;
    case 'stop':
      return phase.kind === 'recording' ? { ...state, phase: { kind: 'measuring', round: phase.round } } : state;
    case 'measured': {
      if (phase.kind !== 'measuring') return state;
      const rounds = [...state.rounds];
      if (action.outcome === 'ok' && action.result) rounds[phase.round] = action.result;
      return { rounds, phase: { kind: 'review', round: phase.round, outcome: action.outcome === 'ok' && !action.result ? 'unmeasured' : action.outcome } };
    }
    case 'retry':
      return phase.kind === 'review'
        ? { ...state, phase: { kind: 'countdown', round: phase.round, left: GET_READY_S } }
        : state;
    case 'next': {
      if (phase.kind !== 'review' || phase.outcome !== 'ok') return state;
      const nextRound = phase.round + 1;
      return nextRound >= DRILL_ROUNDS_S.length
        ? { ...state, phase: { kind: 'done' } }
        : { ...state, phase: { kind: 'countdown', round: nextRound, left: GET_READY_S } };
    }
    case 'finish':
      return phase.kind === 'review' ? { ...state, phase: { kind: 'done' } } : state;
  }
}

/** The measured rounds, in order (a skipped or failed round is left out, never zero). */
export function measuredRounds(state: DrillState): DrillRoundResult[] {
  return state.rounds.filter((r): r is DrillRoundResult => r !== null);
}
