# Child safety & guardian consent

How French 2.0 handles the fact that some users are under 13. See
[`docs/decisions/0006-under-13-guardian-consent-model.md`](../decisions/0006-under-13-guardian-consent-model.md)
for the rationale and the explicitly-deferred counsel items — this file is
the how, that ADR is the why.

## The three concepts, kept separate

| Concept | Mechanism | Where it lives |
|---|---|---|
| Browser mic permission | a normal one-click `getUserMedia` prompt | the browser itself — never labelled as consent anywhere in this app's UI |
| FrenchCoach data-processing consent | ToS/Privacy acceptance | signup, all users, regardless of age |
| Parental/guardian consent | email-plus, under-13 only | `profiles.consent_status` + `guardian_consents` |

Never conflate these in code comments, UI copy, or docs. In particular:
"guardian confirmation" (this app's term) is not asserted to be legally
sufficient "verifiable parental consent" for any jurisdiction — see the ADR.

## Data model

- `profiles.age_band` — `'under_13' | '13_plus' | null`. `null` means the
  one-time age-band step hasn't run yet. Service-role/RPC write only.
- `profiles.consent_status` — `'13_plus_not_required' | 'pending' | 'granted' | 'revoked'`.
  Defaults to `'13_plus_not_required'` so every pre-Phase-1.6 row reads as
  "no gate," never `NULL`. Service-role/RPC write only.
- `guardian_consents` — one row per consent request: `child_user_id`,
  `guardian_email`, `method` (currently always `'email_plus'` — the seam for
  a future stronger provider), `token_hash` (sha256 of the raw token — the
  raw token is never persisted), `requested_at`/`granted_at`/`revoked_at`,
  `evidence` (jsonb — currently just the guardian's self-reported
  relationship). RLS: child reads own rows; every write goes through an RPC.

Migration: `backend/supabase/migrations/20260911110000_guardian_consent.sql`.

## RPCs

All `SECURITY DEFINER`, pinned `search_path`, standard `REVOKE ... FROM PUBLIC` / `GRANT EXECUTE TO ...` pattern.

- **`set_age_band(p_band)`** — `authenticated` only, one-time (errors
  `age_band_already_set` on a second call). Sets `age_band` and the initial
  `consent_status` (`'pending'` for `under_13`, `'13_plus_not_required'`
  otherwise).
- **`correct_age_band(p_band)`** — `authenticated` only, the Profile-settings
  "I mis-selected my age band" correction path, added alongside `set_age_band`
  rather than relaxing its one-time check (that check stays exact for the
  onboarding flow). Requires `age_band` to already be set (`age_band_not_set`
  otherwise) and rejects a no-op call (`age_band_unchanged`). Same
  `consent_status` transition as `set_age_band`. `under_13 → 13_plus` is a
  deliberate, product-confirmed instant/self-serve change — no
  re-verification, no guardian involvement — so an under-13 account can
  remove its own guardian gate with one client-side action; `13_plus →
  under_13` flips `consent_status` back to `'pending'`, and the client
  follows up with the existing `request_guardian_consent` flow to re-arm
  guardian confirmation.
- **`request_guardian_consent(p_guardian_email)`** — `authenticated` only,
  callable only when the caller's own `age_band = 'under_13'` (errors
  `not_under_13` otherwise). Mints a `guardian_consents` row + a random
  token (`pgcrypto.gen_random_bytes`, stored only as its sha256 hash) and
  returns the *raw* token to the caller once — the client hands it to the
  email-send step or a copy-link fallback. Does not itself change
  `consent_status` (already `'pending'` from `set_age_band`).
- **`grant_guardian_consent(p_token, p_relationship)`** — `authenticated`
  **and** `anon` (a guardian is not expected to hold an account). Looks up
  the most recent non-granted, non-revoked row by the token's hash; errors
  `invalid_or_used_token` if none matches (covers both "never existed" and
  "already used" — no distinction is leaked). On success, stamps
  `granted_at` + the guardian's stated relationship, and flips the child's
  `consent_status` to `'granted'`.
- **`revoke_guardian_consent(p_child_user_id)`** — `authenticated` and
  `anon`. Requires an active (granted, not yet revoked) consent row for that
  child. Flips `consent_status` to `'revoked'` **and** deletes the child's
  `profiles` row in the same call — revocation means stop processing *and*
  erase, not two separate guardian actions.
- **`export_my_data(p_subject_user_id default null)`** /
  **`delete_my_account(p_subject_user_id default null)`** (Phase 1.6 Part B,
  extended here) — when `p_subject_user_id` names someone other than the
  caller, requires an active `guardian_consents` row linking the caller
  (matched by their own `auth.users.email`) to that child; otherwise errors
  `not_guardian_of_subject` (`42501`). Every existing call site (passing no
  argument) is unaffected.

## Client enforcement

- **`AgeBandCheck`** (`src/components/AgeBandCheck.tsx`) — mirrors
  `OnboardingCheck`'s redirect-to-a-one-time-step pattern, but runs *ahead*
  of it (`App.tsx`: `AgeBandCheck` wraps `OnboardingCheck`). Redirects a
  signed-in user with `age_band === null` to `/age-band`. No-ops for guests
  (no `profiles` row to gate) and while `consentStatus === 'unknown'`
  (still loading). `OnboardingCheck` itself exempts `/age-band` from its own
  redirect so the two gates don't loop against each other.
- **`AgeBand.tsx`** — the band-select screen, the under-13 persuasion
  interstitial, and the guardian-email step, in one component keyed by a
  local `Step` state machine. This is the one-time onboarding step only
  (`set_age_band`); it is not reused for later correction.
- **`Profile.tsx`**'s "Age Band" card — the later correction UI
  (`correct_age_band`), separate from `AgeBand.tsx`. Shows the current band
  and consent status; `under_13 → 13_plus` is a single button with no
  confirmation step; `13_plus → under_13` opens an inline guardian-email
  form (same `requestGuardianConsent` / `sendGuardianConsentEmail` /
  `buildGuardianConsentLink` calls `AgeBand.tsx` uses) before re-arming the
  guardian gate.
- **`SpeakingConsentGate`** (`src/components/SpeakingConsentGate.tsx`) —
  wraps a record control; renders a "waiting for your parent/guardian"
  message instead of it whenever `consentStatus === 'pending'`. Wired into
  Learn, ExamMode, RoleplaySession, StoryMode, ScenarioArchitectSession, and
  DailyNewsFlash — either directly around the record button (Learn,
  ScenarioArchitectSession, DailyNewsFlash) or around the pre-recording prep
  screen that leads into a timed/auto-recording flow (ExamMode's `intro`
  state, RoleplaySession's/StoryMode's prep screens).
- **`useRecording(blocked)`** — defence-in-depth behind the UI gate:
  `start()` is a no-op (no `getUserMedia`, no `SpeechRecognition`) when
  `blocked` is true. Every screen above passes
  `consentStatus === 'pending'` as `blocked`. Not wired into
  `useAudioBlobRecorder` (`SayItAgainCard.tsx`'s practice-step recorder) or
  `SpeakingArena`/`SpeedSpeaking` — a known gap, not yet covered by this
  phase.
- **`GuardianConsent.tsx`** (`/guardian-consent`, `PublicRoutes`-only, no
  `App.tsx` route — a guardian is never a signed-in app user) — the landing
  page a guardian opens from the emailed/copied link. Shows what's
  collected and which subprocessors are involved, collects a stated
  relationship, calls `grant_guardian_consent`.

## Email delivery

`request_guardian_consent` only mints the row/token — it cannot send email
(RPCs can't). The client calls `POST /api/consent/send-guardian-email`
(`backend/main.py`) with the child's own JWT, the token, and the guardian's
email; that endpoint sends via plain SMTP (`smtplib`, stdlib — no new
dependency) using `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM`/`APP_ORIGIN`
env vars. **Unconfigured by default** — `supabase/config.toml`'s
`auth.email.smtp` is commented out and there is no other mail-sending
infrastructure anywhere in this codebase. With SMTP unset, the endpoint
503s and `AgeBand.tsx` falls back to a "copy this link" UI instead of
claiming an email was sent.
