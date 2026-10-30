import { describe, expect, it } from 'vitest';
import {
  DRILL_VERDICT_DISPLAY,
  NOTICE_TEXT,
  WORD_STATE_DISPLAY,
  clearHeadline,
  comparisonLine,
  flowLine,
  focusLead,
  legendStates,
} from '../labCopy';

const allCopy = [
  ...Object.values(WORD_STATE_DISPLAY).map((d) => d.label),
  ...Object.values(DRILL_VERDICT_DISPLAY).flatMap((d) => [d.label, d.line]),
  ...Object.values(NOTICE_TEXT),
  focusLead('suggest', ['enfants', 'jardin']) ?? '',
  focusLead('offer', ['enfants']) ?? '',
  flowLine({ pausesOver2s: 0 }) ?? '',
];

describe('Lab copy', () => {
  it('every measured word state has an icon and a word (never colour alone)', () => {
    for (const state of ['clear', 'almost', 'practise', 'missed', 'extra'] as const) {
      expect(WORD_STATE_DISPLAY[state].glyph).not.toBe('');
      expect(WORD_STATE_DISPLAY[state].label).not.toBe('');
    }
    expect(WORD_STATE_DISPLAY.practise.label).toBe('Practise this');
    expect(WORD_STATE_DISPLAY.missed.label).toBe('Not heard');
  });

  it('chips use role tokens only', () => {
    for (const d of [...Object.values(WORD_STATE_DISPLAY), ...Object.values(DRILL_VERDICT_DISPLAY)]) {
      expect(d.chip).not.toMatch(/(violet|emerald|amber|red|rose|slate|#)/);
    }
  });

  it('never says wrong, bad or incorrect, and carries no number', () => {
    for (const text of allCopy) {
      expect(text).not.toMatch(/\b(wrong|bad|incorrect|mistake|score)\b/i);
      expect(text).not.toMatch(/\d/);
    }
  });

  it('the legend shows the four states, plus Extra word only when there is one', () => {
    expect(legendStates(false)).toEqual(['clear', 'almost', 'practise', 'missed']);
    expect(legendStates(true)).toContain('extra');
  });

  it('headline is "N of M words clear" — the only number (owner D5)', () => {
    expect(clearHeadline({ clear: 9, total: 11 })).toBe('9 of 11 words clear');
    expect(clearHeadline({ clear: 1, total: 1 })).toBe('1 of 1 word clear');
  });

  it('first vs best', () => {
    expect(comparisonLine(null)).toBeNull();
    const base = { firstIndex: 0, bestIndex: 1, total: 11, improved: [2, 3, 4] };
    expect(comparisonLine({ ...base, firstClear: 7, bestClear: 10, improvedOverFirst: true })).toBe('First take 7 → best 10 of 11 words clear');
    expect(comparisonLine({ ...base, bestIndex: 0, firstClear: 7, bestClear: 7, improvedOverFirst: false })).toBe('Best so far: 7 of 11 words clear');
  });

  it('offers one word, suggests two, says nothing when there is nothing', () => {
    expect(focusLead('none', [])).toBeNull();
    expect(focusLead('offer', ['enfants'])).toBe('Nearly all clear. Want to practise « enfants »?');
    expect(focusLead('suggest', ['enfants', 'jardin'])).toBe('Two words worth practising: « enfants » and « jardin ».');
    expect(focusLead('suggest', ['enfants'])).toBe('One word worth practising: « enfants ».');
  });

  it('the flow line describes pauses, never a level (plan §3.1 item 2)', () => {
    expect(flowLine(null)).toBeNull();
    expect(flowLine({ pausesOver2s: 0 })).toBe('Smooth — no long pauses.');
    expect(flowLine({ pausesOver2s: 1 })).toBe('1 pause over 2 seconds — try linking your ideas with et, mais, parce que.');
    expect(flowLine({ pausesOver2s: 3 })).toBe('3 pauses over 2 seconds — try linking your ideas with et, mais, parce que.');
    for (const n of [0, 1, 3]) expect(flowLine({ pausesOver2s: n })).not.toMatch(/fluent|level|band|grade|score|A1|A2|B1|B2/i);
  });
});

import { allowanceLine, checkAllowanceLine } from '../labCopy';

describe('the daily allowance wording (Stage 7)', () => {
  it('names the count, never "limit reached", and says what still works when none are left', () => {
    expect(allowanceLine(null)).toBeNull();
    expect(allowanceLine(1)).toMatch(/^1 check left today/);
    expect(allowanceLine(12)).toMatch(/^12 checks left today/);
    expect(allowanceLine(0)).toMatch(/still listen/);
    expect(allowanceLine(0)).not.toMatch(/limit/i);
  });

  it('the monthly check explains when the allowance will not cover it', () => {
    expect(checkAllowanceLine(null, 5, 3)).toBeNull();
    expect(checkAllowanceLine(2, 5, 3)).toMatch(/needs at least 3/);
    expect(checkAllowanceLine(4, 5, 3)).toMatch(/may not reach every sentence/);
    expect(checkAllowanceLine(20, 5, 3)).toMatch(/20 checks left today/);
  });
});
