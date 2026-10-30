import type { EmojiQuestion } from '../../data/emojiQuestions';

export type Rng = () => number;

/** Fisher–Yates on a copy. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Emoji → French choices. The authored `options` always list the answer in a
 * fixed slot, so they are shuffled per question (a learner would otherwise
 * find the pattern before the words).
 */
export function classicChoices(question: EmojiQuestion, rng: Rng = Math.random): string[] {
  return shuffle(question.options, rng);
}

/**
 * French → emoji choices: the right emoji plus distractors taken from other
 * words in the bank, same category first. The authored `options` are French
 * words and many have no emoji of their own, so they can't be reused here.
 * A distractor never shares the answer's French (the bank has two emoji for
 * "le livre") or its emoji.
 */
export function reverseChoices(
  question: EmojiQuestion,
  bank: readonly EmojiQuestion[],
  rng: Rng = Math.random,
  count = 4
): string[] {
  const others = bank.filter(
    (o) => o.id !== question.id && o.french !== question.french && o.emojis !== question.emojis
  );
  const ordered = [
    ...shuffle(others.filter((o) => o.category === question.category), rng),
    ...shuffle(others.filter((o) => o.category !== question.category), rng),
  ];
  const picks: string[] = [];
  for (const o of ordered) {
    if (picks.length >= count - 1) break;
    if (!picks.includes(o.emojis)) picks.push(o.emojis);
  }
  return shuffle([question.emojis, ...picks], rng);
}
