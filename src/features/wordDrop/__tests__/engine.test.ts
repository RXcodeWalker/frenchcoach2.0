import { describe, expect, it } from 'vitest';
import {
  FLOOR_Y, HEAL_EVERY, MAX_LIVES, RETRY_AFTER_SPAWNS, WAVE_SIZE, accuracy, createGame, endGame, fallSpeed, fitsField,
  maxOnField, multiplierFor, pause, resume, spawnGapMs, submit, tick, type Env, type GameSettings, type GameState,
} from '../engine';
import type { PlayWord } from '../types';

const word = (fr: string, en: string): PlayWord => ({
  id: fr, text: fr, accept: [en], answer: en, fr, en, topicKey: 'school',
});
const POOL = ['chat:cat', 'chien:dog', 'maison:house', 'ecole:school', 'pomme:apple', 'livre:book', 'ami:friend', 'ville:town', 'pays:country', 'monde:world', 'homme:man', 'femme:woman', 'enfant:child', 'petit:small', 'grand:big', 'vieux:old']
  .map(p => word(...(p.split(':') as [string, string])));

const settings: GameSettings = { direction: 'fr-en', pace: 'steady', lanes: 5 };
/** A deterministic rng that walks 0.05, 0.15 … so word and lane picks vary but replay. */
const makeEnv = (pool = POOL): Env => {
  let n = 0;
  return { pool, rng: () => ((n++ * 0.137 + 0.05) % 1) };
};

/** Run the clock forward in 50ms frames until `done`, or `maxMs`. */
function run(state: GameState, env: Env, done: (s: GameState) => boolean, maxMs = 120_000): GameState {
  let s = state;
  for (let t = 0; t < maxMs && !done(s) && s.phase === 'playing'; t += 50) s = tick(s, 50, env);
  return s;
}

describe('difficulty curve', () => {
  it('speeds up and tightens with each wave, with a floor', () => {
    expect(fallSpeed(2, 'steady')).toBeGreaterThan(fallSpeed(1, 'steady'));
    expect(fallSpeed(1, 'quick')).toBeGreaterThan(fallSpeed(1, 'relaxed'));
    expect(spawnGapMs(5, 'steady')).toBeLessThan(spawnGapMs(1, 'steady'));
    expect(spawnGapMs(99, 'steady')).toBeGreaterThan(0);
    expect(fallSpeed(99, 'steady')).toBeLessThan(fallSpeed(1, 'steady') / 0.4);
  });

  it('allows more words on the field as waves rise, never more than columns', () => {
    expect(maxOnField(1, 5)).toBe(3);
    expect(maxOnField(9, 5)).toBe(5);
    expect(maxOnField(9, 3)).toBe(3);
  });

  it('keeps early words short and narrow fields to narrow words', () => {
    expect(fitsField('maison', 1, 5)).toBe(true);
    expect(fitsField('une valise rouge', 1, 5)).toBe(false);
    expect(fitsField('une valise rouge', 8, 5)).toBe(true);
    expect(fitsField('extraordinaire', 8, 3)).toBe(false);
  });

  it('multiplies on every fifth clear in a row, up to four', () => {
    expect([0, 4, 5, 10, 15, 40].map(multiplierFor)).toEqual([1, 1, 2, 3, 4, 4]);
  });
});

describe('a round', () => {
  it('starts with full hearts and nothing on the field, then drops its first word', () => {
    const env = makeEnv();
    const g = createGame(settings);
    expect(g).toMatchObject({ phase: 'playing', lives: MAX_LIVES, score: 0, wave: 1 });
    expect(g.words).toHaveLength(0);
    const after = run(g, env, s => s.words.length > 0);
    expect(after.words).toHaveLength(1);
    expect(after.words[0].y).toBeGreaterThan(-10);
  });

  it('never drops the same word twice at once or repeats before the bag is empty', () => {
    const env = makeEnv();
    const dropped: string[] = [];
    let s = createGame({ ...settings, pace: 'relaxed' });
    let seen = 0;
    for (let t = 0; t < 400_000 && dropped.length < POOL.length; t += 50) {
      s = tick(s, 50, env);
      // Clear every word as it appears so the round never ends.
      for (const card of s.words) {
        if (seen < card.uid) {
          dropped.push(card.word.id);
          seen = card.uid;
        }
        s = submit(s, card.word.accept[0], 'enter').state;
      }
    }
    expect(dropped).toHaveLength(POOL.length);
    expect(new Set(dropped).size).toBe(POOL.length);
  });

  it('does not tick while paused, and picks up where it left off', () => {
    const env = makeEnv();
    let s = run(createGame(settings), env, st => st.words.length > 0);
    const y = s.words[0].y;
    s = pause(s);
    expect(tick(s, 100, env)).toBe(s);
    s = resume(s);
    expect(tick(s, 100, env).words[0].y).toBeGreaterThan(y);
  });

  it('caps a long frame so a stalled tab cannot drop a word into the floor', () => {
    const env = makeEnv();
    const s = run(createGame(settings), env, st => st.words.length > 0);
    const y = s.words[0].y;
    const next = tick(s, 60_000, env);
    expect(next.words[0].y - y).toBeLessThan(fallSpeed(1, 'steady') * 0.11);
  });
});

describe('answering', () => {
  const withWord = () => {
    const env = makeEnv();
    const s = run(createGame(settings), env, st => st.words.length >= 1);
    return { env, s, card: s.words[0] };
  };

  it('clears the word on an exact live answer and scores it', () => {
    const { s, card } = withWord();
    const { state, result } = submit(s, card.word.accept[0].toUpperCase(), 'live');
    expect(result).toBe('cleared');
    expect(state.words.find(w => w.uid === card.uid)).toBeUndefined();
    expect(state).toMatchObject({ cleared: 1, combo: 1 });
    expect(state.score).toBeGreaterThanOrEqual(10);
    expect(state.score).toBeLessThanOrEqual(16);
    expect(state.ghosts).toHaveLength(1);
    expect(state.event).toMatchObject({ kind: 'clear' });
  });

  it('pays more for a word caught high than one scraping the floor', () => {
    const { s, card } = withWord();
    const high = submit({ ...s, words: [{ ...card, y: 5 }] }, card.word.accept[0], 'live').state.score;
    const low = submit({ ...s, words: [{ ...card, y: FLOOR_Y - 2 }] }, card.word.accept[0], 'live').state.score;
    expect(high).toBeGreaterThan(low);
  });

  it('ignores partial text live and says nothing for an empty box', () => {
    const { s, card } = withWord();
    expect(submit(s, card.word.accept[0].slice(0, 1), 'live').result).toBe('ignored');
    expect(submit(s, '   ', 'enter').result).toBe('ignored');
  });

  it('holds a live match while the typing could still become a longer answer', () => {
    const { s, card } = withWord();
    const longer: PlayWord = { ...word('mangeur', 'eater') };
    const eat: PlayWord = { ...word('manger', 'eat') };
    const field: GameState = {
      ...s,
      words: [{ ...card, word: eat }, { ...card, uid: card.uid + 1, word: longer, lane: 4 }],
    };
    expect(submit(field, 'eat', 'live').result).toBe('waiting');
    expect(submit(field, 'eat', 'enter').result).toBe('cleared');
    expect(submit(field, 'eater', 'live').result).toBe('cleared');
  });

  it('clears the lowest of two words with the same answer', () => {
    const { s, card } = withWord();
    const a = { ...card, uid: 100, y: 20, lane: 0 };
    const b = { ...card, uid: 101, y: 60, lane: 1 };
    const { state } = submit({ ...s, words: [a, b] }, card.word.accept[0], 'live');
    expect(state.words.map(w => w.uid)).toEqual([100]);
  });

  it('forgives a slip on Enter only, and calls a miss "wrong" without a penalty', () => {
    const env = makeEnv([word('maison', 'house')]);
    const s = run(createGame(settings), env, st => st.words.length >= 1);
    expect(submit(s, 'hose', 'live').result).toBe('ignored');
    const close = submit(s, 'hose', 'enter');
    expect(close.result).toBe('cleared');
    expect(close.state.event).toMatchObject({ kind: 'clear', close: true });
    const wrong = submit(s, 'banana', 'enter');
    expect(wrong.result).toBe('wrong');
    expect(wrong.state).toBe(s);
    expect(wrong.state.lives).toBe(MAX_LIVES);
  });

  it('types French when English falls, accents optional', () => {
    const env = makeEnv([word('x', 'y')]);
    const s: GameState = {
      ...createGame({ ...settings, direction: 'en-fr' }),
      words: [{ uid: 1, lane: 0, y: 30, again: false, word: { ...word('école', 'school'), text: 'school', accept: ['ecole'], answer: 'école' } }],
    };
    expect(env).toBeTruthy();
    expect(submit(s, 'École', 'live').result).toBe('cleared');
    expect(submit(s, "l'ecole", 'live').result).toBe('cleared');
  });

  it('ignores answers when the round is not playing', () => {
    const { s, card } = withWord();
    expect(submit(pause(s), card.word.accept[0], 'live').result).toBe('ignored');
  });
});

describe('streaks, hearts and waves', () => {
  const clearN = (n: number, start: GameState) => {
    let s = start;
    for (let i = 0; i < n; i++) {
      const card = { uid: 1000 + i, lane: 0, y: 40, again: false, word: POOL[i % POOL.length] };
      s = submit({ ...s, words: [card] }, card.word.accept[0], 'live').state;
    }
    return s;
  };

  it('raises the multiplier with the streak', () => {
    const s = clearN(5, createGame(settings));
    expect(s.combo).toBe(5);
    expect(s.event).toMatchObject({ kind: 'clear', multiplier: 2 });
  });

  it('wins a heart back every ten in a row, never past three', () => {
    const hurt = { ...createGame(settings), lives: 1 };
    const s = clearN(HEAL_EVERY, hurt);
    expect(s.lives).toBe(2);
    const full = clearN(HEAL_EVERY, createGame(settings));
    expect(full.lives).toBe(MAX_LIVES);
  });

  it('moves up a wave after a set number of clears and says so', () => {
    const s = clearN(WAVE_SIZE, createGame(settings));
    expect(s.wave).toBe(2);
    expect(s.clearedInWave).toBe(0);
    expect(s.event).toMatchObject({ kind: 'wave', wave: 2 });
  });
});

describe('missing words', () => {
  const landing = (extra: Partial<GameState> = {}): GameState => ({
    ...createGame(settings),
    spawnInMs: 99_999,
    words: [{ uid: 1, lane: 0, y: FLOOR_Y - 0.01, again: false, word: POOL[0] }],
    combo: 4,
    ...extra,
  });
  const env = makeEnv();

  it('costs a heart, breaks the streak and shows the answer', () => {
    const s = tick(landing(), 50, env);
    expect(s).toMatchObject({ lives: MAX_LIVES - 1, combo: 0, missed: 1 });
    expect(s.miss).toMatchObject({ text: 'chat', answer: 'cat' });
    expect(s.review.map(w => w.id)).toEqual(['chat']);
    expect(s.event).toMatchObject({ kind: 'miss' });
  });

  it('brings the missed word back later, marked "again"', () => {
    let s = tick(landing(), 50, env);
    expect(s.retry).toEqual([{ word: POOL[0], after: RETRY_AFTER_SPAWNS }]);
    // A learner who catches every other word while the missed one waits its turn.
    s = { ...s, spawnInMs: 0 };
    for (let t = 0; t < 600_000 && !s.words.some(w => w.again) && s.phase === 'playing'; t += 50) {
      s = tick(s, 50, env);
      for (const card of s.words) if (!card.again) s = submit(s, card.word.accept[0], 'enter').state;
    }
    const back = s.words.find(w => w.again);
    expect(back?.word.id).toBe('chat');
    // Catching it on the second go takes it out of the review.
    s = submit(s, 'cat', 'live').state;
    expect(s.review).toEqual([]);
  });

  it('gives a word one second go: missing it again stays in the review', () => {
    const again = landing({ words: [{ uid: 2, lane: 0, y: FLOOR_Y - 0.01, again: true, word: POOL[0] }], review: [POOL[0]] });
    const s = tick(again, 50, env);
    expect(s.retry).toEqual([]);
    expect(s.review.map(w => w.id)).toEqual(['chat']);
  });

  it('ends the round when the last heart goes, keeping the score', () => {
    const s = tick(landing({ lives: 1, score: 120 }), 50, env);
    expect(s).toMatchObject({ phase: 'over', lives: 0, score: 120 });
    expect(s.event).toMatchObject({ kind: 'over' });
    expect(tick(s, 50, env)).toBe(s);
  });

  it('lets a quit end the round with the score so far', () => {
    const s = endGame({ ...createGame(settings), score: 40 });
    expect(s).toMatchObject({ phase: 'over', score: 40 });
  });

  it('clears the miss note after a while', () => {
    let s = tick(landing(), 50, env);
    s = { ...s, spawnInMs: 99_999 };
    for (let i = 0; i < 70; i++) s = tick(s, 50, env);
    expect(s.miss).toBeNull();
  });
});

describe('accuracy', () => {
  it('is cleared over cleared + missed, 0 when nothing happened', () => {
    expect(accuracy({ cleared: 0, missed: 0 })).toBe(0);
    expect(accuracy({ cleared: 3, missed: 1 })).toBe(75);
  });
});

describe('a whole round never leaves the field empty for long', () => {
  it('keeps spawning and eventually ends if nothing is typed', () => {
    const env = makeEnv();
    const s = run(createGame({ ...settings, pace: 'quick' }), env, st => st.phase !== 'playing');
    expect(s.phase).toBe('over');
    expect(s.missed).toBe(MAX_LIVES);
    expect(s.score).toBe(0);
  });
});
