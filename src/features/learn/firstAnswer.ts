// The learner's first real Learn answer, ever. "First" is a claim, so it is
// said only when this device proves it: no earlier stored session, the answer
// really was marked, and it has not been said before (`firstsSeen`). Pure; the
// caller reads the history BEFORE recording the answer, and persists the id.

export const FIRST_ANSWER_ID = 'first-answer';

export function provesFirstAnswer(input: {
  priorSessions: number;
  firstsSeen: readonly string[];
  /** The answer was marked by the AI (not an offline placeholder). */
  marked: boolean;
}): boolean {
  return input.marked && input.priorSessions === 0 && !input.firstsSeen.includes(FIRST_ANSWER_ID);
}

/** Praise for the act, never the result: no score, grade or level. */
export function firstAnswerCopy(name?: string | null): { eyebrow: string; title: string; line: string } {
  const n = name?.trim();
  return {
    eyebrow: 'First answer in',
    title: n ? `You did it, ${n}!` : 'You did it!',
    line: 'Your very first answer is spoken and marked. The hardest one is behind you.',
  };
}
