import { describe, expect, it } from 'vitest';
import type { MatchResult } from '../matchAnswer';
import {
  MAX_NONE_PER_TURN,
  MAX_SILENT_REPEATS,
  answerEtToi,
  answerQuestion,
  answerWarmup,
  modelsBeforeListening,
  silentEtToi,
  silentQuestion,
  startEtToiTurn,
  startQuestionTurn,
  startWarmupTurn,
  withLevelUp,
  type QuestionTurnState,
  type TurnResponse,
} from '../turnFlow';
import type { MatchOutcome } from '../types';

const m = (outcome: MatchOutcome): MatchResult => ({
  outcome,
  frames: [{ outcome, heard: outcome === 'none' ? [] : ["j'aime"], missing: outcome === 'got' ? [] : ['bleu'], slotOptionId: null }],
  heard: outcome === 'none' ? [] : ["j'aime"],
});

/** Plays a question turn through a sequence of match outcomes, stopping when Léo moves on. */
function play(outcomes: MatchOutcome[]): { state: QuestionTurnState; responses: TurnResponse[]; asks: number } {
  let state = startQuestionTurn();
  const responses: TurnResponse[] = [];
  let asks = 0;
  for (const o of outcomes) {
    asks++;
    const step = answerQuestion(state, m(o));
    state = step.state;
    responses.push(step.response);
    if (step.response.next === 'moveOn') break;
  }
  return { state, responses, asks };
}

describe('question turn', () => {
  it('got → celebrate, praise, move on', () => {
    const { state, responses } = play(['got']);
    expect(state.outcome).toBe('got');
    expect(responses).toEqual([{ leo: 'celebrating', line: 'praise', playModel: false, next: 'moveOn' }]);
  });

  it('almost → Léo says the sentence once, the kid repeats once, move on; recorded as almost', () => {
    for (const repeat of ['got', 'almost', 'none'] as const) {
      const { state, responses, asks } = play(['almost', repeat, 'got']);
      expect(asks).toBe(2);
      expect(responses[0]).toEqual({ leo: 'happy', line: null, playModel: true, next: 'listen' });
      expect(responses[1].next).toBe('moveOn');
      expect(responses[1].playModel).toBe(false);
      expect(state.outcome).toBe('almost');
      expect(state.attempts).toEqual(['almost', repeat]);
    }
  });

  it('a perfect repeat is celebrated but never upgrades the turn', () => {
    const { state, responses } = play(['almost', 'got']);
    expect(responses[1].leo).toBe('celebrating');
    expect(state.outcome).toBe('almost');
    expect(state.decisive?.outcome).toBe('almost');
  });

  it('none → curious, one more go', () => {
    const { state, responses } = play(['none']);
    expect(responses[0]).toEqual({ leo: 'curious', line: 'encore', playModel: false, next: 'listen' });
    expect(state.phase).toBe('retry');
    expect(state.outcome).toBeNull();
  });

  it('none then got → recorded as got', () => {
    const { state } = play(['none', 'got']);
    expect(state.outcome).toBe('got');
  });

  it('none then almost → the almost path (model, one repeat)', () => {
    const { state, responses, asks } = play(['none', 'almost', 'none']);
    expect(asks).toBe(3);
    expect(responses[1].playModel).toBe(true);
    expect(state.outcome).toBe('almost');
  });

  it(`after ${MAX_NONE_PER_TURN} "none" results there is never a third ask; the turn stays "none"`, () => {
    const { state, responses, asks } = play(['none', 'none', 'got', 'got']);
    expect(asks).toBe(2);
    expect(responses[1]).toEqual({ leo: 'happy', line: 'together', playModel: true, next: 'moveOn' });
    expect(state.outcome).toBe('none');
    expect(state.together).toBe(true);
    expect(state.phase).toBe('done');
  });

  it('ignores an attempt after the turn is done (no re-ask, no upgrade)', () => {
    const { state } = play(['none', 'none']);
    const after = answerQuestion(state, m('got'));
    expect(after.state.outcome).toBe('none');
    expect(after.state.attempts).toEqual(['none', 'none']);
    expect(after.response.next).toBe('moveOn');
  });

  it('Echo models the chosen sentence before listening; Frame and Free do not', () => {
    expect(modelsBeforeListening('echo')).toBe(true);
    expect(modelsBeforeListening('frame')).toBe(false);
    expect(modelsBeforeListening('free')).toBe(false);
  });
});

describe('warm-up turn: always accepted', () => {
  it('done on the first answer, with the chosen recogniser', () => {
    for (const d of ['webSpeech', 'whisper'] as const) {
      const step = answerWarmup(startWarmupTurn(), d);
      expect(step.state).toMatchObject({ phase: 'done', outcome: 'complete', recogniser: d });
      expect(step.response).toEqual({ leo: 'happy', line: 'warmupAwake', playModel: false, next: 'moveOn' });
    }
  });

  it('checkMic gives one more try, and the second try is accepted whatever happens', () => {
    const first = answerWarmup(startWarmupTurn(), 'checkMic');
    expect(first.response).toEqual({ leo: 'thinking', line: 'checkMic', playModel: false, next: 'listen' });
    const second = answerWarmup(first.state, 'checkMic');
    expect(second.state).toMatchObject({ phase: 'done', outcome: 'complete', recogniser: 'webSpeech' });
    expect(second.response.next).toBe('moveOn');
  });
});

describe('« Et toi ? » turn: always complete', () => {
  it('completes with Léo\'s funny reply, whatever was heard', () => {
    const step = answerEtToi(startEtToiTurn());
    expect(step.state.outcome).toBe('complete');
    expect(step.response).toEqual({ leo: 'happy', line: 'etToiReply', playModel: false, next: 'moveOn' });
  });
});

describe('withLevelUp', () => {
  it('replaces the line (still at most one) when the kid moved up', () => {
    const r = play(['got']).responses[0];
    expect(withLevelUp(r, true)).toEqual({ ...r, leo: 'celebrating', line: 'levelUp' });
  });
  it('changes nothing without a level-up (moving down is silent)', () => {
    const r = play(['none', 'none']).responses[1];
    expect(withLevelUp(r, false)).toBe(r);
  });
});

describe('silence (no audio detected): the kid is asked again', () => {
  it('a silent try is re-asked and not recorded as an attempt', () => {
    const step = silentQuestion(startQuestionTurn());
    expect(step.response).toEqual({ leo: 'listening', line: 'encore', playModel: false, next: 'listen' });
    expect(step.state.attempts).toEqual([]);
    expect(step.state.phase).toBe('answer');
    expect(step.state.silences).toBe(1);
  });

  it('later silent tries show the mic hint', () => {
    let state = startQuestionTurn();
    const lines = [];
    for (let i = 0; i < MAX_SILENT_REPEATS; i++) {
      const step = silentQuestion(state);
      state = step.state;
      lines.push(step.response.line);
    }
    expect(lines).toEqual(['encore', ...Array(MAX_SILENT_REPEATS - 1).fill('checkMic')]);
  });

  it('silences never count toward the two-"none" rule', () => {
    let state = startQuestionTurn();
    state = answerQuestion(state, m('none')).state;
    state = silentQuestion(state).state;
    state = silentQuestion(state).state;
    expect(state.phase).toBe('retry');
    expect(state.outcome).toBeNull();
    const after = answerQuestion(state, m('got'));
    expect(after.state.outcome).toBe('got');
    expect(after.state.attempts).toEqual(['none', 'got']);
    expect(after.state.silences).toBe(0);
  });

  it('a heard try resets the silence count', () => {
    let state = startQuestionTurn();
    for (let i = 0; i < MAX_SILENT_REPEATS; i++) state = silentQuestion(state).state;
    state = answerQuestion(state, m('none')).state;
    expect(state.silences).toBe(0);
    expect(silentQuestion(state).response.next).toBe('listen');
  });

  it(`after ${MAX_SILENT_REPEATS} silent tries in a row, a silence is an ordinary "none", so the mission cannot stall`, () => {
    let state = startQuestionTurn();
    let asks = 0;
    let last: TurnResponse | null = null;
    while (state.phase !== 'done') {
      const step = silentQuestion(state);
      state = step.state;
      last = step.response;
      asks++;
      expect(asks).toBeLessThan(20);
    }
    expect(state.outcome).toBe('none');
    expect(state.together).toBe(true);
    expect(state.attempts).toEqual(['none', 'none']);
    expect(last).toEqual({ leo: 'happy', line: 'together', playModel: true, next: 'moveOn' });
    expect(asks).toBe(2 * (MAX_SILENT_REPEATS + 1));
  });

  it('silence during the repeat after "almost" is re-asked, and the turn still ends "almost"', () => {
    let state = answerQuestion(startQuestionTurn(), m('almost')).state;
    const step = silentQuestion(state);
    expect(step.response.next).toBe('listen');
    state = step.state;
    while (state.phase !== 'done') state = silentQuestion(state).state;
    expect(state.outcome).toBe('almost');
  });

  it('« Et toi ? » re-asks on silence, then completes', () => {
    let state = startEtToiTurn();
    const first = silentEtToi(state);
    expect(first.response.next).toBe('listen');
    expect(first.state.outcome).toBeNull();
    state = first.state;
    let guard = 0;
    while (state.phase !== 'done' && guard++ < 10) state = silentEtToi(state).state;
    expect(state.outcome).toBe('complete');
    expect(answerEtToi(silentEtToi(startEtToiTurn()).state).state.outcome).toBe('complete');
  });
});
