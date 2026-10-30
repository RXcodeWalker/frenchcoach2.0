import { describe, expect, it } from 'vitest';
import { REBUILD_QUESTIONS } from '../../../data/rebuildQuestions';
import type { RebuildQuestion } from '../../../types';
import {
  CLEAN_BONUS_MS, MAX_ATTEMPTS, MISS_PENALTY_MS, ROUND_LENGTH, SOLVE_BONUS_MS, SPEED_CAP_MS, SPEED_START_MS,
  builtWords, check, clear, comboMultiplier, createGame, gradeAttempt, hint, leave, next, pause, pickQuestions, place,
  pointsFor, remove, resume, skip, summarise, tick, tokenKey, undo, type GameState,
} from '../engine';
import type { Setup } from '../types';

/** A tiny seeded generator so a round replays exactly. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const byId = (id: string): RebuildQuestion => {
  const q = REBUILD_QUESTIONS.find(x => x.id === id);
  if (!q) throw new Error(`no ${id}`);
  return q;
};

const CLASSIC: Setup = { mode: 'classic', level: 'mixed' };
const TRICKY: Setup = { mode: 'tricky', level: 'mixed' };
const SPEED: Setup = { mode: 'speed', level: 'mixed' };

const sr1 = byId('sr1'); // J'aime la maison rouge.
const sr9 = byId('sr9'); // S'il pleut, nous resterons à la maison. (+ an alternative order)

function start(setup: Setup, ...questions: RebuildQuestion[]): GameState {
  return createGame(setup, questions, seeded(7));
}

/** Places the words of `order` (by text) one at a time. */
function build(g: GameState, words: string[]): GameState {
  let state = g;
  for (const w of words) {
    const used = new Set(state.current.built);
    const tile = state.current.tiles.find(t => tokenKey(t.text) === tokenKey(w) && !used.has(t.id));
    if (!tile) throw new Error(`no free tile "${w}"`);
    state = place(state, tile.id);
  }
  return state;
}

const solve = (g: GameState, q: RebuildQuestion) => check(build(g, q.fragments));

describe('words', () => {
  it('compares ignoring case and trailing punctuation, but not accents', () => {
    expect(tokenKey('Hier,')).toBe('hier');
    expect(tokenKey('loto,')).toBe('loto');
    expect(tokenKey('?')).toBe('?');
    expect(tokenKey('à')).not.toBe(tokenKey('a'));
  });

  it('accepts the main order and every listed alternative', () => {
    expect(gradeAttempt(sr9.fragments, sr9).correct).toBe(true);
    expect(gradeAttempt(['nous', 'resterons', 'à', 'la', 'maison', "s'il", 'pleut'], sr9).correct).toBe(true);
  });

  it('marks each word against the order it agrees with most', () => {
    const { correct, marks } = gradeAttempt(["J'aime", 'maison', 'la', 'rouge'], sr1);
    expect(correct).toBe(false);
    expect(marks).toEqual(['right', 'wrong', 'wrong', 'right']);
  });
});

describe('points', () => {
  it('pays the base by difficulty, less for later tries and hints', () => {
    expect(pointsFor(1, 1, 0, 0)).toBe(100);
    expect(pointsFor(2, 1, 0, 0)).toBe(150);
    expect(pointsFor(3, 1, 0, 0)).toBe(200);
    expect(pointsFor(2, 2, 0, 0)).toBe(90);
    expect(pointsFor(2, 3, 0, 0)).toBe(45);
    expect(pointsFor(2, 1, 2, 0)).toBe(90);
  });

  it('never pays less than 10 for a solve, and never less than 20% for hints alone', () => {
    expect(pointsFor(1, 3, 9, 0)).toBeGreaterThanOrEqual(10);
    expect(pointsFor(2, 1, 9, 0)).toBe(30);
  });

  it('multiplies only a clean solve, after three and six in a row', () => {
    expect(comboMultiplier(2)).toBe(1);
    expect(comboMultiplier(3)).toBe(1.5);
    expect(comboMultiplier(6)).toBe(2);
    expect(pointsFor(1, 1, 0, 6)).toBe(200);
    expect(pointsFor(1, 2, 0, 6)).toBe(60);
    expect(pointsFor(1, 1, 1, 6)).toBe(80);
  });
});

describe('tiles', () => {
  it('never show the opening capital or a clause-closing comma', () => {
    const g = start(CLASSIC, sr9);
    expect(g.current.tiles.map(t => t.text).sort()).toEqual(['la', 'maison', 'nous', 'pleut', 'resterons', 'à', "s'il"].sort());
  });

  it('keeps proper nouns capitalised and lowercases decoys', () => {
    const spain = REBUILD_QUESTIONS.find(q => q.french.includes('Espagne'));
    expect(spain).toBeDefined();
    expect(createGame(CLASSIC, [spain as RebuildQuestion], seeded(1)).current.tiles.map(t => t.text)).toContain('Espagne');
    const g = createGame(TRICKY, [byId('sr24')], seeded(1));
    expect(g.current.tiles.filter(t => t.decoy).map(t => t.text).sort()).toEqual(['ce', 'magnifiques']);
  });
});

describe('building a sentence', () => {
  it('starts with every word in the bank and never hands the sentence over in order', () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = createGame(CLASSIC, [byId('sr2')], seeded(seed));
      const keys = g.current.tiles.map(t => tokenKey(t.text));
      expect([...keys].sort()).toEqual(byId('sr2').fragments.map(tokenKey).sort());
      expect(keys).not.toEqual(byId('sr2').fragments.map(tokenKey));
    }
  });

  it('adds decoys in Tricky only, and they are real extra tiles', () => {
    const classic = start(CLASSIC, sr1);
    const tricky = start(TRICKY, sr1);
    expect(classic.current.tiles).toHaveLength(sr1.fragments.length);
    expect(tricky.current.tiles).toHaveLength(sr1.fragments.length + (sr1.distractors?.length ?? 0));
    expect(tricky.current.tiles.filter(t => t.decoy).map(t => t.text).sort()).toEqual([...(sr1.distractors ?? [])].sort());
  });

  it('places, removes, undoes and clears, and stops at the sentence length', () => {
    let g = start(CLASSIC, sr1);
    const [a, b, c, d] = g.current.tiles;
    g = place(g, a.id);
    g = place(g, a.id); // already on the line
    expect(g.current.built).toEqual([a.id]);
    g = place(place(place(g, b.id), c.id), d.id);
    expect(g.current.built).toHaveLength(4);
    expect(place(g, 'nope')).toBe(g);
    g = remove(g, b.id);
    expect(g.current.built).toEqual([a.id, c.id, d.id]);
    g = undo(g);
    expect(g.current.built).toEqual([a.id, c.id]);
    g = clear(g);
    expect(g.current.built).toEqual([]);
  });

  it('will not check a short line', () => {
    const g = build(start(CLASSIC, sr1), sr1.fragments.slice(0, 3));
    expect(check(g)).toBe(g);
  });

  it('cannot place more words than the sentence has, decoys included', () => {
    let g = start(TRICKY, sr1);
    for (const t of g.current.tiles) g = place(g, t.id);
    expect(g.current.built).toHaveLength(sr1.fragments.length);
  });
});

describe('checking', () => {
  it('a first-try, no-hint solve is clean and scores the base', () => {
    const g = solve(start(CLASSIC, sr1, byId('sr2')), sr1);
    expect(g.phase).toBe('feedback');
    expect(g.current.outcome).toBe('clean');
    expect(g.score).toBe(100);
    expect(g.combo).toBe(1);
  });

  it('accepts an alternative word order', () => {
    const g = check(build(start(CLASSIC, sr9), ['nous', 'resterons', 'à', 'la', 'maison', "s'il", 'pleut']));
    expect(g.current.outcome).toBe('clean');
  });

  it('a wrong check marks the line, resets the streak and burns one try', () => {
    let g = solve(start(CLASSIC, sr1, byId('sr2'), byId('sr3')), sr1);
    g = next(g, seeded(1));
    const q = byId('sr2');
    g = check(build(g, [...q.fragments].reverse()));
    expect(g.phase).toBe('building');
    expect(g.combo).toBe(0);
    expect(g.current.attempts).toBe(1);
    expect(g.current.marks).not.toBeNull();
    expect(g.current.marks).toHaveLength(q.fragments.length);
  });

  it('cannot be checked again until a word moves, so a double tap costs nothing', () => {
    let g = check(build(start(CLASSIC, sr1), ['la', "J'aime", 'maison', 'rouge']));
    const attempts = g.current.attempts;
    expect(check(g)).toBe(g);
    expect(g.current.attempts).toBe(attempts);
    g = undo(g);
    expect(g.current.marks).toBeNull();
  });

  it('a second-try solve pays less and is not clean', () => {
    let g = check(build(start(CLASSIC, sr1), ['la', "J'aime", 'maison', 'rouge']));
    g = clear(g);
    g = solve(g, sr1);
    expect(g.current.outcome).toBe('solved');
    expect(g.current.points).toBe(60);
    expect(g.combo).toBe(0);
  });

  it('shows the answer after the last try, keeping the wrong attempt for the reveal', () => {
    let g = start(CLASSIC, sr1);
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      g = clear(g);
      g = check(build(g, ['la', "J'aime", 'maison', 'rouge']));
    }
    expect(g.phase).toBe('feedback');
    expect(g.current.outcome).toBe('revealed');
    expect(g.current.lastWrong).toEqual(['la', "j'aime", 'maison', 'rouge']);
    expect(builtWords(g.current)).toEqual(["j'aime", 'la', 'maison', 'rouge']);
    expect(g.score).toBe(0);
  });
});

describe('hints', () => {
  it('sets down the next right word and costs a hint', () => {
    const g = hint(start(CLASSIC, sr1));
    expect(builtWords(g.current)).toEqual(["j'aime"]);
    expect(g.current.hints).toBe(1);
  });

  it('keeps the right start and sends everything after the first slip back', () => {
    let g = build(start(CLASSIC, sr1), ["J'aime", 'rouge', 'la']);
    g = hint(g);
    expect(builtWords(g.current)).toEqual(["j'aime", 'la']);
  });

  it('follows the alternative order the learner has started', () => {
    let g = build(start(CLASSIC, sr9), ['nous']);
    g = hint(g);
    expect(builtWords(g.current)).toEqual(['nous', 'resterons']);
  });

  it('does nothing once the line is right, and lowers the points', () => {
    let g = start(CLASSIC, sr1);
    for (let i = 0; i < 2; i++) g = hint(g);
    g = build(g, sr1.fragments.slice(2));
    const hinted = check(g);
    expect(hinted.current.outcome).toBe('solved');
    expect(hinted.current.points).toBe(60);
  });
});

describe('moving on', () => {
  it('a missed sentence comes back once, on top of the planned length', () => {
    let g = createGame(CLASSIC, [sr1, byId('sr2')], seeded(3));
    expect(g.total).toBe(2);
    g = skip(g);
    expect(g.current.outcome).toBe('skipped');
    g = next(g, seeded(3));
    expect(g.total).toBe(3);
    expect(g.current.question.id).toBe('sr2');
    expect(g.queue.map(e => [e.question.id, e.repeat])).toEqual([['sr1', true]]);
    g = next(solve(g, byId('sr2')), seeded(3));
    expect(g.current.question.id).toBe('sr1');
    expect(g.current.repeat).toBe(true);
    // missing the repeat does not queue it a third time
    g = next(skip(g), seeded(3));
    expect(g.phase).toBe('over');
    expect(g.endedBy).toBe('finished');
    expect(g.done.map(r => r.outcome)).toEqual(['skipped', 'clean', 'skipped']);
  });

  it('ends when the queue runs out', () => {
    const g = next(solve(start(CLASSIC, sr1), sr1), seeded(1));
    expect(g.phase).toBe('over');
    expect(g.done).toHaveLength(1);
  });

  it('cannot move on before a sentence is settled', () => {
    const g = start(CLASSIC, sr1, byId('sr2'));
    expect(next(g, seeded(1))).toBe(g);
  });

  it('leaving ends the round without a finish', () => {
    expect(leave(start(CLASSIC, sr1)).endedBy).toBe('left');
  });
});

describe('Speed', () => {
  const speed = () => start(SPEED, sr1, byId('sr2'), byId('sr3'));

  it('starts with 60 seconds and no planned length', () => {
    const g = speed();
    expect(g.timeMs).toBe(SPEED_START_MS);
    expect(g.total).toBe(0);
  });

  it('runs only while a sentence is being built', () => {
    let g = tick(speed(), 4000);
    expect(g.timeMs).toBe(SPEED_START_MS - 4000);
    g = solve(g, sr1);
    const before = g.timeMs;
    expect(tick(g, 5000).timeMs).toBe(before);
    expect(tick(pause(speed()), 5000).timeMs).toBe(SPEED_START_MS);
    expect(resume(pause(speed())).phase).toBe('building');
  });

  it('pays time for a clean solve, less for a helped one, and takes time for a miss or a skip', () => {
    let g = tick(speed(), 10_000);
    const base = g.timeMs as number;
    expect(solve(g, sr1).timeMs).toBe(base + CLEAN_BONUS_MS);
    g = check(build(g, ['la', "J'aime", 'maison', 'rouge']));
    expect(g.timeMs).toBe(base - MISS_PENALTY_MS);
    g = clear(g);
    expect(solve(g, sr1).timeMs).toBe(base - MISS_PENALTY_MS + SOLVE_BONUS_MS);
    expect(skip(speed()).timeMs).toBe(SPEED_START_MS - MISS_PENALTY_MS);
  });

  it('never goes above the cap', () => {
    const ids = ['sr1', 'sr2', 'sr3', 'sr4', 'sr5', 'sr6'];
    let g = createGame(SPEED, ids.map(byId), seeded(1));
    for (const id of ids) {
      g = solve(g, byId(id));
      expect(g.timeMs).toBeLessThanOrEqual(SPEED_CAP_MS);
      g = next(g, seeded(1));
    }
    // 60s + six clean solves would be 96s: the cap holds it at 90.
    expect(g.timeMs).toBe(SPEED_CAP_MS);
  });

  it('has no try limit and brings nothing back', () => {
    let g = speed();
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) {
      g = clear(g);
      g = check(build(g, ['la', "J'aime", 'maison', 'rouge']));
    }
    expect(g.phase).toBe('building');
    g = skip(clear(g));
    g = next(g, seeded(1));
    expect(g.queue.every(e => !e.repeat)).toBe(true);
  });

  it('ends the round when the clock runs out, mid-sentence, without counting it', () => {
    const g = tick(speed(), SPEED_START_MS + 1);
    expect(g.phase).toBe('over');
    expect(g.endedBy).toBe('clock');
    expect(g.timeMs).toBe(0);
    expect(g.done).toHaveLength(0);
  });

  it('a wrong check at 2 seconds can end the round', () => {
    const g = check(build(tick(speed(), SPEED_START_MS - 2000), ['la', "J'aime", 'maison', 'rouge']));
    expect(g.endedBy).toBe('clock');
  });
});

describe('choosing sentences', () => {
  const none = {};

  it('plays a round of eight, from the chosen level', () => {
    const q = pickQuestions(REBUILD_QUESTIONS, { mode: 'classic', level: 'starter' }, none, seeded(5));
    expect(q).toHaveLength(ROUND_LENGTH);
    expect(q.every(x => x.difficulty === 1)).toBe(true);
    expect(new Set(q.map(x => x.id)).size).toBe(ROUND_LENGTH);
  });

  it('Mixed is a 3-3-2 spread played easiest first', () => {
    const q = pickQuestions(REBUILD_QUESTIONS, CLASSIC, none, seeded(5));
    expect(q.map(x => x.difficulty)).toEqual([1, 1, 1, 2, 2, 2, 3, 3]);
  });

  it('puts sentences the learner has not mastered first', () => {
    const level1 = REBUILD_QUESTIONS.filter(x => x.difficulty === 1);
    const mastered = Object.fromEntries(level1.slice(0, level1.length - ROUND_LENGTH).map(x => [x.id, 2]));
    const q = pickQuestions(REBUILD_QUESTIONS, { mode: 'classic', level: 'starter' }, mastered, seeded(9));
    expect(q.every(x => (mastered as Record<string, number>)[x.id] === undefined)).toBe(true);
  });

  it('Speed plays the whole pool, and a drill only the sentences named', () => {
    expect(pickQuestions(REBUILD_QUESTIONS, SPEED, none, seeded(1))).toHaveLength(REBUILD_QUESTIONS.length);
    const drill = pickQuestions(REBUILD_QUESTIONS, CLASSIC, none, seeded(1), ['sr1', 'sr9']);
    expect(drill.map(x => x.id).sort()).toEqual(['sr1', 'sr9']);
  });

  it('is repeatable with the same seed', () => {
    const a = pickQuestions(REBUILD_QUESTIONS, CLASSIC, none, seeded(11)).map(x => x.id);
    const b = pickQuestions(REBUILD_QUESTIONS, CLASSIC, none, seeded(11)).map(x => x.id);
    expect(a).toEqual(b);
  });
});

describe('summarising a round', () => {
  it('counts first-try solves, hints, and what is still missed', () => {
    const [a, b, c] = [sr1, byId('sr2'), byId('sr3')];
    let g = createGame(CLASSIC, [a, b, c], seeded(2));
    g = next(solve(g, a), seeded(2)); // clean
    g = hint(g);
    g = next(solve(clear(g), b), seeded(2)); // solved with a hint
    g = next(skip(g), seeded(2)); // c skipped
    g = next(skip(g), seeded(2)); // c's second go skipped too
    const s = summarise(g);
    expect(s.solved).toBe(2);
    expect(s.clean).toBe(1);
    expect(s.hints).toBe(1);
    expect(s.missedIds).toEqual([c.id]);
    expect(s.masteredIds).toEqual([a.id]);
    expect(s.accuracy).toBe(33);
  });

  it('a missed sentence put right on its second go is not missed, and does not count towards mastery', () => {
    let g = createGame(CLASSIC, [sr1], seeded(2));
    g = next(skip(g), seeded(2));
    g = next(solve(g, sr1), seeded(2));
    const s = summarise(g);
    expect(s.missedIds).toEqual([]);
    expect(s.solved).toBe(1);
    expect(s.masteredIds).toEqual([]);
  });
});
