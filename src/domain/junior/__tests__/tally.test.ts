import { describe, expect, it } from 'vitest';
import { EMPTY_TALLY, addTurnToTally, tallyRates } from '../tally';
import { MAX_SILENT_REPEATS, answerEtToi, answerQuestion, silentEtToi, silentQuestion, startEtToiTurn, startQuestionTurn } from '../turnFlow';
import type { MatchOutcome } from '../types';

const m = (outcome: MatchOutcome) => ({ outcome, frames: [], heard: [] });

describe('playtest tally: silent tries counted separately', () => {
  it('counts silent tries apart from the outcome', () => {
    let q = startQuestionTurn();
    q = silentQuestion(q).state;
    q = silentQuestion(q).state;
    q = answerQuestion(q, m('got')).state;
    expect(addTurnToTally(EMPTY_TALLY, q)).toEqual({ got: 1, almost: 0, none: 0, silent: 2 });
  });

  it('silences never become "none" in the tally, even across the reset by a heard try', () => {
    let q = startQuestionTurn();
    q = silentQuestion(q).state;
    q = answerQuestion(q, m('none')).state;
    q = silentQuestion(q).state;
    q = answerQuestion(q, m('almost')).state;
    q = answerQuestion(q, m('got')).state;
    expect(addTurnToTally(EMPTY_TALLY, q)).toEqual({ got: 0, almost: 1, none: 0, silent: 2 });
  });

  it('a fully silent turn: every silent try is counted, plus its one honest "none"', () => {
    let q = startQuestionTurn();
    while (q.phase !== 'done') q = silentQuestion(q).state;
    expect(addTurnToTally(EMPTY_TALLY, q)).toEqual({ got: 0, almost: 0, none: 1, silent: 2 * (MAX_SILENT_REPEATS + 1) });
  });

  it('« Et toi ? » adds its silent tries but no outcome', () => {
    const e = answerEtToi(silentEtToi(startEtToiTurn()).state).state;
    expect(addTurnToTally(EMPTY_TALLY, e)).toEqual({ ...EMPTY_TALLY, silent: 1 });
  });

  it('an unfinished turn adds nothing', () => {
    expect(addTurnToTally(EMPTY_TALLY, silentQuestion(startQuestionTurn()).state)).toBe(EMPTY_TALLY);
  });

  it('rates are per question turn', () => {
    expect(tallyRates(EMPTY_TALLY)).toBeNull();
    expect(tallyRates({ got: 2, almost: 1, none: 1, silent: 6 })).toEqual({ none: 0.25, almost: 0.25, silentPerTurn: 1.5 });
  });
});
