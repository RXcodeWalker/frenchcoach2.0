import type { EndReason, GameMode, SessionCompletion } from './types';
import type { EmojiAnswerHistoryEntry } from './types';

const MODE_MULT: Record<GameMode, number> = {
  classic: 1,
  reverse: 1,
  hardcore: 1.5,
  blitz: 1.25,
  arena: 1.25,
};

export interface ComputeXpInput {
  mode: GameMode;
  endReason: EndReason;
  correctAnswers: number;
  maxStreak: number;
}

export function computeXpAwarded({
  mode,
  endReason,
  correctAnswers,
  maxStreak,
}: ComputeXpInput): number {
  if (endReason === 'quit') return 0;

  const base = correctAnswers * 10;
  const streakBonus = Math.floor(maxStreak / 5) * 20;
  const modeMult = MODE_MULT[mode];
  const victoryBonus = endReason === 'victory' ? 50 : 0;
  return Math.floor((base + streakBonus) * modeMult + victoryBonus);
}

export interface BuildSessionCompletionInput {
  mode: GameMode;
  endReason: EndReason;
  modeScore: number;
  correctAnswers: number;
  totalAnswered: number;
  maxStreak: number;
  history: EmojiAnswerHistoryEntry[];
}

export function buildSessionCompletion(
  input: BuildSessionCompletionInput
): SessionCompletion {
  return {
    ...input,
    xpAwarded: computeXpAwarded({
      mode: input.mode,
      endReason: input.endReason,
      correctAnswers: input.correctAnswers,
      maxStreak: input.maxStreak,
    }),
  };
}
