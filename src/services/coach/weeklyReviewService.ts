// ── Weekly review: storage half ─────────────────────────────────────────────────
//
// The review itself is the pure domain/coachOutcomes/weeklyReview.ts: what the
// coach planned last week, what the learner did, what measurably changed (real
// numbers from the outcome log only) and next week's focus (from the week plan).
// This module generates it once per local week (the first Home visit of a new
// Monday-to-Sunday week, lib/localDay.ts) and stores it.
//
// There is no readiness prediction: the old `examReadiness.predictedScore` was a
// made-up blend of an average and a mastery bias, and is gone.
//
// LOCAL ONLY, like the outcome log it reads: never synced, never sent in a request
// body, no analytics event. Removed by deleteMyAccount().

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { TOPICS } from '../../data/topics';
import {
  buildWeeklyReview,
  focusFromPlan,
  localWeekStart,
  parseWeeklyReview,
  type WeeklyReview,
} from '../../domain/coachOutcomes/weeklyReview';
import { emptyOutcomeLog } from '../../domain/coachOutcomes/outcomeLog';
import { observationFromCoachInput } from './coachOutcomeLog';
import { buildWeekPlan } from './weekPlan';
import type { CoachBrief, CoachInput } from './coachBrain';

/** The stored review, or null (none yet, or one written by an older shape). */
export function getLastWeeklyReview(): WeeklyReview | null {
  return parseWeeklyReview(storageGet<unknown>(STORAGE_KEYS.coachWeeklyReview, null));
}

/**
 * The review for the week that just ended, generated on the first call of each
 * local week and read back from storage after that. Never throws (Home works
 * without it). `input.outcomeLog` is already settled against the sessions on
 * record (coachBriefInput.ts).
 */
export function ensureWeeklyReview(input: CoachInput, brief: CoachBrief, now: Date = new Date()): WeeklyReview | null {
  try {
    const stored = getLastWeeklyReview();
    if (stored && stored.generatedWeek === localWeekStart(now)) return stored;
    const plan = buildWeekPlan(input, brief);
    const review = buildWeeklyReview({
      now,
      log: input.outcomeLog ?? emptyOutcomeLog(),
      sessions: observationFromCoachInput(input, now.getTime()).sessions,
      labels: {
        skill: input.skillLabel,
        topic: key => TOPICS.find(t => t.key === key)?.labelEn ?? key,
      },
      nextFocus: focusFromPlan(plan.days),
    });
    storageSet(STORAGE_KEYS.coachWeeklyReview, review);
    return review;
  } catch {
    return null;
  }
}

// ── Seen state ────────────────────────────────────────────────────────────────

/** The learner dismissed this week's review. */
export function markWeeklyReviewSeen(now: Date = new Date()): void {
  storageSet(STORAGE_KEYS.coachWeeklyReviewSeen, { weekKey: localWeekStart(now) });
}

export function hasSeenWeeklyReviewThisWeek(now: Date = new Date()): boolean {
  const stored = storageGet<{ weekKey: string } | null>(STORAGE_KEYS.coachWeeklyReviewSeen, null);
  return stored?.weekKey === localWeekStart(now);
}
