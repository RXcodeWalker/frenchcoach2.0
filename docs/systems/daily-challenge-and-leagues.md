# Daily Challenge and Leagues

Live specification (relaunched 2026-11-26). Code cites it as `daily-challenge-and-leagues §N`; never renumber sections.
Backend migrations `20261126090000_daily_challenge_and_leagues_relaunch.sql` and
`20261126090100_daily_challenge_bank_seed.sql`; SQL spec `backend/supabase/tests/plain_pg/daily_challenge_and_leagues_test.sql`.

## §1 Why this design

Both features shipped in August 2026 and never went live (flags `coming-soon`). Three problems:

1. **The Daily Challenge was a full Exam Sim.** `POST /score` charges `exam_attempt`, and the launch limit is one exam per
   7 days, so a "daily" challenge could be played once a week, and each play cost a full AI marking.
2. **Leagues ranked forgeable XP.** `submit_xp_event` accepted any client-claimed amount up to 3000 a day. One forged
   client wins every league.
3. **Leagues depended on a Monday cron that has never run** (the workflow secrets were never set — `topology.md`), and the
   design pre-built cohorts from every profile with a username: inactive groups, and anyone joining mid-week saw "Not ranked
   yet" for up to six days. The roster view was a definer-rights view (bypassed RLS, exposed user ids).

The relaunch makes the server own everything and makes nothing depend on a cron.

## §2 Daily Challenge (`/daily-challenge`, flag `dailyChallenge`)

### §2.1 The format

Eight French sentences to rebuild from word tiles (decoys included), the same for everyone on a **UTC day** (the shared
day stays UTC: `src/lib/localDay.ts` rule). One try per sentence; the model sentence and its rule are shown straight after.
Ranked by right answers, then time. No AI call, no quota, no exam allowance. It needs a connection (`needsConnection`).

### §2.2 The bank

The items are the Sentence Rebuilder's curated sentences (`src/data/rebuildQuestions.ts`), turned into server rows by
`src/features/dailyChallenge/bank.ts` (tile display text, a comparison key per tile — the rebuilder's own `tokenKey` — and
every accepted order as keys, `alternatives` included). The seed is a generated migration:
`npm run daily-challenge:seed -- <14-digit timestamp>` writes `<timestamp>_daily_challenge_bank_seed.sql`; the newest such
file defines the whole bank (upsert + deactivate the rest, never delete — past sets name them).
`dailyChallenge.test.ts` fails when the newest seed does not match the bank. Editing a rebuild sentence therefore changes the
Daily Challenge too: ship a new seed migration with it.

The screen never imports `bank.ts`, the rebuild sentences or the rebuilder engine (a test pins it): the client receives
shuffled tiles from the server and never holds an answer key. Honest limit: the same sentences are in the Sentence
Rebuilder's chunk, so a determined cheater can look an answer up. That is bounded by §2.4, not prevented.

### §2.3 Server flow (all `SECURITY DEFINER`, `authenticated` only)

- `daily_challenge_today()` — state; no items until started. Builds today's set if missing.
- `daily_challenge_start()` — starts the server clock (one run per account per day; a second start keeps the first time)
  and reveals the items. Tiles are shown in a per-item, per-day deterministic shuffle (`_daily_challenge_perm`).
- `daily_challenge_answer(date, position, tiles)` — `tiles` are display positions in the order placed. Marked once
  (jsonb array equality against the accepted orders; containment is order-blind and must never be used), stored, final;
  a repeat returns the stored mark. The last answer finishes the run.
- `daily_challenge_board(scope, date)` — top 50 + the caller, `global` (visibility `global`) or `friends` (accepted
  friends with visibility `global`/`friends`), the caller's blocks hidden, no user ids (`is_me`). Up to 30 days back.

The set: 8 items, difficulty quotas 3/4/1, easiest first, avoiding the previous 4 days' items while the pool allows
(`_daily_challenge_ensure_set`, built by the first request of the day and by the 6-hourly seed workflow).

### §2.4 Anti-cheat and XP

- Time is the server's: started_at to the last answer; a run has 20 minutes, after which it closes with what was answered
  (unanswered = wrong) on the next read or answer.
- A run faster than 3 s per item is **flagged**: no XP, not ranked, the learner is told. UNVALIDATED threshold.
- XP = 10 + 5 per right answer (max 50), written by `award_xp` (source `daily_challenge`, server-only) with the key
  `<uid>:daily_challenge:<date>` — the same key the retired exam path used, so one award per account per day whatever the
  path. It enters the ledger, so it counts towards this week's league (and joins it, §3.2). It is not added to the local
  XP total (same as the Mystery Box): the ledger is the authority.
- The streak is consecutive UTC days with a finished run, alive until a day is missed.
- The exam-based `start_daily_challenge`/`submit_daily_challenge_attempt` are revoked from clients; ExamMode's Daily
  Challenge branch is removed. Their tables keep any history.

## §3 Leagues (`/league`, flag `league`)

### §3.1 Tiers

Bronze → Silver → Gold → Platinum → Diamond (`profiles.league_tier`, NULL = Bronze, server-written only). Weeks are UTC ISO
weeks (`xp_events.week_key`), ending Monday 00:00 UTC.

### §3.2 Joining

A learner joins this week's league when their first positive XP of the week lands — an AFTER INSERT trigger on
`xp_events` (`_league_on_xp_event` → `_league_join`), whatever wrote it (`submit_xp_event`, `award_xp`). `get_my_league()`
also joins a learner with XP but no membership (e.g. they set a username afterwards). Eligible: a username and
`leaderboard_visibility = 'global'`. Placement, under a per-week advisory lock: an open cohort of the learner's own tier
(cap 30), else an adjacent tier's cohort under 10 members (a quiet week merges instead of leaving someone alone), else a new
cohort. The trigger never blocks or fails the XP write (exceptions are swallowed; the rollover is only *tried*).

### §3.3 Rollover

`_league_rollover` finalizes every past week with unfinalized memberships, oldest first, under the global league lock. It
runs from the Monday workflow (`assign_weekly_league_cohorts`, name kept), from every `get_my_league()` call, and is tried
without waiting from the join trigger. A missed cron heals on the next read. Late XP (the ledger accepts `occurred_at` up to
48 h back) that lands after its week was finalized does not change that week.

### §3.4 Finalization and zones

Only members with XP > 0 are ranked (ties: earlier joiner). `_league_zones(active)` is the single rule, used by both
finalization and `get_my_league` (the screen draws only what it is told — `leagueView.ts` reads the counts, never computes
them): promote the top 20% (at least 1), each needing a 50-XP week; a group of 1–2 promotes its leader only with 150 XP;
demote the bottom 20% (at least 1) only with 5+ active members. Diamond never promotes, Bronze never demotes. Moves are one
tier, relative to the learner's own `standing_tier` (not a merged group's label). All numbers UNVALIDATED.

### §3.5 Reads are RLS-safe

`get_my_league()` is the only cross-user league read: scoped by `auth.uid()`, no user ids, members whose visibility is no
longer `global` are hidden from others (still ranked). `league_cohort_roster` and `daily_challenge_leaderboard` (definer
views granted wide, with user ids) are dropped. League tables are not readable by clients except a learner's own
`league_memberships` rows.

### §3.6 Screen

States: signed out, `needs_username` (opens `UsernameSetupModal`), `not_global` (points to Profile), `not_joined` (how to
earn the first XP), `active` (tier, rank, XP this week, time left, a standing line, the tier ladder, the group table with
promotion/drop zone dividers). Last week's result card (promoted / moved down / stayed) shows until "Got it" (local key
`leagueOutcomeSeen`, a week key only). Before the migration is applied both screens say "being switched on" (PGRST202).

## §4 XP ledger anti-cheat

`submit_xp_event` now applies `xp_source_limits` (service-only table): a per-event maximum and a rolling-24 h maximum per
source, set from what the app can honestly award with ~2× headroom (e.g. `practice` 80/800; computeXPGain tops out at 39),
and a 1500 overall rolling cap. Sources that award no XP by owner decision (`word_drop`, `sentence_rebuilder`,
`emoji_master`) and the mock `challenge` screen are 0. An over-limit event is **clamped**, never refused (stored with the
allowed amount and `metadata.claimed_amount`, or not stored when nothing is left), and the RPC answers ok (`capped: true`) —
a refusal would sit in the client's queue and retry for 90 days. A new client XP source needs a row there, or it is worth 0.
Server sources (`award_xp`) are not capped. Limits are UNVALIDATED product numbers.

## §5 Analytics

`daily_challenge_started` (`streak`), `daily_challenge_finished` (`correct`, `total`, `duration_ms`, `flagged`, `xp`),
`league_viewed` (`status`, `tier`). Counts and enums only; at most a few per learner per day.
