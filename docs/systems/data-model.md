# Data model

Deliberately not a catalogue of the ~35 tables / ~37 RPCs — that's discoverable in
`backend/supabase/migrations/`, read in date order, and the doc says so rather than duplicating
it. This covers four things: the privilege rule, the economy invariant, the session-binding
pattern, and the gotchas that reading migrations in date order won't surface on their own.

## 1. The privilege rule

Reads go direct under RLS. Any write with economic, competitive, or cross-user consequence goes
through a `SECURITY DEFINER` RPC. `service_role` is reserved for server-computed graded work and
cron/admin jobs — never given to a client.

A function's tier is readable from its grant footer, without opening the function body:

- **`GRANT EXECUTE ... TO authenticated`** — client-facing, e.g. `mint_gems`,
  `start_daily_challenge`, `submit_daily_challenge_attempt`.
- **`GRANT EXECUTE ... TO service_role`** (no `authenticated` grant at all) — server-only, e.g.
  `award_xp`, `seed_daily_challenge(s_batch)`, `assign_weekly_league_cohorts(_as_of)`,
  `consume_shadowing_coaching_quota` / `release_shadowing_coaching_grant` (the last two are called
  by FastAPI using the service-role key, with `p_user_id` sourced from an already-verified JWT).
- **No grant footer at all** — an acknowledged gap in a handful of early friendship RPCs
  (`send_friend_request`, `respond_friend_request`, `remove_friend`), which predate the convention
  of explicitly `REVOKE EXECUTE ... FROM PUBLIC` before granting (Postgres grants `EXECUTE` to
  `PUBLIC` by default unless revoked). A later migration's header documents this as the one
  hardening step that schema's earlier `SECURITY DEFINER` functions skipped. If you touch one of
  these functions, add the explicit revoke/grant pair rather than assuming the omission was
  intentional.

## 2. The economy invariant

- **`gem_events` is the sole balance authority.** Balance is always computed as
  `SELECT COALESCE(SUM(delta), 0) FROM gem_events WHERE user_id = ...` — every minting/spending RPC
  recomputes it this way rather than trusting a stored total. The table is append/read-only from
  the client's perspective (no client INSERT/UPDATE/DELETE policy); mutation is RPC-only, and the
  RPCs are `SECURITY DEFINER` owned by `postgres`, which bypasses grants on tables it owns.
- **`xp_events` is append-only** — enforced by the absence of `UPDATE`/`DELETE` policies, not by a
  trigger.
- **`submit_xp_event` is bounded ingestion, not anti-cheat.** Its own migration header says this
  explicitly: the submitted amount is still fully client-claimed: only *when* and *how fast*
  events can be submitted is bounded (a rolling 24-hour cap, not a calendar-day reset, plus a
  per-row range check). Amounts are client-claimed everywhere **except** where derived from
  `scoring_envelopes` — e.g. `submit_daily_challenge_attempt` and `mint_gems_from_envelope` both
  compute their XP/gem amount from the envelope's own `total` column server-side, never from a
  client-supplied parameter. When adding a new awarding path, match whichever of these two
  patterns actually applies — don't assume amount-bounding alone counts as anti-cheat.

## 3. The session-binding pattern

A `start_*` RPC reserves a server-minted session id before the graded attempt begins (e.g.
`start_daily_challenge` inserts `'daily-' || gen_random_uuid()`; `start_duel_attempt` inserts
`'duel-' || gen_random_uuid()`). The corresponding `submit_*` RPC refuses to award anything unless
the scoring envelope it's given carries that exact reserved session id — raising `session_not_bound`
otherwise. This is what stops an ordinary practice attempt (whose session id has a different
prefix, e.g. `exam-sim-<timestamp>`) from being replayed as a graded daily-challenge or duel
submission. Session binding is one check in a chain — both RPCs also independently verify content
provenance and question-set match before reaching the session check.

## 4. Gotchas migrations in date order won't tell you

- **A policy can look live but be unreachable because its `GRANT` was revoked in a later
  migration.** `xp_events`' original client-facing INSERT policy is never dropped, but a later
  hardening migration revokes `INSERT` from `authenticated`/`anon` and grants it to `service_role`
  only — the policy still exists in `pg_policies` and would mislead anyone who checks only the
  policy, not the grant. `profiles` has a related but narrower case: its whole-row `UPDATE` policy
  is still live, but the table-level grant was revoked and re-granted as a column-scoped list that
  excludes `gems`/`inventory`/`active_boosters`.
- **A GRANT and an RLS policy are independent layers**, and this schema has hit that gap in
  production, not just in theory: `backend/supabase/config.toml` disables `auto_expose_new_tables`
  (matching the modern Supabase cloud default), so a new table with a perfect per-user RLS policy
  and no explicit `GRANT` is silently 100% inaccessible via the Data API. A dedicated migration
  (`fix_missing_table_grants`) exists specifically because several tables shipped with correct RLS
  policies but no grant, surfacing client-side as a bare 401 on a `SECURITY INVOKER` function.
- **A column-level `REVOKE` does not narrow a pre-existing table-level `GRANT`.** One migration's
  own header documents a first attempt at restricting `profiles` writes that tried a column-scoped
  `REVOKE UPDATE (gems, inventory, ...)` alone — it didn't work, because the broader table-level
  grant from an earlier migration still stood. The fix required revoking the table-level grant
  first, then re-granting only the intended columns.
- **`award_xp` has no grant to `authenticated`/`anon` by design — do not "fix" that.** It is called
  only internally by other `SECURITY DEFINER` functions (`submit_daily_challenge_attempt`,
  `submit_duel_attempt`, …), which execute with their own owner-level privilege — PostgREST's
  grant-checking applies only to a direct RPC call over the API, never to an internal
  function-to-function call. Its migration header states this was a deliberate fix for an earlier
  design that *did* grant `authenticated` and would have let any logged-in user mint arbitrary XP
  directly. Adding `GRANT EXECUTE ... TO authenticated` here to silence a permission error reopens
  that hole.
- **`profiles.gems` is legacy, not dead.** It's still a real column (seeded at signup, still
  `SELECT`ed by `progressionSync.ts`, still rendered in `TopContextBar.tsx` and `Shop.tsx`), but it
  is no longer client-writable — the column-scoped `UPDATE` grant on `profiles` excludes it, and
  the frontend's own sync code treats the cloud value as a display cache it fetches but never
  merges authoritatively (`mergedGems = local.gems`). The real balance of record is always
  `gem_events`; anywhere in the app that shows a gem count is either reading that cache or was just
  updated from an RPC's `SUM(delta)` return value. Don't treat a `profiles.gems` read as the source
  of truth, and don't be surprised that writing it client-side fails with a permission error — that
  failure is intentional.

Everything else — specific policies, specific grants, the full RPC list — stays discoverable in
`backend/supabase/migrations/` and `backend/supabase/tests/*.test.mjs` (the executable spec of RPC
contracts). This doc explains the shape of the rules; it is never the source for one particular
policy or grant.
