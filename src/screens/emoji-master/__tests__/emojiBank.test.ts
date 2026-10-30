import { describe, it, expect } from 'vitest';
import { EMOJI_QUESTIONS } from '../../../data/emojiQuestions';
import { MIN_POOL_SIZE } from '../types';

describe('emoji question bank', () => {
  it('has unique ids', () => {
    const ids = EMOJI_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists four distinct options and the answer is one of them', () => {
    for (const q of EMOJI_QUESTIONS) {
      expect(q.options, q.id).toHaveLength(4);
      expect(new Set(q.options).size, q.id).toBe(4);
      expect(q.options, q.id).toContain(q.french);
    }
  });

  it('never repeats an emoji prompt', () => {
    const emojis = EMOJI_QUESTIONS.map((q) => q.emojis);
    expect(new Set(emojis).size).toBe(emojis.length);
  });

  it('fills every field', () => {
    for (const q of EMOJI_QUESTIONS) {
      expect(q.emojis.trim(), q.id).not.toBe('');
      expect(q.french.trim(), q.id).not.toBe('');
      expect(q.english.trim(), q.id).not.toBe('');
    }
  });

  it('has enough in every category for a topic run, at more than one difficulty', () => {
    const cats = new Set(EMOJI_QUESTIONS.map((q) => q.category));
    expect(cats.size).toBe(6);
    for (const cat of cats) {
      const inCat = EMOJI_QUESTIONS.filter((q) => q.category === cat);
      expect(inCat.length, cat).toBeGreaterThanOrEqual(MIN_POOL_SIZE);
      expect(new Set(inCat.map((q) => q.difficulty)).size, cat).toBeGreaterThan(1);
    }
  });

  it('writes sentence prompts as full sentences', () => {
    for (const q of EMOJI_QUESTIONS.filter((q) => q.category === 'sentences')) {
      expect(q.french.split(' ').length, q.id).toBeGreaterThan(2);
    }
  });
});
