import { describe, expect, it } from 'vitest';
import { chooseDailyNudge, hoursUntilLocalMidnight, medianRunGapHours, sendHour, trackedUrl, type DailyNudgeCandidate } from '../dailyNudge';

// Tuesday 2026-11-03 18:00 UTC; a London learner (UTC+0 in November).
const NOW = new Date('2026-11-03T18:00:00Z');

function cand(over: Partial<DailyNudgeCandidate> = {}): DailyNudgeCandidate {
  return {
    user_id: 'u1',
    email: 'u@example.com',
    timezone: 'Europe/London',
    local_date: '2026-11-03',
    local_hour: 18,
    notify_streak: true,
    notify_daily_goal: true,
    daily_goal: 3,
    today_count: 0,
    last_active: '2026-11-02T19:00:00Z',
    active_days_14: 9,
    habit_hour: 18,
    streak_count: 12,
    streak_last_date: '2026-11-02',
    streak_freezes: 0,
    focus_skill_id: null,
    focus_label: null,
    focus_hint: null,
    focus_misses: null,
    focus_last_missed_at: null,
    focus_has_drill: false,
    subscriptions: [{ endpoint: 'e', p256dh: 'p', auth_key: 'a' }],
    ...over,
  };
}

const FOCUS = { focus_skill_id: 'tense_past', focus_label: 'Past Tense', focus_hint: 'passé composé / imparfait', focus_misses: 3, focus_has_drill: true };

describe('chooseDailyNudge', () => {
  it('names the real streak and the hours left in their day', () => {
    const n = chooseDailyNudge(cand(), NOW)!;
    expect(n.variant).toBe('streak_at_risk');
    expect(n.title).toBe('Your 12-day streak ends in 6 hours');
    expect(n.path).toBe('/learn');
  });

  it('folds the tracked mistake into a streak nudge', () => {
    const n = chooseDailyNudge(cand(FOCUS), NOW)!;
    expect(n.variant).toBe('streak_at_risk');
    expect(n.body).toContain('past tense fix');
  });

  it('warns when a streak freeze covered yesterday', () => {
    const n = chooseDailyNudge(cand({ streak_last_date: '2026-11-01', streak_freezes: 1, last_active: '2026-11-01T19:00:00Z' }), NOW)!;
    expect(n.variant).toBe('streak_freeze');
    expect(n.body).toContain('12-day streak');
  });

  it('does not defend a streak that already broke', () => {
    const n = chooseDailyNudge(cand({ streak_last_date: '2026-11-01', last_active: '2026-11-01T19:00:00Z' }), NOW);
    expect(n?.variant).not.toBe('streak_at_risk');
  });

  it('waits for the habit hour, unless the streak day ends soon', () => {
    expect(chooseDailyNudge(cand({ local_hour: 14, habit_hour: 19 }), new Date('2026-11-03T14:00:00Z'))).toBeNull();
    // Habit hour 23 clamps to 20; at 20:00 local a London streak ends in 4 hours.
    const late = chooseDailyNudge(cand({ local_hour: 20, habit_hour: 23 }), new Date('2026-11-03T20:00:00Z'));
    expect(late?.title).toContain('in 4 hours');
    // US Pacific learner, 13:00 local: their own day has 11 h left — wait for the habit hour.
    expect(chooseDailyNudge(cand({ timezone: 'America/Los_Angeles', local_hour: 13, habit_hour: 19 }), new Date('2026-11-03T21:00:00Z'))).toBeNull();
  });

  it('goes early when GitHub will not run again before quiet hours or the streak deadline', () => {
    // 15:00 local, habit 19, next run ~8 h away (23:00, quiet) → send now.
    const at = new Date('2026-11-03T15:00:00Z');
    expect(chooseDailyNudge(cand({ local_hour: 15, habit_hour: 19, streak_count: 0 }), at)).toBeNull();
    expect(chooseDailyNudge(cand({ local_hour: 15, habit_hour: 19, streak_count: 0 }), at, { runGapHours: 8 })?.variant).toBe('goal_start');
    // Streak: 9 h left in their day, next run in 10 h → send now.
    expect(chooseDailyNudge(cand({ local_hour: 9, habit_hour: 19 }), at)).toBeNull();
    expect(chooseDailyNudge(cand({ local_hour: 9, habit_hour: 19 }), at, { runGapHours: 10 })?.variant).toBe('streak_at_risk');
  });

  it('respects quiet hours and recent activity', () => {
    expect(chooseDailyNudge(cand({ local_hour: 7 }), NOW)).toBeNull();
    expect(chooseDailyNudge(cand({ local_hour: 22 }), NOW)).toBeNull();
    expect(chooseDailyNudge(cand({ last_active: '2026-11-03T17:00:00Z', today_count: 0 }), NOW)).toBeNull();
  });

  it('respects the streak toggle', () => {
    const n = chooseDailyNudge(cand({ notify_streak: false }), NOW);
    expect(n?.variant).toBe('goal_start');
  });

  it('sends the mistake that keeps coming back, with a drill deep link', () => {
    const n = chooseDailyNudge(cand({ ...FOCUS, streak_count: 0, streak_last_date: null }), NOW)!;
    expect(n.variant).toBe('mistake_comeback');
    expect(n.title).toBe('That past tense mistake keeps coming back');
    expect(n.body).toBe('You slipped on it 3 times this week (passé composé / imparfait). A 60-second drill fixes it.');
    expect(n.path).toBe('/fix/tense_past');
  });

  it('skips a focus without a drill or with one miss', () => {
    expect(chooseDailyNudge(cand({ ...FOCUS, focus_has_drill: false, streak_count: 0 }), NOW)?.variant).toBe('goal_start');
    expect(chooseDailyNudge(cand({ ...FOCUS, focus_misses: 1, streak_count: 0 }), NOW)?.variant).toBe('goal_start');
  });

  it('pulls a part-done goal over the line', () => {
    const n = chooseDailyNudge(cand({ today_count: 1, last_active: '2026-11-03T09:00:00Z' }), NOW)!;
    expect(n.variant).toBe('goal_almost');
    expect(n.title).toBe("2 more answers to hit today's goal");
    expect(n.body).toBe("You've done 1 of 3. Finish while it's fresh.");
  });

  it('says nothing once the goal is met', () => {
    expect(chooseDailyNudge(cand({ today_count: 3, streak_last_date: '2026-11-03', last_active: '2026-11-03T09:00:00Z' }), NOW)).toBeNull();
  });

  it('tapers after a gap, then goes silent', () => {
    const away = (days: number) => chooseDailyNudge(cand({
      streak_count: 0, streak_last_date: null,
      last_active: new Date(NOW.getTime() - days * 86_400_000 - 3600_000).toISOString(),
    }), NOW);
    expect(away(2)?.variant).toBe('comeback');
    expect(away(2)?.title).toBe("It's been 2 days. One answer gets you back in");
    expect(away(3)).toBeNull();
    expect(away(4)?.variant).toBe('comeback');
    expect(away(5)).toBeNull();
    expect(away(7)?.variant).toBe('comeback');
    expect(away(13)?.variant).toBe('comeback');
  });

  it('respects the practice-reminder toggle', () => {
    expect(chooseDailyNudge(cand({ notify_daily_goal: false, streak_count: 0 }), NOW)).toBeNull();
  });
});

describe('helpers', () => {
  it('clamps the habit hour to the daytime band', () => {
    expect(sendHour(null)).toBe(18);
    expect(sendHour(6)).toBe(9);
    expect(sendHour(23)).toBe(20);
    expect(sendHour(15)).toBe(15);
  });

  it('estimates the real gap between sender runs', () => {
    expect(medianRunGapHours([])).toBe(1);
    expect(medianRunGapHours(['2026-11-03T15:39:50Z', '2026-11-03T07:25:29Z', '2026-11-03T00:14:41Z'])).toBeCloseTo(7.7, 1);
    expect(medianRunGapHours(['2026-11-03T10:00:00Z', '2026-11-03T10:20:00Z'])).toBe(1);
    expect(medianRunGapHours(['2026-11-01T00:00:00Z', '2026-11-03T00:00:00Z'])).toBe(12);
  });

  it('counts hours to the learner\'s own midnight', () => {
    expect(hoursUntilLocalMidnight(new Date('2026-11-03T18:00:00Z'), 'Europe/London')).toBe(6);
    expect(hoursUntilLocalMidnight(new Date('2026-11-03T18:00:00Z'), 'Asia/Kolkata')).toBe(0.5);
  });

  it('tags links with UTM params only', () => {
    expect(trackedUrl('https://app.test', '/fix/tense_past', 'push', 'mistake_comeback'))
      .toBe('https://app.test/fix/tense_past?utm_source=nudge&utm_medium=push&utm_campaign=mistake_comeback');
  });
});
