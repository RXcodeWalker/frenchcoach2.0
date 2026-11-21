/** How long the welcome stays before it leaves on its own. */
export const WELCOME_VISIBLE_MS = 5500;

/** The line under the greeting: the real streak when there is one, otherwise the plan. Pure, for tests. */
export function welcomeLine(streakDays: number): { text: string; streak: boolean } {
  if (streakDays >= 2) return { text: `${streakDays}-day streak. Keep it alive today.`, streak: true };
  if (streakDays === 1) return { text: '1-day streak. Practise today to make it two.', streak: true };
  return { text: "Your plan for today is ready when you are.", streak: false };
}
