import { describe, expect, it } from 'vitest';
import { JUNIOR_BANK } from '../../../data/junior';
import { QUESTION_TURNS } from '../buildMission';
import { resumeMission } from '../resumeMission';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const ids = (m: ReturnType<typeof resumeMission>) => m.turns.flatMap((t) => (t.kind === 'question' ? [t.questionId] : []));
const themeQs = (themeId: string) => JUNIOR_BANK.questions.filter((q) => q.themeId === themeId).map((q) => q.id);

describe('resumeMission', () => {
  it('skips finished questions, never repeats the demo, and still warms up and ends with « Et toi ? »', () => {
    const done = themeQs('couleurs').slice(0, 2);
    const m = resumeMission(JUNIOR_BANK, 'couleurs', done, seeded());
    expect(m.turns[0]).toEqual({ kind: 'warmup' });
    expect(m.turns.some((t) => t.kind === 'demo')).toBe(false);
    expect(m.turns[m.turns.length - 1].kind).toBe('etToi');
    expect(ids(m).filter((q) => done.includes(q))).toEqual([]);
  });

  it('keeps the mission the same total length: finished + remaining = QUESTION_TURNS', () => {
    const done = themeQs('moi').slice(0, 3);
    expect(ids(resumeMission(JUNIOR_BANK, 'moi', done, seeded(2))).length).toBe(QUESTION_TURNS - 3);
  });

  it('with every question turn already finished only « Et toi ? » is left (after the warm-up)', () => {
    const done = themeQs('moi').slice(0, QUESTION_TURNS);
    const m = resumeMission(JUNIOR_BANK, 'moi', done, seeded(3));
    expect(m.turns.map((t) => t.kind)).toEqual(['warmup', 'etToi']);
  });

  it('only offers questions from the theme, none twice', () => {
    const m = resumeMission(JUNIOR_BANK, 'couleurs', [], seeded(4));
    const picked = ids(m);
    expect(new Set(picked).size).toBe(picked.length);
    expect(picked.every((q) => themeQs('couleurs').includes(q))).toBe(true);
  });

  it('throws on an unknown theme, like buildMission', () => {
    expect(() => resumeMission(JUNIOR_BANK, 'nope', [])).toThrow(/Unknown Junior theme/);
  });
});
