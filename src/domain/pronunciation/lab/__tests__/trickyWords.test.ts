import { describe, expect, it } from 'vitest';
import {
  TRICKY_RULES,
  clearedCount,
  daysBetween,
  localDay,
  noteWord,
  pruneEntries,
  trickyDeck,
  trickyKey,
  type TrickyEntries,
} from '../trickyWords';

const D1 = '2026-10-01';
const D2 = '2026-10-02';
const D3 = '2026-10-03';

function run(steps: Array<['practise' | 'clear', string]>, word = 'tout'): TrickyEntries {
  return steps.reduce<TrickyEntries>((entries, [evidence, day]) => noteWord(entries, word, evidence, day), {});
}

describe('trickyWords', () => {
  it('watches a word after one "Practise this" and adds it to the deck after two', () => {
    expect(run([['practise', D1]]).tout.status).toBe('watching');
    expect(trickyDeck(run([['practise', D1]]), D2)).toEqual([]);
    const two = run([['practise', D1], ['practise', D1]]);
    expect(two.tout.status).toBe('tricky');
    expect(trickyDeck(two, D2)).toEqual([{ word: 'tout', due: true, clearRun: 0 }]);
  });

  it('a word that was only Clear is never tracked', () => {
    expect(run([['clear', D1], ['clear', D2]])).toEqual({});
  });

  it('leaves the deck after Clear on two different days, not twice on one day', () => {
    const joined: Array<['practise' | 'clear', string]> = [['practise', D1], ['practise', D1]];
    const sameDay = run([...joined, ['clear', D2], ['clear', D2]]);
    expect(sameDay.tout.status).toBe('tricky');
    expect(sameDay.tout.clearRun).toBe(1);
    const twoDays = run([...joined, ['clear', D2], ['clear', D3]]);
    expect(twoDays.tout.status).toBe('cleared');
    expect(trickyDeck(twoDays, D3)).toEqual([]);
    expect(clearedCount(twoDays)).toBe(1);
  });

  it('a Practise between the two clears starts the run again', () => {
    const e = run([['practise', D1], ['practise', D1], ['clear', D2], ['practise', D3], ['clear', D3]]);
    expect(e.tout.status).toBe('tricky');
    expect(e.tout.clearRun).toBe(1);
  });

  it('a cleared word needs two new misses to come back', () => {
    const cleared = run([['practise', D1], ['practise', D1], ['clear', D2], ['clear', D3]]);
    const one = noteWord(cleared, 'tout', 'practise', '2026-10-10');
    expect(one.tout.status).toBe('watching');
    expect(noteWord(one, 'tout', 'practise', '2026-10-11').tout.status).toBe('tricky');
  });

  it('returns the same object when nothing changes', () => {
    const e = run([['practise', D1]]);
    expect(noteWord(e, 'vin', 'clear', D2)).toBe(e);
    expect(noteWord(e, '  ', 'practise', D2)).toBe(e);
  });

  it('orders the deck: due first, then the most missed, then alphabetically', () => {
    let e: TrickyEntries = {};
    for (const [word, n, day] of [['zéro', 2, D1], ['bon', 3, D1], ['vent', 2, D1], ['sous', 2, D2]] as const) {
      for (let i = 0; i < n; i++) e = noteWord(e, word, 'practise', day);
    }
    expect(trickyDeck(e, D2).map((d) => [d.word, d.due])).toEqual([
      ['bon', true],
      ['vent', true],
      ['zéro', true],
      ['sous', false],
    ]);
  });

  it('forgets a watched word after its expiry, but never a tricky one', () => {
    const e = { ...run([['practise', D1]]), ...run([['practise', D1], ['practise', D1]], 'vin') };
    const later = '2026-12-01';
    expect(Object.keys(pruneEntries(e, later))).toEqual(['vin']);
    expect(pruneEntries(e, D2)).toBe(e);
  });

  it('keeps at most maxWords, cleared ones going first', () => {
    const entries: TrickyEntries = {};
    for (let i = 0; i < TRICKY_RULES.maxWords + 5; i++) {
      entries[`mot${i}`] = { status: i < 5 ? 'cleared' : 'tricky', practiseCount: 2, clearRun: 0, lastDay: D1, lastClearDay: null };
    }
    const pruned = pruneEntries(entries, D2);
    expect(Object.keys(pruned)).toHaveLength(TRICKY_RULES.maxWords);
    expect(Object.values(pruned).some((e) => e.status === 'cleared')).toBe(false);
  });

  it('helpers: key, days, local day', () => {
    expect(trickyKey('  Tout ')).toBe('tout');
    expect(daysBetween(D1, D3)).toBe(2);
    expect(daysBetween('nope', D3)).toBeNaN();
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
