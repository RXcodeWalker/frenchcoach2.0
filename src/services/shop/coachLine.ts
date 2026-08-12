/**
 * Shop plan §9: "One slot, read-only, inside the Shop." Pure function over
 * the existing DailyPlan (getDailyPlan()) plus Shop-local state — resolves
 * to exactly one line, in the documented priority order. Never recommends a
 * purchase outside /shop (caller-enforced: this only runs inside Shop.tsx).
 */

import type { DailyPlan } from '../../types/coach';

export interface NearestUnlockCandidate {
  /** Display name, resolved by the caller from shopCatalogue.ts (presentation stays out of this pure function). */
  name: string;
  ratio: number;
}

export interface CoachLineInput {
  dailyPlan: DailyPlan | null;
  hasStreakFreeze: boolean;
  streakDays: number;
  daysUntilExam: number | null;
  /** Locked items with live requirement progress (§15 Phase 5), for the "nearest unlock" fallback. */
  lockedCandidates: NearestUnlockCandidate[];
}

export function computeCoachLine(input: CoachLineInput): string | null {
  const { dailyPlan, hasStreakFreeze, streakDays, daysUntilExam, lockedCandidates } = input;
  const urgency = dailyPlan?.urgency ?? 'none';

  if (urgency === 'streak_at_risk' && !hasStreakFreeze) {
    return `Your ${streakDays}-day streak is at risk today. A Streak Freeze covers it.`;
  }

  if (urgency === 'exam_soon') {
    const days = daysUntilExam ?? 0;
    return `Exam in ${days} day${days === 1 ? '' : 's'}. A Focus Token lets you drill your weakest topic instead of today's plan.`;
  }

  if (urgency === 'overdue_review') {
    return 'Skills going stale. A Focus Token lets you drill your weakest topic as review.';
  }

  const nearest = [...lockedCandidates].sort((a, b) => b.ratio - a.ratio)[0];
  if (nearest && nearest.ratio > 0) {
    return `Keep going — you're closest to unlocking ${nearest.name}.`;
  }

  return null;
}
