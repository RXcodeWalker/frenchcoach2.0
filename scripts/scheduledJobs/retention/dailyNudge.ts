/**
 * Daily nudge: pick ONE message for a learner today, or none.
 * Spec: docs/systems/retention-notifications.md §2–§3.
 *
 * Pure (no I/O, clock passed in) so every rule is unit-tested. The sender
 * (sendNotifications.ts) claims the day's `daily_nudge` slot only after this
 * returns a nudge, so a learner who is not due this hour is reconsidered next
 * hour.
 *
 * Day keys: the app counts streaks and the daily-goal ring on UTC dates
 * (analyticsService.ts dateKey(), Home.tsx's todayCount), so "practised
 * today" and "the streak ends" are UTC here too. Only the send time (quiet
 * hours, habit hour) uses the learner's own timezone.
 */

export interface DailyNudgeCandidate {
  user_id: string;
  email: string | null;
  timezone: string;
  local_date: string;
  local_hour: number;
  notify_streak: boolean;
  notify_daily_goal: boolean;
  daily_goal: number;
  today_count: number;
  last_active: string | null;
  active_days_14: number;
  habit_hour: number | null;
  streak_count: number;
  streak_last_date: string | null;
  streak_freezes: number;
  focus_skill_id: string | null;
  focus_label: string | null;
  focus_hint: string | null;
  focus_misses: number | null;
  focus_last_missed_at: string | null;
  focus_has_drill: boolean;
  subscriptions: { endpoint: string; p256dh: string; auth_key: string }[] | null;
}

export type NudgeVariant =
  | 'streak_at_risk'
  | 'streak_freeze'
  | 'mistake_comeback'
  | 'goal_almost'
  | 'goal_start'
  | 'comeback';

export interface Nudge {
  variant: NudgeVariant;
  title: string;
  body: string;
  /** App path (no origin, no tracking params). */
  path: string;
}

/** No nudge before 08:00 or after 21:59 local. */
export const QUIET_BEFORE_HOUR = 8;
export const QUIET_AFTER_HOUR = 21;
/** Send at the learner's usual practice hour, kept within a sane daytime band. */
export const HABIT_HOUR_MIN = 9;
export const HABIT_HOUR_MAX = 20;
export const DEFAULT_SEND_HOUR = 18;
/** A streak nudge goes out early when the (UTC) day ends sooner than this. */
export const STREAK_EARLY_HOURS = 4;
/** Someone who practised this recently is using the app — leave them alone. */
export const RECENTLY_ACTIVE_HOURS = 2;
/** A streak is worth defending from this many days. */
export const MIN_STREAK = 2;
/** After a missed day, nudge only on these days since last practice (tapering, then silence at 14). */
export const COMEBACK_DAYS = [2, 4, 7, 13] as const;
/** The gap assumed between sender runs when nothing better is known. */
export const DEFAULT_RUN_GAP_HOURS = 1;

export interface NudgeOptions {
  /**
   * Hours until the sender is expected to run again (the recent median gap —
   * GitHub runs the "hourly" schedule only every few hours). When the next run
   * would land after quiet hours start, or after the streak day ends, the
   * nudge goes now instead of never.
   */
  runGapHours?: number;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function hoursUntilUtcMidnight(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return (next - now.getTime()) / HOUR_MS;
}

export function sendHour(habitHour: number | null): number {
  if (habitHour === null || !Number.isFinite(habitHour)) return DEFAULT_SEND_HOUR;
  return Math.min(HABIT_HOUR_MAX, Math.max(HABIT_HOUR_MIN, Math.round(habitHour)));
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function hoursLeftPhrase(hours: number): string {
  const h = Math.floor(hours);
  if (h <= 1) return 'in about an hour';
  return `in ${h} hours`;
}

/** "Past Tense" → "past tense" (skill labels are common nouns, so mid-sentence they read lower-case). */
function lowerLabel(label: string): string {
  return label.toLowerCase();
}

interface Focus { id: string; label: string; hint: string | null; misses: number }

function focusOf(c: DailyNudgeCandidate): Focus | null {
  if (!c.focus_skill_id || !c.focus_label || !c.focus_has_drill) return null;
  const misses = c.focus_misses ?? 0;
  if (misses < 2) return null;
  return { id: c.focus_skill_id, label: c.focus_label.trim(), hint: c.focus_hint?.trim() || null, misses };
}

export function chooseDailyNudge(c: DailyNudgeCandidate, now: Date, opts: NudgeOptions = {}): Nudge | null {
  const gap = Math.max(DEFAULT_RUN_GAP_HOURS, Math.min(12, opts.runGapHours ?? DEFAULT_RUN_GAP_HOURS));
  if (c.local_hour < QUIET_BEFORE_HOUR || c.local_hour > QUIET_AFTER_HOUR) return null;

  const lastActiveMs = c.last_active ? Date.parse(c.last_active) : NaN;
  if (Number.isFinite(lastActiveMs) && now.getTime() - lastActiveMs < RECENTLY_ACTIVE_HOURS * HOUR_MS) return null;

  const today = utcDateKey(now);
  const yesterday = utcDateKey(new Date(now.getTime() - DAY_MS));
  const dayBefore = utcDateKey(new Date(now.getTime() - 2 * DAY_MS));
  const practisedToday = c.today_count > 0 || c.streak_last_date === today;
  const hoursLeft = hoursUntilUtcMidnight(now);
  // At their hour — or now, if the next run would only come after quiet hours begin.
  const atSendHour = c.local_hour >= sendHour(c.habit_hour) || c.local_hour + gap > QUIET_AFTER_HOUR;
  const focus = focusOf(c);

  // 1. Streak about to end.
  if (c.notify_streak && !practisedToday && c.streak_count >= MIN_STREAK && hoursLeft >= 1) {
    const alive = c.streak_last_date === yesterday;
    const frozen = c.streak_last_date === dayBefore && c.streak_freezes > 0;
    if ((alive || frozen) && (atSendHour || hoursLeft <= Math.max(STREAK_EARLY_HOURS, gap))) {
      const n = c.streak_count;
      const fix = focus ? ` Or spend 60 seconds on your ${lowerLabel(focus.label)} fix.` : '';
      if (frozen) {
        return {
          variant: 'streak_freeze',
          title: `Your streak freeze saved yesterday`,
          body: `Practise today or your ${n}-day streak ends ${hoursLeftPhrase(hoursLeft)}. One answer is enough.${fix}`,
          path: '/learn',
        };
      }
      return {
        variant: 'streak_at_risk',
        title: `Your ${n}-day streak ends ${hoursLeftPhrase(hoursLeft)}`,
        body: `One answer keeps it alive.${fix}`,
        path: '/learn',
      };
    }
  }

  if (!c.notify_daily_goal || !atSendHour) return null;

  // 2. The recurring mistake the coach is tracking — the most specific thing we know.
  if (focus && !practisedToday) {
    const hint = focus.hint ? ` (${focus.hint})` : '';
    return {
      variant: 'mistake_comeback',
      title: `That ${lowerLabel(focus.label)} mistake keeps coming back`,
      body: `You slipped on it ${plural(focus.misses, 'time')} this week${hint}. A 60-second drill fixes it.`,
      path: `/fix/${encodeURIComponent(focus.id)}`,
    };
  }

  const goal = Math.max(1, c.daily_goal);

  // 3. Part-way through today's goal — closest to the finish line, so the strongest pull.
  if (c.today_count > 0 && c.today_count < goal) {
    const left = goal - c.today_count;
    return {
      variant: 'goal_almost',
      title: `${plural(left, 'more answer')} to hit today's goal`,
      body: `You've done ${c.today_count} of ${goal}. Finish while it's fresh.`,
      path: '/learn',
    };
  }
  if (practisedToday) return null;

  // 4. Nothing yet today. Daily while the habit is live; tapering after a gap.
  const daysAway = Number.isFinite(lastActiveMs) ? Math.floor((now.getTime() - lastActiveMs) / DAY_MS) : Infinity;
  if (daysAway <= 1) {
    return {
      variant: 'goal_start',
      title: `Today's French: ${plural(goal, 'answer')}, about ${Math.max(2, goal * 2)} minutes`,
      body: 'Your next question is ready. Say it out loud, get feedback in seconds.',
      path: '/learn',
    };
  }
  if ((COMEBACK_DAYS as readonly number[]).includes(daysAway)) {
    return {
      variant: 'comeback',
      title: `It's been ${daysAway} days. One answer gets you back in`,
      body: c.active_days_14 >= 3
        ? `You practised on ${plural(c.active_days_14, 'day')} recently. Don't let that slip. A new streak starts with one answer.`
        : 'A new streak starts with one answer. It takes about two minutes.',
      path: '/learn',
    };
  }
  return null;
}

/** Median hours between consecutive past runs (newest first or any order); the default when fewer than 2. */
export function medianRunGapHours(ranAt: string[]): number {
  const t = ranAt.map(Date.parse).filter(Number.isFinite).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < t.length; i++) gaps.push((t[i] - t[i - 1]) / HOUR_MS);
  if (gaps.length === 0) return DEFAULT_RUN_GAP_HOURS;
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  return Math.max(DEFAULT_RUN_GAP_HOURS, Math.min(12, median));
}

/** Adds UTM tags (the only query params the app's analytics keep) so opens are measurable. */
export function trackedUrl(appUrl: string, path: string, medium: 'push' | 'email', campaign: string): string {
  const url = new URL(path, appUrl);
  url.searchParams.set('utm_source', 'nudge');
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}
