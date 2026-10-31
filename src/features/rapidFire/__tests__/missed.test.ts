// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../../services/persistence/storage';
import { MIN_MISSED_FOR_SPRINT, missedInSet, readMissed, recordMissed } from '../missed';
import type { EntryKind, RunEntry } from '../run';
import { getWordSet } from '../wordBank';

const words = getWordSet('phrases')!.words;
const entry = (i: number, kind: EntryKind): RunEntry => ({ word: words[i], typed: 'x', kind, expected: words[i].answers[0], accentsMissed: false });
const at = (iso: string) => () => iso;

describe('rapid fire missed cards', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty and treats unreadable storage as empty', () => {
    expect(readMissed()).toEqual({ version: 1, cards: {} });
    localStorage.setItem(STORAGE_KEYS.rapidFireMissed, '{"version":9}');
    expect(readMissed()).toEqual({ version: 1, cards: {} });
  });

  it('collects wrong and skipped cards, counting repeats, and ignores nothing-runs', () => {
    recordMissed([], at('2026-10-31T10:00:00.000Z'));
    expect(readMissed().cards).toEqual({});
    recordMissed([entry(0, 'wrong'), entry(1, 'skipped')], at('2026-10-31T10:00:00.000Z'));
    recordMissed([entry(0, 'wrong')], at('2026-10-31T11:00:00.000Z'));
    const { cards } = readMissed();
    expect(cards[words[0].prompt.toLowerCase()]).toEqual({ misses: 2, lastMissedAt: '2026-10-31T11:00:00.000Z' });
    expect(cards[words[1].prompt.toLowerCase()].misses).toBe(1);
  });

  it('a correct answer clears the card; an almost changes nothing', () => {
    recordMissed([entry(0, 'wrong'), entry(1, 'wrong')]);
    recordMissed([entry(0, 'correct'), entry(1, 'almost')]);
    expect(Object.keys(readMissed().cards)).toEqual([words[1].prompt.toLowerCase()]);
  });

  it('within one run the last answer for a card wins', () => {
    recordMissed([entry(0, 'correct'), entry(0, 'wrong')]);
    expect(Object.keys(readMissed().cards)).toHaveLength(1);
    recordMissed([entry(0, 'wrong'), entry(0, 'correct')]);
    expect(Object.keys(readMissed().cards)).toHaveLength(0);
  });

  it('lists a set’s missed cards, most-missed first, and only that set’s', () => {
    recordMissed([entry(3, 'wrong'), entry(5, 'wrong'), entry(5, 'skipped')]);
    expect(missedInSet(getWordSet('phrases')!).map(w => w.id)).toEqual([words[5].id, words[3].id]);
    const school = getWordSet('school')!;
    const sharedWithPhrases = school.words.some(w => w.prompt === words[3].prompt || w.prompt === words[5].prompt);
    expect(missedInSet(school).length > 0).toBe(sharedWithPhrases);
  });

  it('needs a handful of cards before a sprint is offered', () => {
    expect(MIN_MISSED_FOR_SPRINT).toBeGreaterThanOrEqual(3);
  });
});
