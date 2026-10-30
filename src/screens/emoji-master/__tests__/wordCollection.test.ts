// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { EMOJI_QUESTIONS } from '../../../data/emojiQuestions';
import { STORAGE_KEYS } from '../../../services/persistence/storage';
import {
  applyOutcomes,
  MASTERED_AT,
  readWordCollection,
  recordRun,
  summarizeCollection,
} from '../wordCollection';

const empty = { version: 1 as const, words: {} };
const right = (id: string) => ({ questionId: id, isCorrect: true });
const wrong = (id: string) => ({ questionId: id, isCorrect: false });

describe('wordCollection', () => {
  beforeEach(() => localStorage.clear());

  it('masters a word after three right answers in a row', () => {
    let { collection } = applyOutcomes(empty, [right('1'), right('1')]);
    expect(collection.words['1']).toEqual({ streak: 2, right: 2, wrong: 0 });
    const result = applyOutcomes(collection, [right('1')]);
    expect(result.newlyMastered).toEqual(['1']);
    collection = result.collection;
    expect(collection.words['1'].streak).toBe(MASTERED_AT);
  });

  it('sends a word back to zero on a miss, and reports it as newly mastered only once', () => {
    const mastered = applyOutcomes(empty, [right('1'), right('1'), right('1')]).collection;
    const again = applyOutcomes(mastered, [right('1')]);
    expect(again.newlyMastered).toEqual([]);
    const missed = applyOutcomes(mastered, [wrong('1')]).collection;
    expect(missed.words['1']).toEqual({ streak: 0, right: 3, wrong: 1 });
    const regained = applyOutcomes(missed, [right('1'), right('1'), right('1')]);
    expect(regained.newlyMastered).toEqual(['1']);
  });

  it('is pure', () => {
    const before = JSON.stringify(empty);
    applyOutcomes(empty, [right('1')]);
    expect(JSON.stringify(empty)).toBe(before);
  });

  it('persists a run and reads it back; ignores a wrong version or junk records', () => {
    recordRun([right('2'), wrong('3')]);
    expect(readWordCollection().words['2'].streak).toBe(1);
    expect(readWordCollection().words['3'].wrong).toBe(1);

    localStorage.setItem(STORAGE_KEYS.emojiMasterWords, JSON.stringify({ version: 9, words: { x: {} } }));
    expect(readWordCollection()).toEqual(empty);

    localStorage.setItem(
      STORAGE_KEYS.emojiMasterWords,
      JSON.stringify({ version: 1, words: { a: { streak: 1, right: 1, wrong: 0 }, b: { streak: 'x' } } })
    );
    expect(Object.keys(readWordCollection().words)).toEqual(['a']);
  });

  it('summarises against the current bank, by category', () => {
    const food = EMOJI_QUESTIONS.filter((q) => q.category === 'food').slice(0, 2);
    const learned = [
      ...food.flatMap((q) => [right(q.id), right(q.id), right(q.id)]),
      right(EMOJI_QUESTIONS.find((q) => q.category === 'animals')!.id),
      right('word-that-was-removed'),
    ];
    const summary = summarizeCollection(applyOutcomes(empty, learned).collection, EMOJI_QUESTIONS);
    expect(summary.total).toBe(EMOJI_QUESTIONS.length);
    expect(summary.mastered).toBe(2);
    expect(summary.learning).toBe(1);
    expect(summary.byCategory.food.mastered).toBe(2);
    expect(summary.byCategory.animals.mastered).toBe(0);
  });
});
