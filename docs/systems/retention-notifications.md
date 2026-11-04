# Retention notifications: daily nudges and the weekly progress email

Live specification. §-numbered sections are cited from code
(`docs/systems/retention-notifications.md §N`), so don't renumber them.

**Goal:** a returning-learner loop that doesn't rely on willpower. Every message says
something specific and true about *this* learner: their real streak, their real mistake,
their real week. It sends little, at the right time, and every link opens the exact thing it
mentions.

Built 2026-11-03. It replaces the Phase 4.3 generic nudges ("Don't lose your streak —
practice today"), which were generic because the server never knew the streak count.

| Piece | Where |
|---|---|
| Client mirror | `src/services/notifications/learnerSnapshot.ts` (pushed from `AppContext`) |
| Weekly email settings | `src/services/notifications/emailReportSettings.ts`, `src/features/notifications/WeeklyEmailSettings.tsx` (Profile) |
| Deep-link drill | `src/screens/FixDrill.tsx` (`/fix/:skillId`) |
| Unsubscribe | `src/screens/Unsubscribe.tsx` (`/unsubscribe?t=…`, App.tsx **and** PublicRoutes) |
| Decision + copy (pure, tested) | `scripts/scheduledJobs/retention/dailyNudge.ts`, `weeklyReport.ts`, `nudgeEmail.ts` |
| Sender | `scripts/scheduledJobs/sendNotifications.ts <daily_nudge\|weekly_report> [--dry-run]` |
| Schedule | `.github/workflows/notifications-streak-and-goal.yml` (hourly, both jobs) |
| Schema + RPCs | backend migration `20261104120000_retention_loop.sql` |
| Open tracking | `src/services/telemetry/notificationOpen.ts` → `notification_opened` |

## §1 What the server knows (the learner snapshot)

`learner_snapshots`, one row per account, **push-only from the client, never read back**
(the same one-way precedent as `profiles.daily_goal`). Local state stays authoritative.

- `streak_count`, `streak_last_date`: exactly what the app shows (`getStreakState()`).
  The app's streak and daily-goal days are the learner's **local calendar days**
  (`src/lib/localDay.ts`, since 2026-11-04), so the sender reasons in the learner's timezone
  for both the day and the send time.
- `streak_freezes`: 1 if a Streak Freeze is owned.
- `timezone`: the device's IANA zone, validated by the same trigger as `push_subscriptions`.
  This is also what gives email-only learners a timezone for the weekly email.
- `focus_*`: the coach's current recurring mistake, which is Learn's intervention-loop active
  problem (`getActiveProblem()`), only while its status is `active` ("monitoring" means a drill
  already went well, so we stop nagging). `focus_misses` counts that problem's evidence
  from the **last 7 days**, so "came back 3 times this week" is literally true. Label and hint
  come from `SKILL_DEFS`, and `focus_has_drill` from `hasMicroDrillForSkill`.

Pushed after sign-in hydration, 3 s after each new session (once the orchestrator has run
problem detection), on tab return, and after a `/fix` drill. It is skipped when nothing has
changed since the last push on that page load. A client that lies only lies to itself: the row
is used only to word that learner's own messages. It is deliberately **not**
`profiles.streak_days`, which stays out of the client UPDATE grant because leaderboards read it.

## §2 Daily nudge: one per day, at their hour

`get_daily_nudge_candidates()` returns learners who have a push subscription, have a
`notify_*` preference on, practised within the last 14 days, and have not had a nudge on this
local date. The SQL only gathers facts; `chooseDailyNudge()` decides.

**At most one nudge per learner per local day, across every variant.** The claim row is
`notif_type = 'daily_nudge'` with the chosen `variant`. The old design could send a streak
nudge *and* a goal nudge on the same day.

Timing:
- Quiet hours: nothing before 08:00 or after 21:59 local.
- Send hour = the learner's **habit hour** (their most common local session hour over 21 days),
  clamped to 09–20, default 18. People come back best at the time they already practise.
- A streak nudge goes out early if their day (and so the streak) ends within 4 hours.
- Nothing if they practised in the last 2 hours: they're using the app.
- Not chosen this hour means it's reconsidered next run, because the claim happens only after a
  nudge is chosen.
- **GitHub does not really run the job hourly.** On 2026-11-03 runs were about 8 h apart.
  Each run records itself in `notification_runs`, and the sender passes the recent median gap
  (`medianRunGapHours`, 1–12 h) as `runGapHours`. If the next run would land after 21:59 local,
  the nudge goes now. A streak nudge also goes now if the streak would end before the next run.
  With a reliable hourly trigger the gap reads ~1 h and the habit-hour timing is exact. With a
  sparse one, the learner is nudged earlier rather than never.

## §3 Which message (priority order)

| # | Variant | When | Example | Opens |
|---|---|---|---|---|
| 1 | `streak_at_risk` | streak ≥ 2, last day = yesterday (local), nothing today | "Your 12-day streak ends in 6 hours" / "One answer keeps it alive. Or spend 60 seconds on your past tense fix." | `/learn` |
| 1 | `streak_freeze` | last day = day before yesterday and a freeze is owned | "Your streak freeze saved yesterday" | `/learn` |
| 2 | `mistake_comeback` | active focus, ≥ 2 misses this week, has a drill, nothing today | "That past tense mistake keeps coming back" / "You slipped on it 3 times this week (passé composé / imparfait). A 60-second drill fixes it." | `/fix/tense_past` |
| 3 | `goal_almost` | 0 < today's answers < goal | "2 more answers to hit today's goal" | `/learn` |
| 4 | `goal_start` | nothing today, active yesterday or today | "Today's French: 3 answers, about 6 minutes" | `/learn` |
| 4 | `comeback` | gap of exactly 2, 4, 7 or 13 days | "It's been 4 days. One answer gets you back in" | `/learn` |

`notify_streak` gates variants 1; `notify_daily_goal` (shown as **Practice reminders**) gates
2–4. After 14 quiet days daily nudges stop, and the weekly email carries on.

Push payloads carry `tag: 'frenchcoach-daily'` (a newer nudge replaces an unread one) and a
4 h TTL. `public/sw.js` navigates an already-open tab to the deep link instead of just
focusing it. Email is only a fallback when every push subscription failed.

`/fix/:skillId` opens Learn's MicroDrill and closes the same intervention loop: it records an
intervention against the active problem, records the outcome, regenerates the recommendation
and pushes a fresh snapshot. Two good drills resolve the problem, and the nudges about it stop.
An unknown skill or one without a drill redirects to `/learn`.

## §4 Weekly progress email (learner + optional parent)

`get_weekly_report_candidates()` covers **Sunday 17:00 to Monday 09:59 in the learner's timezone**.
The first run inside that window sends, and it's claimed once per week (keyed on that Sunday).
The window is wide on purpose, so a sparse GitHub schedule cannot skip a week. The report
always covers the 7 days ending that Sunday.
It picks accounts active in the last 35 days that have the weekly email on (default on, with
no row) and/or an unsuppressed parent address. It creates their `email_report_settings` row
(for the unsubscribe tokens) and returns this week's and last week's aggregates over the 7
local days ending today.

Contents are built by `buildWeeklyEmail()`, and every number comes from the database:
- Headline and 7-day tick strip, answers, minutes, words spoken, XP (learner) or days
  practised (parent), and the most-practised topic.
- **Answer scores** only with ≥ 3 marked non-exam answers, and the trend only if last week also
  had ≥ 3. Thin data is left out, never shown as zero.
- **Your one fix for next week**: the focus mistake, with a "Fix it in 60 seconds" link to
  `/fix/:skillId`.
- **Exam practice**: "Your free sample speaking exam is ready" when the account has no
  `exam_attempt` grant in the last 7 UTC days (the same rule as the scoring service's
  allowance).
- Streak line only if the streak is still alive. On Sunday with nothing yet today it says
  "Practise today to keep it."
- Parent copy: written about the learner, with no XP and no app CTA. It adds "One easy way to
  help" (ask them three sentences about their weekend in French). An empty week is called a
  quiet week, honestly.

Settings (`email_report_settings`, own row, column grants so a client can never touch its
tokens): `weekly_report`, `parent_email` (lower-cased, CHECKed). A parent address can't be
the account's own. Changing `parent_email` rotates the parent token, so an old email's link
can never stop a new address.

Unsubscribe: every email links `/unsubscribe?t=<token>` and sends a `List-Unsubscribe` header.
`unsubscribe_email_report(uuid)` (anon-callable) returns `student` (turns the weekly email off;
Profile can turn it back on) or `parent` (adds the address to `email_suppressions`, so it stays
stopped even if it is added again). Any other token returns `unknown` and changes nothing.

All database values are HTML-escaped (the username, focus label and question text are
client-written). The emails are table layout with inline styles and the light palette from
`src/index.css`.

## §5 Measuring it

Every link carries `utm_source=nudge&utm_medium=push|email&utm_campaign=<variant or
weekly_report|weekly_fix|weekly_exam>`. UTM tags are the only query params analytics keeps.
`AnalyticsTracker` fires one `notification_opened {campaign, channel}` per page load opened
from such a link. Each `notifications_log` row records `variant` and `channel`
(`push`/`email`/`failed`). Open rate per variant = `notification_opened` count ÷ log rows for
that variant. Tune the copy and priority with that number, not guesses.

`sendNotifications.ts … --dry-run` prints what would go out this hour without claiming or
sending anything.

## §6 Known limits

- Streak days were UTC until 2026-11-04 (now local). A snapshot pushed before the switch can
  carry a UTC `streak_last_date` a day off; the next app open repairs it.
- The snapshot is as fresh as the last time the app was opened. If a push fails, the next
  push repairs it. A stale snapshot can only make the server *more* cautious (e.g. no streak
  nudge), never wrong about today's activity, which comes from `sessions`.
- Daily nudges need a push subscription. Email-only learners get only the weekly email, by
  design: a daily email nobody opted into hurts deliverability.
- A learner can type any parent address. The first email says why the parent is getting it,
  and one click stops it for good.
- The trigger is GitHub's scheduler, which runs this "hourly" job every few hours (§2). The
  logic copes, but habit-hour timing is only exact with a reliable hourly trigger (e.g. a
  Render cron job or Supabase `pg_cron` calling `workflow_dispatch`). That is the owner's call.
- One instance, sequential sends. That's fine at MVP scale. Re-check the runtime when
  candidates reach the thousands per hour.
