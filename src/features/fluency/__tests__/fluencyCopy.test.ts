// fluency-trainer §6: the trainer measures flow, never French, and never grades.
import { describe, expect, it } from 'vitest';
import * as copy from '../fluencyCopy';

function strings(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const add = (name: string, v: unknown) => {
    if (typeof v === 'string') out.push([name, v]);
    else if (typeof v === 'function') {
      // Exercise each wording function with representative arguments.
      for (const args of [[3, 7], ['smoother', 3], ['same', 3], ['lessSmooth', 3], ['School & Education']]) {
        try { const r = (v as (...a: unknown[]) => unknown)(...args); if (typeof r === 'string') out.push([name, r]); } catch { /* not this signature */ }
      }
    } else if (Array.isArray(v)) v.forEach((x, i) => add(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) add(`${name}.${k}`, x);
  };
  for (const [k, v] of Object.entries(copy)) add(k, v);
  return out;
}

const GRADE_WORDS = /\b(marks?|marked|grades?|graded|bands?|scores?|CEFR|A1|A2|B1|B2|level|pass|fail(?:ed)?|wrong|bad|good speed|native)\b/i;

describe('fluency trainer copy', () => {
  it('finds the strings to check', () => {
    expect(strings().length).toBeGreaterThan(50);
  });

  it('names no mark, grade, band or level, except to say this isn’t one', () => {
    const offenders = strings().filter(([name, s]) => name !== 'FLOW_NOT_A_GRADE' && GRADE_WORDS.test(s));
    expect(offenders).toEqual([]);
  });

  it('says plainly that it measures flow, not French, and is not a mark', () => {
    expect(copy.FLOW_NOT_A_GRADE).toMatch(/flow, not French/);
    expect(copy.FLOW_NOT_A_GRADE).toMatch(/not a mark/);
  });

  it('says the measures are unvalidated estimates', () => {
    expect(copy.UNVALIDATED_NOTE).toMatch(/estimates/);
    expect(copy.UNVALIDATED_NOTE).toMatch(/haven’t been checked/);
  });

  it('formats a missing value as a dash, never as zero', () => {
    expect(copy.formatMeasure('wordsPerMinute', null)).toBe('–');
    expect(copy.formatMeasure('wordsPerMinute', 101.6)).toBe('102');
    expect(copy.formatMeasure('longestPauseS', 1.25)).toBe('1.3');
  });
});
