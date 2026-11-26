import { describe, expect, it } from 'vitest';
import { DICTEE_ITEMS, itemsFor, type DicteeItem } from '../../../data/dictee';
import {
  BASE_POINTS, EAR_BONUS, EAR_PLAYS, MIN_SLIPS_ROUND, ROUND_SIZE, canPlay, createGame, currentItem, giveUp, next, pickRound,
  poolFor, recordPlay, seededRandom, settleSetup, showMeaning, starsFor, streakBonus, submit, summarise, type GameState, type Setup,
} from '../engine';

const setup: Setup = { format: 'words', level: 'A1', focus: 'any' };
const word = (fr: string, id = fr): DicteeItem => ({ id, format: 'words', level: 'A1', topicKey: 'home', fr, en: fr });
const three = [word('le chat'), word('la maison'), word('le frère')];

/** Plays one line: hears it `plays` times, then types `typed`. */
function answer(g: GameState, typed: string, plays = 1): GameState {
  let s = g;
  for (let i = 0; i < plays; i++) s = recordPlay(s);
  return next(submit(s, typed));
}

describe('seeded rounds', () => {
  it('is repeatable for a seed, and different for another', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seededRandom(8)()).not.toBe(seededRandom(7)());
  });

  it('picks a full round of distinct lines, short to long', () => {
    const pool = itemsFor('words', 'A2');
    const round = pickRound(pool, 'words', seededRandom(1));
    expect(round).toHaveLength(ROUND_SIZE.words);
    expect(new Set(round.map(i => i.id)).size).toBe(round.length);
    expect(round.map(i => i.fr.length)).toEqual([...round.map(i => i.fr.length)].sort((a, b) => a - b));
  });

  it('keeps lines heard lately out of the next round when it can', () => {
    const pool = itemsFor('sentences', 'A1');
    const first = pickRound(pool, 'sentences', seededRandom(3));
    const second = pickRound(pool, 'sentences', seededRandom(4), new Set(first.map(i => i.id)));
    expect(second.some(i => first.some(f => f.id === i.id))).toBe(false);
  });

  it('uses lines heard lately rather than run short', () => {
    const pool = itemsFor('words', 'A1').slice(0, 12);
    const round = pickRound(pool, 'words', seededRandom(2), new Set(pool.slice(0, 6).map(i => i.id)));
    expect(round).toHaveLength(ROUND_SIZE.words);
  });

  it('plays a smaller pool whole', () => {
    expect(pickRound(three, 'words', seededRandom(1))).toHaveLength(3);
  });
});

describe('what a setup can draw from', () => {
  it('filters by format and level', () => {
    const pool = poolFor({ format: 'sentences', level: 'B1', focus: 'any' }, new Set());
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every(i => i.format === 'sentences' && i.level === 'B1')).toBe(true);
  });

  it('Sound-alikes keeps only lines that test one', () => {
    const pool = poolFor({ format: 'sentences', level: 'A2', focus: 'sound-alikes' }, new Set());
    expect(pool.length).toBeGreaterThanOrEqual(ROUND_SIZE.sentences);
    expect(pool.every(i => (i.traps?.length ?? 0) > 0)).toBe(true);
  });

  it('My slips draws the listed lines from every level, in the chosen format only', () => {
    const slips = new Set(['w-a1-01', 'w-b1-02', 's-a1-01']);
    const pool = poolFor({ format: 'words', level: 'A2', focus: 'slips' }, slips);
    expect(pool.map(i => i.id).sort()).toEqual(['w-a1-01', 'w-b1-02']);
  });

  it('needs a full round, or three slips', () => {
    expect(canPlay(setup, itemsFor('words', 'A1'))).toBe(true);
    expect(canPlay(setup, three.slice(0, 2))).toBe(false);
    expect(canPlay({ ...setup, focus: 'slips' }, three.slice(0, MIN_SLIPS_ROUND))).toBe(true);
    expect(canPlay({ ...setup, focus: 'slips' }, three.slice(0, MIN_SLIPS_ROUND - 1))).toBe(false);
  });
});

describe('a remembered setup', () => {
  const slipsSetup: Setup = { format: 'words', level: 'A1', focus: 'slips' };

  it('falls back to Anything when My slips has too few lines left', () => {
    expect(settleSetup(slipsSetup, new Set(['w-a1-01', 'w-a1-02']))).toEqual({ ...slipsSetup, focus: 'any' });
    expect(settleSetup(slipsSetup, new Set())).toEqual({ ...slipsSetup, focus: 'any' });
  });

  it('keeps My slips while there are enough, and every other focus as it is', () => {
    expect(settleSetup(slipsSetup, new Set(['w-a1-01', 'w-a1-02', 'w-b1-03']))).toBe(slipsSetup);
    const sound: Setup = { format: 'sentences', level: 'A2', focus: 'sound-alikes' };
    expect(settleSetup(sound, new Set())).toBe(sound);
  });
});

describe('scoring an answer', () => {
  it('a perfect answer on a quick ear earns the base, the sharp-ear bonus and a streak of one', () => {
    const g = submit(recordPlay(createGame(setup, three)), 'le chat');
    const a = g.attempts[0];
    expect(a.verdict.perfect).toBe(true);
    expect(a.ear).toBe(true);
    expect(a.points).toBe(BASE_POINTS + EAR_BONUS);
    expect(g.score).toBe(BASE_POINTS + EAR_BONUS);
    expect(g.streak).toBe(1);
    expect(g.phase).toBe('feedback');
  });

  it('no sharp-ear bonus after too many listens, or after looking at the meaning', () => {
    const many = submit([...Array(EAR_PLAYS.words + 1)].reduce<GameState>(s => recordPlay(s), createGame(setup, three)), 'le chat');
    expect(many.attempts[0]).toMatchObject({ ear: false, points: BASE_POINTS });
    const peeked = submit(showMeaning(recordPlay(createGame(setup, three))), 'le chat');
    expect(peeked.attempts[0]).toMatchObject({ ear: false, usedMeaning: true, points: BASE_POINTS });
  });

  it('sentences allow one more listen than words for the bonus', () => {
    expect(EAR_PLAYS.sentences).toBeGreaterThan(EAR_PLAYS.words);
  });

  it('pays partial credit for a missing accent and breaks the streak', () => {
    const g = submit(recordPlay(createGame(setup, [word('le frère')])), 'le frere');
    expect(g.attempts[0].verdict.credit).toBe(0.75);
    expect(g.attempts[0].points).toBe(75);
    expect(g.attempts[0].ear).toBe(false);
    expect(g.streak).toBe(0);
  });

  it('a wrong answer is worth nothing', () => {
    expect(submit(createGame(setup, three), 'la table').attempts[0].points).toBe(0);
  });

  it('grows a streak bonus from the third perfect answer in a row, capped', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 9].map(streakBonus)).toEqual([0, 0, 0, 10, 20, 30, 40, 50]);
    let g = createGame(setup, three);
    for (const typed of ['le chat', 'la maison', 'le frère']) g = answer(g, typed);
    expect(g.attempts.map(a => a.streak)).toEqual([1, 2, 3]);
    expect(g.attempts[2].points).toBe(BASE_POINTS + EAR_BONUS + 10);
    expect(g.bestStreak).toBe(3);
  });

  it('a miss resets the streak but keeps the best', () => {
    let g = createGame(setup, [word('le chat'), word('la maison'), word('le frère')]);
    g = answer(g, 'le chat');
    g = answer(g, 'la mason');
    expect(g.streak).toBe(0);
    expect(g.bestStreak).toBe(1);
  });

  it('ignores an empty answer: it is not an answer', () => {
    const g = createGame(setup, three);
    expect(submit(g, '   ')).toBe(g);
  });

  it('giving up shows the answer, scores nothing and breaks the streak', () => {
    let g = answer(createGame(setup, three), 'le chat');
    g = giveUp(g);
    expect(g.attempts[1]).toMatchObject({ skipped: true, points: 0 });
    expect(g.attempts[1].verdict.perfect).toBe(false);
    expect(g.streak).toBe(0);
  });

  it('judges against an alternative spelling', () => {
    const item: DicteeItem = { ...word('la mer'), accept: ['la mère'] };
    expect(submit(createGame(setup, [item]), 'la mère').attempts[0].verdict.perfect).toBe(true);
  });
});

describe('the flow of a round', () => {
  it('moves one line at a time, resetting the listens and the meaning, and ends after the last', () => {
    let g = createGame(setup, three);
    expect(currentItem(g)?.fr).toBe('le chat');
    g = showMeaning(recordPlay(recordPlay(g)));
    expect(g).toMatchObject({ plays: 2, usedMeaning: true });
    g = next(submit(g, 'le chat'));
    expect(g).toMatchObject({ index: 1, phase: 'answering', plays: 0, usedMeaning: false });
    g = answer(answer(g, 'la maison'), 'le frère');
    expect(g.phase).toBe('over');
    expect(currentItem(g)).toBeNull();
  });

  it('cannot be moved on before an answer, or answered twice', () => {
    const g = createGame(setup, three);
    expect(next(g)).toBe(g);
    const done = submit(g, 'le chat');
    expect(submit(done, 'la maison')).toBe(done);
    expect(recordPlay(done)).toBe(done);
  });

  it('an empty round is over at once', () => {
    expect(createGame(setup, []).phase).toBe('over');
  });
});

describe('the summary', () => {
  it('turns accuracy into stars at 40, 70 and 90 per cent', () => {
    expect([0, 0.39, 0.4, 0.69, 0.7, 0.89, 0.9, 1].map(starsFor)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('counts perfects, listens, the best run, and lists every slip in order', () => {
    let g = createGame(setup, three);
    g = answer(g, 'le chat', 1);
    g = answer(g, 'la mason', 3);
    g = answer(g, 'le frere', 2);
    const s = summarise(g);
    expect(s.answered).toBe(3);
    expect(s.perfect).toBe(1);
    expect(s.listens).toBe(6);
    expect(s.bestStreak).toBe(1);
    expect(s.slips.map(a => a.item.fr)).toEqual(['la maison', 'le frère']);
    expect(s.accuracy).toBeCloseTo((1 + 0.5 + 0.75) / 3, 5);
    expect(s.stars).toBe(2);
  });

  it('a skipped line is a slip, never a perfect one', () => {
    const s = summarise(giveUp(createGame(setup, three)));
    expect(s.perfect).toBe(0);
    expect(s.slips).toHaveLength(1);
  });

  it('works over the whole real bank', () => {
    let g = createGame({ format: 'sentences', level: 'B1', focus: 'any' }, pickRound(itemsFor('sentences', 'B1'), 'sentences', seededRandom(9)));
    while (g.phase !== 'over') g = next(submit(recordPlay(g), currentItem(g)!.fr));
    const s = summarise(g);
    expect(s.perfect).toBe(ROUND_SIZE.sentences);
    expect(s.stars).toBe(3);
    expect(DICTEE_ITEMS.length).toBeGreaterThan(100);
  });
});
