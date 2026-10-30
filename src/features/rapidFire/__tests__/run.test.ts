import { describe, expect, it } from 'vitest';
import {
  BASE_POINTS,
  BONUS_SECONDS,
  MAX_SECONDS,
  RUN_SECONDS,
  START_HEARTS,
  TIME_PENALTY,
  createRun,
  levelFor,
  missedWords,
  multiplierFor,
  runReducer,
  summarise,
  type RunAction,
  type RunState,
} from '../run';
import type { RapidFireWord, WordLevel } from '../wordBank';

const identity = () => 0;
const word = (n: number, level: WordLevel = 1): RapidFireWord => ({
  id: `w${n}`,
  prompt: `word ${n}`,
  answers: [`mot${n}`],
  level,
});
const easy = Array.from({ length: 30 }, (_, i) => word(i, 1));
const mixed = [
  ...Array.from({ length: 10 }, (_, i) => word(100 + i, 1)),
  ...Array.from({ length: 10 }, (_, i) => word(200 + i, 2)),
  ...Array.from({ length: 10 }, (_, i) => word(300 + i, 3)),
];

function run(state: RunState, ...actions: RunAction[]): RunState {
  return actions.reduce(runReducer, state);
}
const right = (s: RunState): RunAction => ({ type: 'answer', input: s.current.answers[0] });
const next: RunAction = { type: 'advance' };

/** Answers the current word correctly and moves on, `n` times. */
function correctly(state: RunState, n: number): RunState {
  let s = state;
  for (let i = 0; i < n; i++) s = run(s, right(s), next);
  return s;
}

describe('createRun', () => {
  it('starts with a full clock and full hearts', () => {
    const s = createRun(easy, 'sprint', identity);
    expect(s).toMatchObject({ phase: 'playing', timeLeft: RUN_SECONDS, hearts: START_HEARTS, score: 0, streak: 0, paused: false });
    expect(s.current.level).toBe(1);
  });

  it('refuses an empty set', () => {
    expect(() => createRun([], 'sprint', identity)).toThrow();
  });
});

describe('scoring', () => {
  it('scores base points, then multiplies by the combo', () => {
    let s = createRun(easy, 'sprint', identity);
    const gains: number[] = [];
    for (let i = 0; i < 10; i++) {
      const before = s.score;
      s = run(s, right(s));
      gains.push(s.score - before);
      s = run(s, next);
    }
    expect(gains).toEqual([10, 10, 15, 15, 20, 20, 20, 20, 20, 30]);
    expect(multiplierFor(20)).toBe(5);
    expect(BASE_POINTS).toBe(10);
  });

  it('adds time every fifth in a row and a heart every tenth, if one was lost', () => {
    let s = createRun(easy, 'sprint', identity);
    s = correctly(s, 4);
    expect(s.timeLeft).toBe(RUN_SECONDS);
    s = run(s, right(s));
    expect(s.feedback).toMatchObject({ timeDelta: BONUS_SECONDS, streak: 5 });
    expect(s.timeLeft).toBe(RUN_SECONDS + BONUS_SECONDS);

    let t = createRun(easy, 'sprint', identity);
    t = run(t, { type: 'answer', input: 'zzzzzzzz' }, next);
    expect(t.hearts).toBe(START_HEARTS - 1);
    t = correctly(t, 9);
    t = run(t, right(t));
    expect(t.feedback?.heartBack).toBe(true);
    expect(t.hearts).toBe(START_HEARTS);
  });

  it('does not give a heart beyond the maximum', () => {
    let s = correctly(createRun(easy, 'sprint', identity), 9);
    s = run(s, right(s));
    expect(s.feedback?.heartBack).toBe(false);
    expect(s.hearts).toBe(START_HEARTS);
  });

  it('caps banked time', () => {
    let s = { ...createRun(easy, 'sprint', identity), timeLeft: MAX_SECONDS - 1 };
    s = correctly(s, 5);
    expect(s.timeLeft).toBe(MAX_SECONDS);
  });
});

describe('misses', () => {
  it('a wrong answer costs a heart, time and the streak', () => {
    let s = correctly(createRun(easy, 'sprint', identity), 3);
    s = run(s, { type: 'answer', input: 'faux' });
    expect(s).toMatchObject({ hearts: START_HEARTS - 1, timeLeft: RUN_SECONDS - TIME_PENALTY, streak: 0, maxStreak: 3, wrong: 1 });
    expect(s.feedback).toMatchObject({ kind: 'wrong', timeDelta: -TIME_PENALTY, expected: s.current.answers[0] });
  });

  it('an almost-right answer is free: no points, no penalty, the streak holds', () => {
    let s = correctly(createRun([{ ...word(1), answers: ['pomme'] }, ...easy], 'sprint', identity), 0);
    s = { ...s, current: { ...word(1), answers: ['pomme'] }, streak: 2 };
    const before = s;
    s = run(s, { type: 'answer', input: 'pome' });
    expect(s.feedback?.kind).toBe('almost');
    expect(s).toMatchObject({ score: before.score, hearts: before.hearts, timeLeft: before.timeLeft, streak: 2, almost: 1 });
  });

  it('a skip costs time and the streak but not a heart', () => {
    let s = correctly(createRun(easy, 'sprint', identity), 2);
    s = run(s, { type: 'skip' });
    expect(s).toMatchObject({ hearts: START_HEARTS, timeLeft: RUN_SECONDS - TIME_PENALTY, streak: 0, skipped: 1 });
    expect(s.feedback).toMatchObject({ kind: 'skipped', typed: '' });
  });

  it('ends the run, after the correction, when the last heart goes', () => {
    let s = createRun(easy, 'sprint', identity);
    for (let i = 0; i < START_HEARTS - 1; i++) s = run(s, { type: 'answer', input: 'faux' }, next);
    s = run(s, { type: 'answer', input: 'faux' });
    expect(s.phase).toBe('playing');
    expect(s.feedback?.kind).toBe('wrong');
    s = run(s, next);
    expect(s).toMatchObject({ phase: 'done', endReason: 'hearts' });
  });

  it('cannot go below zero seconds on a penalty', () => {
    const s = run({ ...createRun(easy, 'sprint', identity), timeLeft: 1 }, { type: 'skip' });
    expect(s.timeLeft).toBe(0);
    expect(s.feedback?.timeDelta).toBe(-1);
    expect(run(s, next)).toMatchObject({ phase: 'done', endReason: 'time' });
  });

  it('ignores an empty answer', () => {
    const s = createRun(easy, 'sprint', identity);
    expect(run(s, { type: 'answer', input: '   ' })).toBe(s);
  });
});

describe('the clock', () => {
  it('counts down and ends at zero', () => {
    let s = createRun(easy, 'sprint', identity);
    s = run(s, { type: 'tick' });
    expect(s.timeLeft).toBe(RUN_SECONDS - 1);
    for (let i = 0; i < RUN_SECONDS; i++) s = run(s, { type: 'tick' });
    expect(s).toMatchObject({ phase: 'done', endReason: 'time', timeLeft: 0 });
  });

  it('stands still while a correction is showing or the run is paused', () => {
    let s = run(createRun(easy, 'sprint', identity), right(createRun(easy, 'sprint', identity)));
    expect(run(s, { type: 'tick' }).timeLeft).toBe(s.timeLeft);

    s = run(createRun(easy, 'sprint', identity), { type: 'pause' });
    expect(run(s, { type: 'tick' }).timeLeft).toBe(RUN_SECONDS);
    expect(run(s, { type: 'answer', input: 'mot0' })).toBe(s);
    expect(run(s, { type: 'resume' }).paused).toBe(false);
    expect(run(run(s, { type: 'resume' }), { type: 'tick' }).timeLeft).toBe(RUN_SECONDS - 1);
  });

  it('can be abandoned', () => {
    expect(run(createRun(easy, 'sprint', identity), { type: 'quit' })).toMatchObject({ phase: 'done', endReason: 'quit' });
  });

  it('ignores everything once done', () => {
    const done = run(createRun(easy, 'sprint', identity), { type: 'quit' });
    expect(run(done, { type: 'tick' }, { type: 'skip' }, next)).toBe(done);
  });
});

describe('the deck', () => {
  it('eases up through the levels as correct answers build', () => {
    expect([levelFor(0), levelFor(5), levelFor(6), levelFor(13), levelFor(14), levelFor(40)]).toEqual([1, 1, 2, 2, 3, 3]);
    let s = createRun(mixed, 'sprint', identity);
    const seen: WordLevel[] = [s.current.level];
    for (let i = 0; i < 16; i++) {
      s = correctly(s, 1);
      seen.push(s.current.level);
    }
    expect(seen.slice(0, 6)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(seen[6]).toBe(2);
    expect(seen[14]).toBe(3);
  });

  it('does not repeat a word until the set is spent, then starts over', () => {
    let s = createRun(easy, 'sprint', identity);
    const ids = [s.current.id];
    for (let i = 0; i < easy.length - 1; i++) {
      s = run(s, { type: 'skip' }, next);
      ids.push(s.current.id);
    }
    expect(new Set(ids).size).toBe(easy.length);
    s = run(s, { type: 'skip' }, next);
    expect(ids).toContain(s.current.id);
  });

  it('falls back to a neighbouring level when one runs out', () => {
    const onlyHigh = [word(1, 3), word(2, 3), word(3, 2)];
    const s = createRun(onlyHigh, 'sprint', identity);
    expect([2, 3]).toContain(s.current.level);
  });

  it('shuffles with the rng it is given', () => {
    const seq = [0.9, 0.1, 0.5, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6, 0.05];
    let i = 0;
    const rng = () => seq[i++ % seq.length];
    const a = createRun(easy, 'sprint', rng).current.id;
    const b = createRun(easy, 'sprint', identity).current.id;
    expect(a).not.toBe(b);
  });
});

describe('drill', () => {
  const missed = [word(1), word(2), word(3)];

  it('clears when every word has been got right once', () => {
    let s = createRun(missed, 'drill', identity);
    s = correctly(s, 2);
    expect(s.phase).toBe('playing');
    s = run(s, right(s), next);
    expect(s).toMatchObject({ phase: 'done', endReason: 'cleared' });
  });

  it('puts a missed word back at the end of the line', () => {
    let s = createRun(missed, 'drill', identity);
    const first = s.current.id;
    s = run(s, { type: 'answer', input: 'faux' }, next);
    const second = s.current.id;
    expect(second).not.toBe(first);
    s = correctly(s, 1);
    const third = s.current.id;
    expect([first, second]).not.toContain(third);
    s = correctly(s, 1);
    expect(s.current.id).toBe(first);
  });
});

describe('summary', () => {
  it('reports counts, accuracy and a rank', () => {
    let s = correctly(createRun(easy, 'sprint', identity), 8);
    s = run(s, { type: 'answer', input: 'faux' }, next, { type: 'quit' });
    const sum = summarise(s);
    expect(sum).toMatchObject({ mode: 'sprint', endReason: 'quit', correct: 8, wrong: 1, total: 9, accuracy: 89, maxStreak: 8 });
    expect(['S', 'A', 'B', 'C', 'D']).toContain(sum.rank);
    expect(sum.log).toHaveLength(9);
  });

  it('lists each missed word once, ignoring correct answers', () => {
    let s = createRun(easy, 'sprint', identity);
    const firstId = s.current.id;
    s = run(s, { type: 'answer', input: 'faux' }, next, right(s));
    s = run(s, { type: 'skip' }, next);
    const missed = missedWords(s.log);
    expect(missed.map(w => w.id)).toContain(firstId);
    expect(new Set(missed.map(w => w.id)).size).toBe(missed.length);
    expect(missed.length).toBe(2);
  });
});
