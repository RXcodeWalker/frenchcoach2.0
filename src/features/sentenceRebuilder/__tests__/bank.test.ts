import { describe, expect, it } from 'vitest';
import { REBUILD_QUESTIONS } from '../../../data/rebuildQuestions';
import { SKILL_TO_THEME } from '../../../domain/microDrill/skillThemes';
import { ROUND_LENGTH, acceptedOrders, poolFor, sentenceWords, tokenKey } from '../engine';

/**
 * The sentence bank is authored data the game trusts: a wrong word in a
 * fragment list, or a decoy that happens to be right, silently marks a correct
 * answer wrong. These tests keep it honest.
 */
describe('Sentence Rebuilder bank', () => {
  it('has unique ids and the fields the game needs', () => {
    expect(new Set(REBUILD_QUESTIONS.map(q => q.id)).size).toBe(REBUILD_QUESTIONS.length);
    for (const q of REBUILD_QUESTIONS) {
      expect(q.english.trim(), q.id).not.toBe('');
      expect(q.explanation.trim(), q.id).not.toBe('');
      expect(q.theme.trim(), q.id).not.toBe('');
      expect([1, 2, 3], q.id).toContain(q.difficulty);
    }
  });

  it('has a full round at every level', () => {
    for (const level of ['starter', 'standard', 'stretch', 'mixed'] as const) {
      expect(poolFor(level, REBUILD_QUESTIONS).length, level).toBeGreaterThanOrEqual(ROUND_LENGTH);
    }
  });

  it('keeps every tile a single word, so a tile is always one thing to tap', () => {
    for (const q of REBUILD_QUESTIONS) {
      for (const f of [...q.fragments, ...(q.distractors ?? [])]) {
        expect(f, `${q.id}: "${f}"`).toMatch(/^\S+$/u);
      }
    }
  });

  it('spells the sentence exactly as its fragments do', () => {
    for (const q of REBUILD_QUESTIONS) {
      const words = sentenceWords(q.french.replace(/\.$/u, '')).map(tokenKey);
      expect(words, q.id).toEqual(q.fragments.map(tokenKey));
    }
  });

  it('lists alternatives that use exactly the same words', () => {
    for (const q of REBUILD_QUESTIONS) {
      const main = [...acceptedOrders(q)[0]].sort();
      for (const order of acceptedOrders(q).slice(1)) {
        expect([...order].sort(), `${q.id}: ${order.join(' ')}`).toEqual(main);
      }
    }
  });

  it('gives every sentence one or two decoys that are not words of the sentence', () => {
    for (const q of REBUILD_QUESTIONS) {
      expect(q.distractors?.length, q.id).toBeGreaterThanOrEqual(1);
      expect(q.distractors?.length, q.id).toBeLessThanOrEqual(2);
      const own = new Set(q.fragments.map(tokenKey));
      for (const d of q.distractors ?? []) expect(own.has(tokenKey(d)), `${q.id}: decoy "${d}"`).toBe(false);
    }
  });

  it('keeps the themes the Micro Drill depends on', () => {
    const themes = new Set(REBUILD_QUESTIONS.map(q => q.theme));
    for (const [skill, wanted] of Object.entries(SKILL_TO_THEME)) {
      for (const t of wanted) expect(themes.has(t), `${skill} → ${t}`).toBe(true);
    }
  });
});
