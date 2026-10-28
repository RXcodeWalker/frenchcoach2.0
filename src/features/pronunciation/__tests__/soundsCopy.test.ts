import { describe, expect, it } from 'vitest';
import {
  EAR_INTRO,
  FAMILY_STATUS_DISPLAY,
  NOTEBOOK_PRACTISE_NOTE,
  PRACTISE_EMPTY,
  TRICKY_DRILL_FULL,
  TRICKY_EMPTY_BODY,
  TRICKY_HELP,
  YOUR_SOUNDS_HELP,
  earPrompt,
  earRoundSummary,
  earVerdictLine,
  trickyCardNote,
  trickyHeadline,
  trickyProgressLine,
} from '../soundsCopy';

const deck = (...due: boolean[]) => due.map((d, i) => ({ word: `mot${i}`, due: d, clearRun: 0 }));

describe('Lab home copy', () => {
  it('the four sound statuses are the plan\'s words, each with an icon except "not enough data"', () => {
    expect(Object.values(FAMILY_STATUS_DISPLAY).map((d) => d.label)).toEqual(['Clear', 'Getting there', 'Needs work', 'Not enough data yet']);
    for (const s of ['clear', 'gettingThere', 'needsWork'] as const) expect(FAMILY_STATUS_DISPLAY[s].glyph).not.toBe('');
    for (const d of Object.values(FAMILY_STATUS_DISPLAY)) expect(d.chip).not.toMatch(/(violet|emerald|amber|red|rose|slate|#)/);
  });

  it('never says wrong / bad / incorrect / mistake / score', () => {
    const all = [
      YOUR_SOUNDS_HELP, EAR_INTRO, TRICKY_EMPTY_BODY, TRICKY_HELP, TRICKY_DRILL_FULL, PRACTISE_EMPTY, NOTEBOOK_PRACTISE_NOTE,
      earVerdictLine(true, 'tout'), earVerdictLine(false, 'tout'), earRoundSummary(6, 6), earRoundSummary(4, 6), earRoundSummary(1, 6),
      trickyHeadline([]), trickyHeadline(deck(true)), trickyHeadline(deck(false)),
      trickyProgressLine('clear', { status: 'cleared', clearRun: 2 }) ?? '',
      trickyProgressLine('clear', { status: 'tricky', clearRun: 1 }) ?? '',
    ];
    for (const text of all) expect(text).not.toMatch(/\b(wrong|bad|incorrect|mistakes?|scores?)\b/i);
  });

  it('the status help states the real thresholds (so it cannot drift from them)', () => {
    expect(YOUR_SOUNDS_HELP).toMatch(/6 checked words on 2 different days/);
    expect(TRICKY_EMPTY_BODY).toMatch(/twice/);
    expect(TRICKY_EMPTY_BODY).toMatch(/two different days/);
  });

  it('tricky card note and headline count plainly', () => {
    expect(trickyCardNote([])).toBe('Words you find hard collect here');
    expect(trickyCardNote(deck(true, true, false))).toBe('2 words to practise');
    expect(trickyCardNote(deck(true))).toBe('1 word to practise');
    expect(trickyCardNote(deck(false, false))).toBe('2 words — all practised today');
    expect(trickyHeadline(deck(true, true))).toBe('2 words to practise today.');
    expect(trickyHeadline(deck(false))).toBe('All practised for today.');
  });

  it('progress lines only appear for a clear word that is on its way out', () => {
    expect(trickyProgressLine('clear', { status: 'tricky', clearRun: 1 })).toMatch(/another day/);
    expect(trickyProgressLine('clear', { status: 'cleared', clearRun: 2 })).toMatch(/left your list/);
    expect(trickyProgressLine('tryAgain', { status: 'tricky', clearRun: 0 })).toBeNull();
    expect(trickyProgressLine('clear', { status: 'absent', clearRun: 0 })).toBeNull();
  });

  it('ear training wording', () => {
    expect(earPrompt(0, 6)).toBe('Question 1 of 6: which word did you hear?');
    expect(earVerdictLine(true, 'tout')).toBe('Yes — « tout ».');
    expect(earVerdictLine(false, 'tout')).toMatch(/That one was « tout »/);
  });
});
