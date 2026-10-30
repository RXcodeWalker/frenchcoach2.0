import { describe, expect, it } from 'vitest';
import { canonicalAnswer, isCorrectAnswer } from '../answer';
import { BOSS_BANK } from '../bank';
import { BOSSES } from '../bosses';

describe('the boss question bank', () => {
  it('has a bank for every boss and none extra', () => {
    expect(Object.keys(BOSS_BANK).sort()).toEqual(BOSSES.map((b) => b.id).sort());
  });

  it.each(BOSSES.map((b) => [b.id] as const))('%s: at least 20 well-formed questions', (id) => {
    const bank = BOSS_BANK[id];
    expect(bank.length).toBeGreaterThanOrEqual(20);
    for (const q of bank) {
      expect(q.english.trim(), q.id).not.toBe('');
      expect(q.french.length, q.id).toBeGreaterThan(0);
      expect(q.tip.trim().length, q.id).toBeGreaterThan(10);
      expect(q.id.startsWith(id === 'past_tense' ? 'p' : id[0]), q.id).toBe(true);
    }
  });

  it('has unique ids and no sentence asked twice, across every boss', () => {
    const all = Object.values(BOSS_BANK).flat();
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    expect(new Set(all.map((q) => q.english.toLowerCase())).size).toBe(all.length);
  });

  it('accepts its own model answer, and every listed alternative', () => {
    for (const q of Object.values(BOSS_BANK).flat()) {
      for (const french of q.french) expect(isCorrectAnswer(q, french), `${q.id}: ${french}`).toBe(true);
    }
  });

  it('does not let one question accept another question’s answer', () => {
    const all = Object.values(BOSS_BANK).flat();
    for (const a of all) {
      for (const b of all) {
        if (a.id === b.id) continue;
        expect(isCorrectAnswer(a, b.french[0]), `${a.id} accepts the answer to ${b.id}`).toBe(false);
      }
    }
  });
});

describe('isCorrectAnswer', () => {
  const q = { french: ['Elle n’a qu’une sœur.'] as const };

  it('ignores case, accents, punctuation and the apostrophe style', () => {
    expect(isCorrectAnswer(q, "elle n'a qu'une soeur")).toBe(true);
    expect(isCorrectAnswer(q, 'ELLE N’A QU’UNE SŒUR.')).toBe(true);
  });

  it('reads French spacing before ! and ? like no space', () => {
    const cmd = { french: ['Ne mange pas ça !'] as const };
    expect(isCorrectAnswer(cmd, 'ne mange pas ca')).toBe(true);
    expect(isCorrectAnswer(cmd, 'Ne mange pas ça !')).toBe(true);
  });

  it('reads a hyphen as a space either way', () => {
    const imp = { french: ['Avant que tu partes, appelle-moi.'] as const };
    expect(isCorrectAnswer(imp, 'avant que tu partes appelle moi')).toBe(true);
    expect(isCorrectAnswer(imp, 'avant que tu partes, appelle-moi')).toBe(true);
  });

  it('still marks a wrong word wrong, and an empty answer wrong', () => {
    expect(isCorrectAnswer(q, 'Elle n’a qu’un frère.')).toBe(false);
    expect(isCorrectAnswer(q, '')).toBe(false);
    expect(isCorrectAnswer(q, '  ! ')).toBe(false);
  });

  it('collapses whitespace', () => {
    expect(canonicalAnswer('  Je   mange  ')).toBe('je mange');
  });
});
