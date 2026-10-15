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

/** The playtest gate thresholds, fixed before the playtest (junior-track "Playtest gate"). Changing one is a spec change. */
export const GATE_THRESHOLDS = { none: 0.25, almost: 0.4, silentPerTurn: 1 } as const;

export interface GateReadout {
  turns: number;
  rates: { none: number; almost: number; silentPerTurn: number };
  /** Which documented thresholds this device's play breached; empty means none did (the babyish check is a human one). */
  breaches: ('none' | 'almost' | 'silentPerTurn')[];
}

/** Turns the stored counts into the playtest read-out; null until one question turn has been played. */
export function gateReadout(counts: { got: number; almost: number; none: number }, silentTries: number): GateReadout | null {
  const tally: OutcomeTally = { ...counts, silent: silentTries };
  const rates = tallyRates(tally);
  if (!rates) return null;
  const breaches = (Object.keys(GATE_THRESHOLDS) as (keyof typeof GATE_THRESHOLDS)[]).filter((k) => rates[k] > GATE_THRESHOLDS[k]);
  return { turns: counts.got + counts.almost + counts.none, rates, breaches };
}
