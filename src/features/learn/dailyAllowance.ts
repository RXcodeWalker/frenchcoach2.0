// Launch limit (owner decision, 2026-10-24): 3 AI-marked Learn answers per account per day.
// The server enforces it (backend `learn_answer`, GET /api/learn/allowance); this is only
// what the setup screen says and how long a session is. Follow-up answers count too: each
// one is an AI-marked answer.

/** The number the server's ai_quota_limits row holds; used when the allowance can't be read. */
export const LEARN_ANSWERS_PER_DAY = 3;

export const LEARN_DAILY_LIMIT_MESSAGE =
  `You've used today's ${LEARN_ANSWERS_PER_DAY} AI-marked answers. Come back tomorrow for more.`;

/**
 * How many questions a session gets: the answers left today (unknown → the daily number),
 * never more than the questions that could be built.
 */
export function dailySessionLength(answersLeft: number | null, built: number): number {
  return Math.max(0, Math.min(built, answersLeft ?? LEARN_ANSWERS_PER_DAY, LEARN_ANSWERS_PER_DAY));
}
