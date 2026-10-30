import type { EndReason, GameMode, SessionCompletion } from './types';
import type { EmojiAnswerHistoryEntry } from './types';

/**
 * Emoji Master awards no XP for now (owner, 2026-10-30): nothing here, in the
 * run hook or on the results screen may call `completeMinigameSession`,
 * `dispatchAddXP` or write a Session. `noXp.test.ts` holds the line.
 */

/** Modes whose deck is a fixed list of words (so a retry round makes sense). */
export function isFixedLengthMode(mode: GameMode): boolean {
  return mode === 'classic' || mode === 'reverse' || mode === 'hardcore';
}

export interface BuildSessionCompletionInput {
  mode: GameMode;
  endReason: EndReason;
  modeScore: number;
  correctAnswers: number;
  totalAnswered: number;
  maxStreak: number;
  history: EmojiAnswerHistoryEntry[];
  isRetry?: boolean;
}

export function buildSessionCompletion(
  input: BuildSessionCompletionInput
): SessionCompletion {
  return { ...input, isRetry: input.isRetry ?? false };
}

/** Distinct words missed in a run, in the order first missed. */
export function missedQuestionIds(history: readonly EmojiAnswerHistoryEntry[]): string[] {
  const ids: string[] = [];
  for (const h of history) {
    if (!h.isCorrect && !ids.includes(h.questionId)) ids.push(h.questionId);
  }
  return ids;
}
