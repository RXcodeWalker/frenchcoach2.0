import { describe, expect, it } from 'vitest';
import {
  ANSWER_FIT,
  EXAM_PARTS,
  MODE_GOALS,
  ORDER_SCRAMBLE,
  SORT_ITEMS,
  STUCK_STEPS,
  TIME_FRAME_ITEMS,
  TIME_FRAME_LABEL,
} from '../guideContent';

describe('exam guide practice content', () => {
  it('the order game holds every part once, and starts out of order', () => {
    expect([...ORDER_SCRAMBLE].sort()).toEqual(EXAM_PARTS.map((p) => p.id).sort());
    expect(ORDER_SCRAMBLE).not.toEqual(EXAM_PARTS.map((p) => p.id));
  });

  it('the sort game uses both marks, in roughly equal numbers', () => {
    const comm = SORT_ITEMS.filter((i) => i.area === 'communication').length;
    expect(comm).toBeGreaterThan(1);
    expect(SORT_ITEMS.length - comm).toBeGreaterThan(1);
  });

  it('every multiple-choice item points at a real, distinct option', () => {
    for (const q of ANSWER_FIT) {
      expect(q.options[q.answer]).toBeDefined();
      expect(new Set(q.options).size).toBe(q.options.length);
    }
    // The right answer isn't always in the same slot.
    expect(new Set(ANSWER_FIT.map((q) => q.answer)).size).toBeGreaterThan(1);
  });

  it('the time-frame drill covers every time frame it offers', () => {
    const used = new Set(TIME_FRAME_ITEMS.map((i) => i.frame));
    for (const frame of Object.keys(TIME_FRAME_LABEL)) expect(used.has(frame as never)).toBe(true);
  });

  it('only questions 3–5 have an alternative (exam-conduct §12–§13)', () => {
    expect(STUCK_STEPS.early.join(' ')).not.toMatch(/asks the alternative/);
    expect(STUCK_STEPS.later.join(' ')).toMatch(/asks the alternative/);
  });

  it('the mode picker only sends learners to routes that exist', () => {
    for (const g of MODE_GOALS) expect(['/exam', '/exam/role-play', '/learn']).toContain(g.path);
  });
});
