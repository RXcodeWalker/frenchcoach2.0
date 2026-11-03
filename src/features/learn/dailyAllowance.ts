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
 * never more than the questions that could be built. `dailyLimit` is the account's own
 * daily number — the free one unless the server says the account is Premium
 * (`learnDailyLimit`).
 */
export function dailySessionLength(answersLeft: number | null, built: number, dailyLimit = LEARN_ANSWERS_PER_DAY): number {
  return Math.max(0, Math.min(built, answersLeft ?? dailyLimit, dailyLimit));
}

/**
 * The daily number to cap by, from GET /api/learn/allowance: Premium's own limit for a
 * Premium account, otherwise the free number — a guest's backend allowance is the looser
 * per-IP guest cap, and a guest has only 3 free attempts in all, so it never widens it.
 */
export function learnDailyLimit(allowance: { limit: number; premium?: boolean } | null): number {
  return allowance?.premium === true ? allowance.limit : LEARN_ANSWERS_PER_DAY;
}

export function learnDailyLimitMessage(dailyLimit: number): string {
  return `You've used today's ${dailyLimit} AI-marked answers. Come back tomorrow for more.`;
}
