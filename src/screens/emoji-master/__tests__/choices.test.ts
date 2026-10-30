import { describe, it, expect } from 'vitest';
import { EMOJI_QUESTIONS, type EmojiQuestion } from '../../../data/emojiQuestions';
import { classicChoices, reverseChoices, shuffle } from '../choices';
import { acceptableAnswers } from '../answers';
import { matchTypedAnswer } from '../../../features/minigames';

function seeded(seed = 7): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('shuffle', () => {
  it('keeps every item and does not touch the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, seeded());
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('classicChoices', () => {
  it('keeps the four options but does not always put the answer first', () => {
    const rng = seeded(3);
    const positions = new Set<number>();
    for (const q of EMOJI_QUESTIONS) {
      const choices = classicChoices(q, rng);
      expect([...choices].sort()).toEqual([...q.options].sort());
      positions.add(choices.indexOf(q.french));
    }
    expect(positions.size).toBe(4);
  });
});

describe('reverseChoices', () => {
  it('offers the right emoji once plus three other emoji, never a placeholder', () => {
    const rng = seeded(11);
    for (const q of EMOJI_QUESTIONS) {
      const choices = reverseChoices(q, EMOJI_QUESTIONS, rng);
      expect(choices, q.id).toHaveLength(4);
      expect(new Set(choices).size, q.id).toBe(4);
      expect(choices.filter((c) => c === q.emojis), q.id).toHaveLength(1);
      expect(choices, q.id).not.toContain('❓');
    }
  });

  it("never offers another emoji for the same French word as a wrong answer", () => {
    // The bank has two emoji for "le livre": either is right, so neither may be a distractor.
    const books = EMOJI_QUESTIONS.filter((q) => q.french === 'le livre');
    expect(books.length).toBeGreaterThan(1);
    const rng = seeded(5);
    for (let i = 0; i < 40; i++) {
      for (const q of books) {
        const choices = reverseChoices(q, EMOJI_QUESTIONS, rng);
        for (const other of books.filter((b) => b.id !== q.id)) expect(choices).not.toContain(other.emojis);
      }
    }
  });

  it('prefers the same category', () => {
    const food = EMOJI_QUESTIONS.find((q) => q.id === '1') as EmojiQuestion;
    const foodEmoji = new Set(EMOJI_QUESTIONS.filter((q) => q.category === 'food').map((q) => q.emojis));
    const choices = reverseChoices(food, EMOJI_QUESTIONS, seeded(2));
    expect(choices.every((c) => foodEmoji.has(c))).toBe(true);
  });
});

describe('acceptableAnswers', () => {
  it('accepts the ligature spelled oe and a hyphen typed as a space', () => {
    expect(matchTypedAnswer("l'oeuf", acceptableAnswers({ french: "l'œuf" }))).toBe(true);
    expect(matchTypedAnswer("L'ŒUF", acceptableAnswers({ french: "l'œuf" }))).toBe(true);
    expect(matchTypedAnswer('arc en ciel', acceptableAnswers({ french: 'arc-en-ciel' }))).toBe(true);
    expect(matchTypedAnswer("l'arc-en-ciel", acceptableAnswers({ french: "l'arc-en-ciel" }))).toBe(true);
  });

  it('still requires the article and ignores accents and case', () => {
    expect(matchTypedAnswer('chat', acceptableAnswers({ french: 'le chat' }))).toBe(false);
    expect(matchTypedAnswer('LE CHAT', acceptableAnswers({ french: 'le chat' }))).toBe(true);
    expect(matchTypedAnswer('la fusee', acceptableAnswers({ french: 'la fusée' }))).toBe(true);
  });

  it('is typeable for every word in the bank (every answer matches itself)', () => {
    for (const q of EMOJI_QUESTIONS) expect(matchTypedAnswer(q.french, acceptableAnswers(q)), q.id).toBe(true);
  });
});
