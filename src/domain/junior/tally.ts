/**
 * The local playtest tally (junior-track §10, "Playtest gate"): per device,
 * how many question turns ended got / almost / none, plus how many silent tries
 * (no audio detected) there were. Silent tries are counted separately so the
 * gate can tell a recogniser problem (high `none`) from a child who froze or a
 * mic that heard nothing (high `silent`). Silent tries are never folded into
 * `none`; a turn whose silences ran past the cap still counts its own `none`
 * outcome once, as recorded by turnFlow.ts.
 *
 * Pure. Batch 3 stores it through the reducer (`outcomeTally`); it never
 * reaches analytics, rewards or the Postcard.
 */
import type { EtToiTurnState, QuestionTurnState } from './turnFlow';

export interface OutcomeTally {
  got: number;
  almost: number;
  none: number;
  /** Silent tries across question and « Et toi ? » turns. Not turns: one turn can have several. */
  silent: number;
}

export const EMPTY_TALLY: OutcomeTally = { got: 0, almost: 0, none: 0, silent: 0 };

/** Folds one finished turn into the tally. A turn that isn't done adds nothing. */
export function addTurnToTally(tally: OutcomeTally, turn: QuestionTurnState | EtToiTurnState): OutcomeTally {
  if (turn.phase !== 'done') return tally;
  const next = { ...tally, silent: tally.silent + turn.silentTries };
  if (turn.kind === 'question' && turn.outcome) next[turn.outcome] += 1;
  return next;
}

/** Shares of question turns plus the silent tries per question turn, for the playtest gate readout. */
export function tallyRates(t: OutcomeTally): { none: number; almost: number; silentPerTurn: number } | null {
  const turns = t.got + t.almost + t.none;
  if (turns === 0) return null;
  return { none: t.none / turns, almost: t.almost / turns, silentPerTurn: t.silent / turns };
}
