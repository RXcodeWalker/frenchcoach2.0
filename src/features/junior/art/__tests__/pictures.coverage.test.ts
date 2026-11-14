// Every picture the Junior bank uses has a drawing; an unknown one would fall back to a star.
import { describe, expect, it } from 'vitest';
import { JUNIOR_BANK } from '../../../../data/junior';
import { PICTURES } from '../pictures';

describe('Junior pictures', () => {
  const used = new Set<string>();
  for (const t of JUNIOR_BANK.themes) {
    used.add(t.emoji);
    used.add(t.unlock.emoji);
    for (const s of t.stickers) used.add(s.emoji);
  }
  for (const q of JUNIOR_BANK.questions) {
    used.add(q.emoji);
    for (const f of q.frames) for (const o of f.slotOptions) used.add(o.emoji);
  }

  it('draws every picture the bank uses', () => {
    expect([...used].filter((e) => !PICTURES[e])).toEqual([]);
  });

  it('gives each picture its own id (an illustration file is named by it)', () => {
    const ids = new Map<string, string>();
    for (const [key, pic] of Object.entries(PICTURES)) ids.set(pic.id, key);
    expect(ids.size).toBe(Object.keys(PICTURES).length);
  });
});
