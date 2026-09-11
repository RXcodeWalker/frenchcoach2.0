# 0006 — Under-13 guardian consent model

## Status

Accepted (Phase 1.6 Part C), soft-launch mechanism only — see "Not decided" below.

## Context

French 2.0 is used by school-age learners with no age verification anywhere
in signup. The app records spoken audio, sends it to third-party providers
for transcription/feedback, and stores the resulting transcripts and scores.
A learner under 13 using the app with no parental awareness is a real
exposure once the app leaves a closed pilot.

## Decision

- **No age *block*.** Every user proceeds to a working account regardless of
  age band. There is no age at which signup is refused.
- **A neutral age band at signup**, not a date of birth: "Under 13" or "13 or
  older." No age-estimation, no ID check.
- **Guardian consent (email-plus) applies to under-13 only.** 13-and-over
  users see no guardian step at all.
- **Selecting "under 13" shows a persuasion/confirm interstitial** before
  committing to that band, since choosing it adds a real step for the user.
- **Three concepts are kept strictly separate**, in code, docs, and UI copy:
  1. Browser mic permission (`getUserMedia`) — a normal one-click OS/browser
     prompt, never presented or referred to as legal/parental consent.
  2. FrenchCoach data-processing consent — the ToS/Privacy acceptance at
     signup, required of every user regardless of age.
  3. Parental/guardian consent — under-13 only, tracked via
     `profiles.consent_status` + `guardian_consents`, gates only speaking
     (mic capture, transcript storage, provider calls carrying learner
     audio/text) — never gates browsing, and the record control shows a
     visible "waiting for your parent/guardian" state instead of erroring
     silently.
- **Email-plus (`guardian_consents.method = 'email_plus'`) is the soft-launch
  mechanism**, not asserted as legally sufficient verifiable parental
  consent for any jurisdiction. UI/docs call it "guardian confirmation,"
  never "verifiable parental consent." The `method` column is the seam for a
  stronger provider to replace it later without a data-model change.
- **The FTC transient-voice exception is not relied upon.** The pipeline
  persists transcripts and scoring envelopes, so consent is assumed required
  regardless of whether that exception might otherwise apply.
- **Revocation erases, not just disables.** A guardian withdrawing consent
  (`revoke_guardian_consent`) immediately deletes the child's `profiles` row
  (cascading to every child table) — "stop processing" and "erase" happen
  together, not as two separate steps a guardian would have to request.

## Not decided (counsel items — explicitly deferred)

- **DPDP (India) under-18 handling.** Today's line is under-13. DPDP treats
  under-18 as a child; entering the Indian market at scale likely requires
  extending the guardian model up to under-18. Not built, not scheduled —
  flagged here so it isn't silently assumed out of scope forever.
- **Whether email-plus is legally sufficient VPC** for COPPA (US) or DPDP
  given that voice is processed. This decision record does not assert it is
  — it is the mechanism used during early access while that question is
  worked through with counsel.
- **Fully deleting the `auth.users` row** on account/guardian-initiated
  deletion. `delete_my_account()`/`revoke_guardian_consent()` delete the
  `profiles` row and everything that cascades from it, but not the Supabase
  Auth identity itself — that needs a privileged call to the Auth admin API
  (see `backend/lib/auth.py`'s existing service-role client for the
  pattern). Flagged as a fast-follow, not a blocker for this phase.
- Granular parental dashboard, per-market consent-text localisation,
  age-estimation, and a behavioural-analytics suppression flag for children
  (the `age_band` column exists for a future analytics sink to honor — no
  such sink exists yet).

## Consequences

- New `profiles.age_band` / `profiles.consent_status` columns
  (service-role/RPC write only — never in the `authenticated` UPDATE grant).
- New `guardian_consents` table (RLS: child reads own rows; every write goes
  through a `SECURITY DEFINER` RPC).
- New RPCs: `set_age_band`, `request_guardian_consent`,
  `grant_guardian_consent` (also `anon`-callable — a guardian is not
  expected to hold an account), `revoke_guardian_consent` (also `anon`).
- `export_my_data` / `delete_my_account` (Phase 1.6 Part B) gained an
  optional `p_subject_user_id`, letting a confirmed guardian export/delete a
  linked child's data — checked against an active (`granted`, not
  `revoked`) `guardian_consents` row matching the guardian's own
  authenticated email.
- New client surface: the `/age-band` gate (`AgeBandCheck`, ahead of
  `OnboardingCheck`), `SpeakingConsentGate` wrapping the record control in
  Learn, ExamMode, RoleplaySession, StoryMode, ScenarioArchitectSession, and
  DailyNewsFlash, a `blocked` guard on `useRecording`, and the
  `/guardian-consent` public landing page.
- See `docs/systems/child-safety-consent.md` for the full data-flow/RPC
  reference.
