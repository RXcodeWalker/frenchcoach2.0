import { describe, expect, it } from 'vitest';
import { JUNIOR_BANK } from '../../../data/junior';
import type { JuniorBank } from '../../../data/junior/types';
import { MIN_QUESTION_TURNS, QUESTION_TURNS, buildMission } from '../buildMission';

/** A tiny deterministic generator so missions are reproducible. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

describe('buildMission (junior-track §1)', () => {
  for (const theme of JUNIOR_BANK.themes) {
    it(`${theme.id}: warm-up + ${QUESTION_TURNS} question turns + « Et toi ? »`, () => {
      const mission = buildMission(JUNIOR_BANK, theme.id, { demoSeen: true }, seeded(1));
      const kinds = mission.turns.map((t) => t.kind);
      expect(kinds).toEqual(['warmup', ...Array(QUESTION_TURNS).fill('question'), 'etToi']);
      expect(mission.themeId).toBe(theme.id);
    });
  }

  it('opens with the first-run demo only until it has been seen', () => {
    expect(buildMission(JUNIOR_BANK, 'moi', { demoSeen: false }, seeded(2)).turns[0]).toEqual({ kind: 'demo' });
    expect(buildMission(JUNIOR_BANK, 'moi', { demoSeen: true }, seeded(2)).turns.some((t) => t.kind === 'demo')).toBe(false);
  });

  it('picks distinct questions from the theme only, and an « Et toi ? » of that theme', () => {
    for (let seed = 1; seed < 30; seed++) {
      const mission = buildMission(JUNIOR_BANK, 'couleurs', { demoSeen: true }, seeded(seed));
      const ids = mission.turns.flatMap((t) => (t.kind === 'question' ? [t.questionId] : []));
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(JUNIOR_BANK.questions.find((q) => q.id === id)?.themeId).toBe('couleurs');
      const etToi = mission.turns[mission.turns.length - 1];
      expect(etToi?.kind).toBe('etToi');
      const theme = JUNIOR_BANK.themes.find((t) => t.id === 'couleurs')!;
      expect(theme.etToi.map((e) => e.id)).toContain(etToi?.kind === 'etToi' ? etToi.etToiId : '');
    }
  });

  it('is deterministic for an injected random source', () => {
    const a = buildMission(JUNIOR_BANK, 'moi', { demoSeen: true }, seeded(7));
    const b = buildMission(JUNIOR_BANK, 'moi', { demoSeen: true }, seeded(7));
    expect(a).toEqual(b);
  });

  it(`uses every question when a theme has only ${MIN_QUESTION_TURNS}`, () => {
    const small: Pick<JuniorBank, 'themes' | 'questions'> = {
      themes: JUNIOR_BANK.themes,
      questions: JUNIOR_BANK.questions.filter((q) => q.themeId === 'moi').slice(0, MIN_QUESTION_TURNS),
    };
    const mission = buildMission(small, 'moi', { demoSeen: true }, seeded(3));
    expect(mission.turns.filter((t) => t.kind === 'question')).toHaveLength(MIN_QUESTION_TURNS);
  });

  it('refuses a theme that cannot make a mission', () => {
    const tooSmall = { themes: JUNIOR_BANK.themes, questions: JUNIOR_BANK.questions.slice(0, 3) };
    expect(() => buildMission(tooSmall, 'moi', { demoSeen: true })).toThrow(/needs 4/);
    expect(() => buildMission(JUNIOR_BANK, 'nope', { demoSeen: true })).toThrow(/Unknown/);
  });
});
