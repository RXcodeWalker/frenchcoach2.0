# Verification Log

## S1 Verification Gate

Date: 2026-07-07

- Full suite run: `npm test` -> **250/250 tests passed** (24 test files) at gate time.
- L2 scorer inspection completed for:
  - `src/domain/igcse/rubric.ts`
  - `src/domain/igcse/canonical.ts`
  - `src/domain/igcse/judgement/types.ts`
  - `src/domain/igcse/judgement/prompt.ts`
  - `src/domain/igcse/judgement/schema.ts`
  - `src/domain/igcse/judgement/scoreSpeaking.ts`
- Golden transcript end-to-end verification:
  - Source test: `src/domain/igcse/judgement/__tests__/scoreSpeaking.test.ts` (`happy path`).
  - Expected shape/value check matched:
    - `rolePlay.total = 9`
    - `communication.mark = 8`
    - `qualityOfLanguage.mark = 8`
    - `total = 25`
- Typecheck run: `npm run typecheck` -> repo-wide failures remain in legacy UI files; no S2 scoring scope changes attempted there.

Status: **S1 gate met for scoring-engine scope**.

## S2 Layer 1 Evidence Signals

Date: 2026-07-07

Implemented detectors (deterministic, unit-tested):

- Time-frame alignment detector (`src/domain/igcse/evidence/timeFrame.ts`)
- Word/response counts per question (`src/domain/igcse/evidence/counts.ts`)
- Filler density per question (`src/domain/igcse/evidence/fillers.ts`)
- Two-part-task `partsAddressed` detector (`src/domain/igcse/evidence/parts.ts`)
- Evidence composer (`src/domain/igcse/evidence/buildEvidence.ts`)

Transcript shape extension (optional inputs only):

- `expectedTimeFrame?: TimeFrame` on conversation turns
- `partsExpected?: 1 | 2` on role-play tasks

Test artifacts:

- `src/domain/igcse/evidence/__tests__/timeFrame.test.ts`
- `src/domain/igcse/evidence/__tests__/counts.test.ts`
- `src/domain/igcse/evidence/__tests__/fillers.test.ts`
- `src/domain/igcse/evidence/__tests__/parts.test.ts`
- `src/domain/igcse/evidence/__tests__/buildEvidence.golden.test.ts`

Adversarial required-pass confusion cases were implemented and passing for:

- `c'est` vs `c'était`
- present response to `récemment` / `la semaine dernière` cue -> `misaligned`
- `j'ai faim` (present) vs `j'ai mangé` (past)
- `je venais` vs `vous venez`
- futur proche (`je vais + inf`) vs literal present (`je vais à ...`)
- imparfait `-ais` vs conditionnel `-rais`

Regression results:

- Full suite run after S2 changes: `npm test` -> **279/279 tests passed** (29 test files).
- Golden evidence regression: `buildEvidence.golden.test.ts` passing.
- S1 golden transcript regression remains passing (`scoreSpeaking.test.ts` happy path).
- Typecheck: `npm run typecheck` still fails in pre-existing legacy UI files outside S2 scope.

### PROVISIONAL — Time-Frame Classifier

Even with the adversarial confusion fixtures passing, self-authored fixtures do not prove correctness on unseen French responses.

Logged commitment for S3+:

- Manually spot-check classifier output against the first **3-5 real teacher transcripts** once S3 ingestion is available.
- Audit per-response `TimeFrame` output against the actual French.
- Keep this signal **advisory** for Phase A until that held-out manual check passes.

## docs/architecture/ removed

Date: 2026-08-31

All files under `docs/architecture/` (00-overview-and-rationale, 01-cambridge-rubric-source,
02-scoring-pipeline-architecture, 03-validation-strategy, 04-frontend-pipeline,
05-deprecated-v1-removals, roadmap, rubric-sources, learn-feedback-contract,
pronunciation-practice-boundary, verification-log) were deleted from the working tree.

Reason: the docs assumed validation against real teacher/examiner-graded transcripts
(the S3/S6/S9/S12 phased corpus plan above, including the "3-5 real teacher transcripts"
commitment logged for S2 just above this entry) — that plan no longer reflects the actual
direction. The S-numbered roadmap phases referenced throughout this log predate the removal
and should not be treated as the current plan.

No replacement design docs exist yet. Until they do, treat `src/domain/igcse/` and its own
tests as the only authority on scoring-pipeline behavior — do not infer rationale, validation
strategy, or rollout order from git history of the deleted files. `CLAUDE.md` has been updated
accordingly.

## Documentation migration Stage 6a — dead-citation repair touching Assessment Engine code

Date: 2026-09-01

Stage 6a of the documentation system migration repaired dead citations to the deleted
`docs/architecture/` files across the repo. This entry covers only the Assessment Engine
sites touched, since those fall under this file's scope per `CLAUDE.md`'s Assessment Engine
change procedure — no other Assessment Engine behavior changed, comments only.

- `src/domain/igcse/guardrails/__tests__/syntheticManifest.ts` — the five-item examiner-report
  failure taxonomy was previously commented as a "verbatim" copy from the deleted
  `03-validation-strategy.md §5.1`. Reclassified: this file is now documented as the source of
  record for that taxonomy (the document it was originally transcribed from no longer exists
  to verify fidelity against), not a copy of a surviving original.
- `src/domain/igcse/guardrails/{types,config,quoteVerification,insufficientEvidence}.ts` — header
  comments citing the deleted `02-scoring-pipeline-architecture.md §3.5` and `roadmap S6` were
  repointed to `docs/systems/assessment-engine.md` (new in Stage 5) or restated without the dead
  citation. No threshold, type, or logic changed; `GUARDRAILS_VERSION` was not bumped because no
  guardrail behavior changed.
- `src/domain/igcse/envelope/types.ts` — a comment claiming an "S4 entry" in
  `docs/architecture/verification-log.md` was corrected: no such entry exists in this file (the
  actual verification log), and the design doc that comment originally cited no longer exists.
  The listed simplifications (temperature/seed dropped, predictedGrade omitted, etc.) are
  restated as current fact without a false citation.
- `scripts/scoring/providers/{groqJudge,geminiJudge}.ts` — same false
  `docs/architecture/verification-log.md` citation for the Gemini/Groq provider-swap rationale,
  corrected to note plainly that this rationale was never recorded anywhere that survives.

Verified: `npm run score:golden` and the guardrails `__tests__/` suite (including
`version-pin.test.ts`) still pass after these comment-only edits — see the Stage 6 gate run
below for the full command list and result.

## Phase 1.1 — Exam IDOR fix (store-level owner scoping)

Date: 2026-09-09

Closed the cross-user read/overwrite hole on the server scoring path. The
scoring service (`server/index.ts`) uses the Supabase **service key**, so RLS
`owner read` policies do nothing for it; the store code is the only
enforcement point.

Changes:
- `scripts/scoring/supabaseEnvelopeStore.ts` — `load`, `list`, `listBySession`,
  and the `saveOriginal` 23505-recovery select now filter
  `.eq('user_id', options.userId)`. A lost idempotency race can no longer
  return a foreign envelope.
- `scripts/stt/supabaseTranscriptStore.ts` — `load`, `list`, `getLastAttemptAt`
  now filter `.eq('user_id', options.userId)`. `save()` does an ownership
  pre-check (`select('user_id').eq('session_id', …)`) and throws a new typed
  `TranscriptOwnershipError` instead of upserting over a row owned by another
  user (PK is `session_id` alone). Table PK unchanged — app-level check is the
  smaller fix.
- `backend/supabase/migrations/20260909120000_scope_original_envelope_index_by_user.sql`
  (separate repo) — drops `scoring_envelopes_one_original_per_session`
  (`unique (session_id) where regraded_from is null`), recreates it as
  `unique (user_id, session_id) where regraded_from is null`; adds a covering
  `(user_id, session_id)` index.
- `src/screens/ExamMode.tsx` — free-play sessionId is now
  `exam-sim-${crypto.randomUUID()}` (was `exam-sim-${Date.now()}`, enumerable).
  Defence-in-depth; the store scoping is the actual fix. Single call site
  verified; nothing parses the prefix.
- `server/index.ts` — `POST /score` 500 handler no longer echoes the raw
  exception string to the client (generic `"scoring failed"` + server-side
  `console.error` with the stack). With the scoped stores, `GET /score` for a
  foreign sessionId already falls through to 404 (no code change needed — no
  403 existed on that path).

Verified:
- `npx vitest run scripts/` → 18 files, 89 passed (includes the extended
  `supabaseEnvelopeStore.test.ts` / `supabaseTranscriptStore.test.ts`:
  scoped-read `.eq('user_id', …)` assertions, foreign-row-filtered read cases,
  and a `save()` foreign-owner rejection case).
- `npm run score:golden` → 5/5 goldens match (no pipeline behavior change).
- `npm run typecheck` / `typecheck:server` clean. `typecheck:scripts` shows
  the 3 pre-existing errors in the two store test files (unrelated fixture
  shape / tuple-index issues present before this change); no new errors.
- `eslint` clean on all touched files.
- `backend/supabase/tests/exam_idor.test.mjs` (new) — written to the existing
  `.test.mjs` pattern (two anon users; asserts B cannot read/overwrite A's
  envelope/transcript rows, A can read its own, and the migration's
  per-(user,session) unique index behaves). **Not executed locally — Docker /
  `npx supabase start` was unavailable in this session.** To run in backend CI
  or against a local stack.

## IGCSE Exam Mode overhaul — W1 (session model: `coached` flag + `inputMode`)

Date: 2026-09-22

First workstream of the exam-mode overhaul plan (persistent chat transcript +
live corrections rail + dual mic/text input for `ExamRunner`). W1 is
session-model plumbing only — no UI changes.

**Coached flag** (`SimulationSession`):
- `services/exam/simulationSession.ts` — new constructor param `coached:
  boolean = false`, exposed via a read-only `coached` getter. Stored only on
  the runtime driver; never passed to `initConductEngineState`/`startConduct`/
  `step`, so it cannot influence the deterministic `ConductLog`. Existing
  `ExamMode.tsx` call site is untouched (default `false` = Exam Sim); wiring
  the actual Coached/Exam Sim toggle is W5 (`ExamSelect.tsx`) scope.
- New test `services/exam/__tests__/simulationSession.test.ts` proves
  byte-identical `ConductLog` for `coached: true` vs `coached: false` given
  the same scripted turn sequence — the parity test the plan calls for.

**`inputMode` threading** (mic vs the always-available text field, W4 scope
to actually use):
- `domain/igcse/stt/types.ts` — new `CandidateInputMode = 'speech' | 'text'`;
  `Utterance.inputMode?` (candidate utterances only). `stt/schema.ts` zod
  updated to accept it (optional, so every pre-existing transcript still
  validates).
- `domain/igcse/session/types.ts` — `CandidateTurnResult.inputMode?` and
  `ConductLogCandidateEntry.inputMode?`, both optional (absent = 'speech') to
  avoid touching the ~50 existing `CandidateTurnResult` test fixtures.
  `conductEngine.ts::candidateTurnToLogEntry` and
  `session/buildSessionTranscript.ts::candidateEntryToUtterance` carry it
  through unchanged (dropped when absent, matching the file's other optional
  fields).
- `services/exam/simulationSession.ts` — `SimulationTurnInput.inputMode?`,
  threaded into `submitTurn`'s `CandidateTurnResult`.

**Typed-turn duration guardrail fix** (the plan's "must be solved explicitly"
hazard): a mixed speech/text session's typed turns read 0s speaking duration
by construction, which could spuriously trip
`insufficient_evidence_duration` on duration alone even with ample word-count
evidence.
- `domain/igcse/judgement/types.ts` — `ConversationTurn.inputMode?: 'speech' |
  'text'` (topic-conversation turns only — role-play is out of this
  guardrail's scope, per its own header comment).
- `domain/igcse/stt/project/toSpeakingTranscript.ts` — derives a turn's
  `inputMode` from its candidate utterance(s): `'text'` only if every
  utterance behind the turn was typed, `'speech'` if any was spoken, else
  undefined (ASR-annotated/hand-authored transcripts, unaffected).
- `domain/igcse/evidence/types.ts` /
  `evidence/duration.ts::topicConversationDurationByConversation` — new
  `typedTurnCount` per topic conversation.
- `domain/igcse/guardrails/insufficientEvidence.ts` — the duration sub-check
  now also requires combined `typedTurnCount === 0` before it can fire (same
  "duration isn't a trustworthy signal here" reasoning as the pre-existing
  missing-timing bypass, generalized to "partly missing because it was
  typed"). The word-count sub-check is unchanged and always applies.
- `domain/igcse/envelope/envelopeView.ts` — new `EnvelopeView.typedTurnCount`
  (summed from `transcriptSnapshot`), per the plan's "carry typedTurnCount
  into EnvelopeView."

**Deviations from the plan's literal file list** (documented per the task's
"adapt without changing intended behavior" instruction — none affect
architecture, scoring behavior, or data integrity):
- No `envelope/version.ts` exists in this codebase — that stage's version pin
  is `ENVELOPE_SCHEMA_VERSION` in `envelope/types.ts`. It was **not** bumped:
  `ScoringEnvelope`'s own top-level shape is unchanged, and both
  `evidenceProfileSnapshot`/`transcriptSnapshot` are already loosely-typed
  audit blobs (`z.record(string, unknown())`) in `envelope/schema.ts`, so
  nested additive fields don't affect envelope validation or migration.
  `envelope/schemaMigration.test.ts` needed no changes and was left as-is.
- `coached` was **not** added to `SessionTranscript`/`stt/types.ts`. The
  plan's "the report states which mode produced it" is a W6 (results screen)
  UI concern that can read the mode from wherever `ExamMode`'s own session
  state holds it; putting `coached` on the audited, scored `SessionTranscript`
  would blur invariant 2's boundary ("live LLM signal / rail state never
  reaches the scored pipeline") for no W1 benefit. `stt/types.ts` was still
  touched, for `Utterance.inputMode`.
- Per `src/domain/igcse/CLAUDE.md` policy ("bump the relevant stage's
  `version.ts` whenever you change that stage's behavior"), bumped
  `EVIDENCE_DETECTOR_VERSION` (`detectors-v0.5` → `v0.6`) and
  `GUARDRAILS_VERSION` (`guardrails-v0.3` → `v0.4`), each with a dated
  rationale comment in its `version.ts`.

**Golden regeneration** (flagged here explicitly per the plan's "a moved
golden means scoring behavior changed — that's a bug in this work, not a test
to update"): `npm run score:golden` initially failed all 5 cases after this
change. Verified by hand (`computeGoldenCase` diffed field-by-field against
the checked-in goldens) that **no mark, band, total, or guardrail trigger
moved** on any of the 5 fixtures — the only diff was the new
`typedTurnCount: 0` key inside `topicConversationDurationByConversation` (none
of the 5 synthetic fixtures use typed turns) plus the two version-string
bumps above. This is the same class of additive-only widening as the
pre-existing Phase 1 / Phase 3 / Workstream E `EVIDENCE_DETECTOR_VERSION`
bumps recorded in `evidence/version.ts`'s own history. Regenerated via the
script's documented escape hatch (`npm run score:golden -- --update-goldens`,
never hand-edited), then re-ran plain `npm run score:golden` → **5/5 match**.

Verified:
- `npm run typecheck` / `typecheck:server` clean. `typecheck:scripts` shows
  the same 3 pre-existing errors as before this change (unrelated fixture
  shape / tuple-index issues in `supabaseEnvelopeStore.test.ts` /
  `supabaseTranscriptStore.test.ts`); no new errors.
- `npx vitest run src/domain/igcse src/services/exam` → 76 files, 534 tests,
  all pass.
- `npm test` (repo-wide) → 234 files, 2151/2153 tests pass. The 2 failures
  (`src/services/api/__tests__/feedbackContractFixtures.test.ts` — missing
  `backend/` checkout in this session; `src/domain/learn/demand/__tests__/infer.test.ts`
  — an unrelated Learn-domain corpus assertion) are confirmed pre-existing on
  a clean tree (`git stash` + re-run) and untouched by this work.
- `npm run lint` → 0 errors (pre-existing warnings only, none in touched
  files).
- `npm run score:golden` → 5/5 match (see regeneration note above).

Not yet done (later workstreams per the plan): wiring the Coached/Exam Sim
toggle into `ExamMode.tsx`/`ExamSelect.tsx` (W5), the rail itself and its own
boundary test mirroring `interpreterBoundary.test.ts` (W3), the
`ExamComposer` mic/text input UI and its consent-pending test (W4).

## IGCSE Exam Mode overhaul — W2 + W4 (chat-transcript runner + dual mic/text input)

Date: 2026-09-22

Second slice of the exam-mode overhaul plan, built on top of W1's `coached`
flag / `inputMode` plumbing. UI-only — no `src/domain/igcse/` engine files
touched, so no stage `version.ts` bump and no golden-transcript risk (verified
below: 5/5 still match).

**W2 — chat-transcript runner** (`screens/exam/`):
- `ExamRunner.tsx` rewritten: keeps the existing immersive shell/header
  (segmented part bar, countdown, mute, End exam, `ExitConfirmDialog`) and the
  `pendingSilentSkip`/`pendingTranscriptionFailure` recovery banners
  verbatim, but the single-question focus card is replaced by a scrolling
  chat transcript + a two-pane `md:flex-row` / `hidden lg:block w-80` rail
  slot + `lg:hidden` mobile sheet, adopting `VisualNovelView.tsx`'s layout.
- New `ExamTranscript.tsx` — derives the visible bubble list via `useMemo`
  from `SimulationSession.getConductLog().entries` (never a parallel mutable
  array, matching `RoleplaySession.tsx`'s discipline), auto-scrolls on new
  entries, renders a typing-dots bubble while a turn is in flight.
- New `ExamTurnBubble.tsx` — one bubble per `ConductLogEntry`. Examiner
  bubbles carry their `ACTION_LABEL` and a replay button
  (`speakExaminerText`); candidate bubbles show `(typed)` when
  `inputMode === 'text'`. Empty-transcript entries (silent skips, button
  repeats — `transcript: ''` by construction) and textless examiner entries
  (`ADVANCE`) are filtered out rather than rendered as blank bubbles.
- **Documented deviation**: the plan's "candidate bubbles render through
  `MarkedUpScript` so a wavy-underlined error is clickable →
  `openCardFromIssue`" is **not** wired up. That interaction needs per-turn
  `ExaminerFeedback` data, which only W3's corrections rail
  (`getExaminerFeedback` + `turnFeedback.ts`) produces — W3 doesn't exist
  yet. Candidate bubbles render the transcript verbatim for now; the rail
  slot is a static, sealed placeholder ("Live corrections — coming in a
  later update") that makes zero calls in either mode, so this is additive
  (no scored/live-signal boundary exists yet to violate) and leaves a single
  swap point (`ExamRailPlaceholder` in `ExamRunner.tsx`,
  `ExamTurnBubble`'s header comment) for W3 to land against. Flagged per the
  task's "adapt without changing intended behavior and document the
  deviation" instruction rather than treated as a blocker, since the plan
  itself scopes the rail to a separate workstream (W3).

**W4 — dual mic/text input**:
- New `ExamComposer.tsx` — mic button + always-available text field + Send,
  per turn. Enter submits (Shift+Enter newlines); Space toggles
  recording when the field is empty and the field isn't focused.
- **Design decision** (the plan states the *what*, not the *how*, here):
  recording is no longer auto-started by `ExamMode.tsx` at the top of each
  turn — the candidate now explicitly starts it (mic tap / Space), matching
  the chat metaphor the plan's competitor-take section asks for. The old
  code auto-called `recording.start()` in `startExam`/`handleSubmitTurn`/
  `handleSkipQuestion`/`handleRequestRepeat`; those calls (and the
  `turnStartRef` bookkeeping that went with them) are removed and replaced
  by `ExamMode.tsx::handleStartRecording`, bound to the composer's mic
  control. This was necessary to make "skips recording.stop()" for a typed
  turn actually safe: with auto-start, a typed submission would otherwise
  either have to stop a recognizer it doesn't need (defeating the point) or
  leave one running unbounded — a real mic-left-hot risk in a codebase whose
  child-safety model treats "browser mic permission" as never equivalent to
  consent (ADR 0006). `handleKeepTrying`'s own explicit `recording.start()`
  (the "Keep trying" retry button) is untouched — that's a deliberate
  candidate action, not an auto-start.
- To keep that safe without a redesign, `ExamComposer` itself stops (and
  discards the transcript of) an in-progress recording the instant the
  candidate types a character — "typing takes over from speech" — so a
  typed `onSubmitText` truly never needs to call `recording.stop()` by the
  time Send is pressed, satisfying the plan's line literally rather than by
  leaving a recognizer abandoned.
- Typed turns call `session.submitTurn({ transcript, responseDurationS: 0,
  requestedRepeat: false, inputMode: 'text' })` — zero speaking duration by
  construction (no recording ran), letting W1's `typedTurnCount` guardrail
  exemption do its job without needing to fake a duration.
- **Consent** (Phase 1.6 Part C / ADR 0006): `SpeakingConsentGate` wraps only
  the mic button. Since the gate's waiting card is full-width chrome, not an
  icon-sized affordance, it renders as its own row above the input bar when
  `consentStatus === 'pending'` (mic button simply absent from the row that
  turn) rather than being squeezed into the mic button's slot —
  `RoleplaySession.tsx`'s `<span />` placeholder pattern, adapted: the real
  mic button lives in the sibling `!consentPending` branch, not inside the
  gate's children. The text field and Send button are never gated. New test:
  `screens/exam/__tests__/ExamComposer.test.tsx` — consent-pending hides the
  mic control and shows the guardian-wait message while the text field stays
  fully usable (typed submit still fires `onSubmitText`); plus Enter-submits/
  Shift+Enter-newlines and the typing-stops-an-in-progress-recording behavior.
- `ExamMode.tsx` gained a `turnPending` state (distinct from the pre-existing
  `turnBusyRef` re-entrancy guard) so the transcript's typing-dots indicator
  and the composer's disabled state reflect the in-flight
  `session.submitTurn` round-trip.

**Not done here** (later workstreams, unchanged from W1's note): the
Coached/Exam Sim toggle (W5), the live corrections rail itself + its
`interpreterBoundary.test.ts`-style boundary test (W3), `ExamResults.tsx`'s
`evidenceGroups`/mode-badge surfacing (W6), reliability/persistence (W7),
design-token normalisation of any *other* exam-adjacent legacy component
(W8) — `ExamRunner`/`ExamTranscript`/`ExamTurnBubble`/`ExamComposer` were all
written against the already-migrated token set from the start, so there was
nothing to normalise in the files this slice touched.

Verified:
- `npm run typecheck` clean.
- `npx vitest run src/domain/igcse src/screens/exam src/services/exam` → 78
  files, 541 tests, all pass (was 76/534 after W1; +1 new test file
  (`ExamComposer.test.tsx`, 4 tests) + `ExamRunner.test.tsx`'s 3 existing
  tests updated to the new prop contract, still 3/3 green).
- `npm test` (repo-wide) → 235 files, 2155/2157 tests pass. Same 2
  pre-existing failures as W1 recorded (missing `backend/` checkout;
  unrelated Learn-domain corpus assertion) — confirmed unrelated to this
  slice, no new failures.
- `npm run lint` → 0 errors (same pre-existing warning set as before this
  change, none in touched files).
- `npm run score:golden` → 5/5 match (expected — no engine files touched).
- Manual in-browser verification (mic permission prompts, actual TTS replay,
  drag-dismiss mobile sheet, real STT) was **not** performed in this
  session — no browser available. Typecheck/lint/unit tests verify
  correctness of the code as written, not the live UX; flagged per the
  root `CLAUDE.md` instruction to say so explicitly rather than claim
  feature-level success from tests alone.

## IGCSE Exam Mode overhaul — W3 pre-implementation decision: no `observeAttempt` from the rail

Date: 2026-09-22

Correction to the exam-overhaul plan's original W3 text ("Feed
`observeAttempt({mode:'exam', ...})` per turn for evidence capture without
XP") — decided before any W3 code was written, so this is recorded here
instead of in code comments. **The corrected instruction for whoever
implements W3: do not call `observeAttempt` from the exam rail at all.**

Why: `ExaminerFeedback` (`{currentDescriptorCommentary,
improvementCommentary}`) carries no score/issues by construction (ADR-0005 —
examiner-voice feedback never emits a mark), so there's no structured
judgement to derive skill-node evidence from. Two options were considered and
rejected:
- **Mapping `ExaminerFeedback` into `FeedbackV2.issues`** — rejected outright:
  inventing category/severity/correction fields from prose claim/quote pairs
  fabricates structured judgement from unstructured commentary, against the
  spirit of ADR-0005 even though it's not a literal numeric grade.
- **An "unscored shell" call** (`observeAttempt` with empty issues, ignored
  `finalScore`, just recording that the turn happened) — looked safe at
  first (`evidenceProjection.ts::buildEvidence` does handle an issue-free
  feedback object safely: `targetNodeIds` comes out empty, `realScore` is
  `null`, `eventSuccess` is `undefined`, and the belief reducer's
  `hasSuccessSignal` gate skips the update — verified in code). **But
  rejected**: `observeAttempt` also calls
  `generateRecommendation(beliefSnapshot, getRecentEvidence(20))`, and
  `coachStorage.ts::getRecentEvidence` is a flat `reverse().slice(0, limit)`
  over the *entire* evidence log (verified in code) — it has no per-source
  weighting. A 15-turn exam session would silently write 15 zero-signal
  events into that 20-event window, evicting the real Learn evidence the
  recommendation engine depends on. That's real, silent harm to an unrelated
  feature, not a hypothetical.

Decision: **the rail renders `ExaminerFeedbackCard` and nothing else. No
`observeAttempt` call, no evidence-log write, no belief update, per turn.**
This matches the existing precedent one screen over —
`Learn.tsx`'s `feedbackMode === 'examiner'` branch (around line 535) returns
early, before the coach/orchestrator path, precisely because there's no score
to record; W3's rail is the same shape of "examiner voice, entirely outside
the coach loop," just in a different screen.

Explicitly **out of scope** for W3 (noted so a later batch doesn't reach for
it as a substitute): exam mode does have a real, structured evidence source —
the `ScoringEnvelope` built once at end-of-session, with quote-verified
per-criterion marks and per-question `wordCount`/`fillerDensity`/
`timeFrameAlignment` (`envelopeView.ts`'s `evidenceGroups`, extended in W1
with `typedTurnCount`). If exam sessions are ever meant to feed the Learn
skill model, that end-of-session envelope is the correct input — a single
write at submission, never a per-turn write from mark-free rail commentary.
That wiring is not part of any workstream in the current plan and needs its
own design pass if it's ever wanted.

No files changed in this entry — W3 itself is not yet implemented. This is a
recorded design decision so the correct behavior survives into whichever
session/batch actually builds the rail.

## IGCSE Exam Mode overhaul — W7 (reliability)

Date: 2026-09-22

Implements W7 as written, with two deliberate deviations from the plan's
literal text, decided before writing code and confirmed with the user (this
session asked before touching auth/schema, since the plan's phrasing didn't
survive contact with the actual quota schema and the actual guest-mode
contract). Recorded here per the plan's own "record it in verification-log.md
the same way the W3 observeAttempt decision was recorded" instruction.

### Deviation 1 — `/api/exam/interpret`: `verify_jwt` only, no `consume_ai_quota_or_503`

The plan said "matching `/api/transcribe`" without checking what that
actually requires: `consume_ai_quota_or_503` needs a `feature` key already
present in `ai_quota_limits` (FK constraint) or every call 503s. The only
candidate was the existing `('exam', 10)` row — seeded but consumed by no
Python code path today (grep confirms `consume_ai_quota_or_503` is called
only for `feedback`/`transcribe`/`roleplay_turn`/`pronunciation`), so it was
provisioned for the orphaned `/api/exam/finish|evaluate` routes, not for a
per-turn call. `/interpret` fires on every candidate turn — reusing `exam`
would exhaust a 10/day cap within one or two exams and start hard-failing
mid-exam for every signed-in user; minting a new feature row for it would be
a real migration for a call whose actual cost (`max_tokens=60`,
`temperature=0.0`, fixed server-side prompt, output constrained to a 7-value
enum) is a rounding error, and `consume_ai_quota_or_503` is deliberately
fail-closed, so metering it would turn a Supabase blip into a dropped
live-routing hint on every remaining turn of a session already metered where
the real cost is (transcribe, score, and — once W3 lands — the rail's
examiner-feedback call).

**Decision: `verify_jwt` closes the actual gap (the route was fully
unauthenticated — `exam_controller.py`'s old "Rate limiting" comment
documented this as the known Phase 1.2 item). No quota call. The existing
per-IP 20/minute rate limit (`set_rate_limiter`) stays the volume backstop.**
A comment on the route itself (`exam_controller.py`) records why, so the
exemption gets revisited rather than silently inherited if `max_tokens` or
the prompt ever loosens.

Required frontend changes in the same commit (adding auth server-side without
these would 401 every real user, not just close a hole):
- `interpretUtterance.ts` now resolves a token via `getAccessToken()`
  (`lib/authToken.ts` — never a bare `getSession()`, matching the app's
  existing convention) and sends `Authorization: Bearer <token>`.
- No token (guest, no Supabase session) → skip the round-trip entirely and
  return `deriveObservationFromIntent(transcript)` directly, same posture as
  the existing empty-transcript short-circuit. Never raises
  `AuthRequiredError` — interpret is an optional routing hint, not a
  user-facing action, and must never interrupt an exam turn.
- The 404 circuit breaker (`interpretEndpointGone`) now also trips on 401/403
  — a bad/expired token doesn't fix itself turn-to-turn, so repeating the
  doomed round-trip every remaining turn would be pure waste.
- `GET /api/exam/interpret/health` stays unauthenticated on purpose — it's
  `pingInterpretServiceHealth`'s pre-exam warm-up probe, fired before any
  auth context is guaranteed, and makes no model call.

**Accepted consequence, stated explicitly so it reads as a decision and not a
regression:** a guest exam session now loses LLM-assisted conduct routing
entirely (falls back to the deterministic classifier for the whole session,
which — per `interpretUtterance.ts`'s own header — is a complete substitute,
just without the messy-STT recall boost). This was already true for a signed-
in user whose token expired mid-session before this change (interpret failing
silently is the norm, not new), and is now also true for every guest by
construction. Scoring is entirely unaffected — the interpreter only ever
produces a `conductHint` and is enforced unreachable from the scored pipeline
(`interpreterBoundary.test.ts`).

### Deviation 2 — `/api/content/igcse-sets` (and the rest of `routers/content.py`): stays public, gains rate limiting instead

The plan listed this endpoint alongside `/interpret` for the same
`verify_jwt` + quota treatment. Rejected on inspection, for reasons that
don't apply to `/interpret`:
- **Zero provider cost.** It's a cached (5-min TTL) Supabase read behind
  `status = 'published'` RLS. Charging AI-cost quota for a request with no AI
  cost is definitionally wrong, independent of the auth question.
- **RLS already does the actual access control.** Only published rows are
  reachable regardless of caller identity — there's no data-exposure gap for
  `verify_jwt` to close.
- **Guests are a supported entry path into Exam mode**, and
  `data/exam/bank/loader.ts` already treats any non-2xx response
  (`!res.ok`) as "fall back to the offline fixture registry" — indistinguish-
  able from a backend outage. Gating this with `verify_jwt` would silently
  collapse every guest's exam catalog from (eventually, per W5) 10 sets to
  the 1 bundled today, with no error surfaced anywhere — a guest-mode
  regression, not a security fix, since the plausible threat (a competitor
  scraping the question bank) is only deterred by "create a free account,"
  which costs an adversary thirty seconds.

**Decision: leave the whole `routers/content.py` router (`/questions`,
`/scenarios`, `/igcse-sets`, `/igcse-sets/{id}`) unauthenticated and
unquota'd. Add the same per-IP `set_rate_limiter` pattern already used by
`exam_controller.py`/`routers/pronunciation.py` (30/minute — sized so
ExamSelect's normal flow, one catalog call plus a fetch per set, up to 10
today, is nowhere near it).** This was the router's actual gap (unlike
`/api/exam/*`, it had no rate limiting of any kind before this change), and
per-IP limiting doesn't have the guest-lockout failure mode `verify_jwt`
would.

Noted for whoever picks up W5: the real resilience fix for the "one backend
hiccup collapses the picker to one set" problem is bundling all 10
`AuthoredQuestionSet` fixtures into `loader.ts`'s `OFFLINE_FIXTURES`, not
anything auth-related — out of scope here, not touched.

### W7's third item — mid-exam (running-phase) resume-on-reload

Before this change, `ExamMode.tsx` only resumed a reload during `'scoring'`
(`getPendingScoreSessionId`); a reload during `'running'` silently dropped
the candidate back to `'select'`, discarding an in-progress attempt even
though nothing about `SimulationSession`'s state actually required that.

The plan's literal wording ("persist turn-by-turn to `localTranscriptStore`")
doesn't work as written: a `SessionTranscript` can't represent an in-progress
session — `SimulationSession.buildTranscript()` throws until the engine
reaches `'complete'`. What actually gets persisted is a new
`RunningSessionSnapshot` (added to `localTranscriptStore.ts`, the module the
plan named, since it's the same "resume-on-reload marker" role as the
existing `examPendingScoreSessionId`) holding `SimulationSession`'s own
resumable state.

**Design: direct state restore, not event replay.** `ConductEngineState`
(`domain/igcse/session/types.ts`) is already plain, JSON-serializable data —
no functions, Maps, Sets, or class instances — so the snapshot persists it
verbatim (`{engineState, entries, seq, currentAction}`, via
`SimulationSession.getSnapshot()`) and a new resume-constructor parameter
restores it directly. This was chosen over replaying the `ConductLog`
entries back through `conductEngine.step()`, which was considered and
rejected: `step()`'s branching for a role-play repeat/advance/clarification
can depend on `interpretUtterance`'s live `conductHint`
(`conductEngine.ts::applyConductHint`), and that hint is *deliberately never
persisted* — it's the determinism-boundary invariant `interpreterBoundary.
test.ts` enforces (never written to `CandidateTurnResult`/the `ConductLog`).
A replay without the original hint could therefore choose a different branch
than what actually happened and silently desync from the real `ConductLog`
already on record (e.g. `repeatUsed`/`partsAddressed` state disagreeing with
the logged entries). Direct state restore has no such gap — no reducer call,
no hint needed, byte-identical either way. Proven in
`simulationSession.test.ts`'s new "reload-resume snapshot" describe block: a
session interrupted mid-script and resumed via `getSnapshot()`/the resume
constructor produces a byte-identical `ConductLog` to one driven straight
through uninterrupted (same script, split at an arbitrary turn).

Also required (not called out explicitly in the plan, but necessary for the
persisted timestamps to stay meaningful): `useSessionClock`/`useElapsedClock`
gained an optional resume-offset param on `start()`. A real reload restarts
`performance.now()`/`Date.now()` at zero; without an offset, entries logged
after a resume would carry smaller `atS`/`startS`/`endS` values than the
ones already in the snapshot, corrupting the append-only log's monotonic
ordering. The offset is computed from the snapshot's own entries
(`max(atS | endS)`), not tracked separately, so it can't drift from what was
actually logged.

Persistence points: after `begin()`'s first action and after every
`submitTurn` resolves (`persistRunningSnapshot()` in `ExamMode.tsx`).
Cleared: on reaching `finishSession` (superseded by the real/reviewable
transcript — mirrors `clearPendingScoreSessionId`'s existing role) and on a
deliberate exit-confirm from `ExamRunner` (an abandoned attempt should not
resurrect itself on the next visit). The daily-challenge and duel entry
effects were given the same `getRunningSession()` guard the scoring-resume
effect already has, so a running snapshot always wins over re-entering
`'intro'` from stale `location.state`.

**Known limitation, not fixed here:** if the interrupted attempt was a
Daily Challenge or Friend Duel run, the resume effect does not restore
`isDailyChallengeRun`/`isDuelRun` (those come from React Router
`location.state`, not the snapshot) — the exam itself resumes and scores
correctly using the snapshot's own `sessionId`, but `onHome`'s post-results
navigation would fall back to `/` instead of back to the daily-challenge/duel
screen. Solving this needs storing that context in the snapshot too, which
the plan didn't call for and this session didn't add speculatively.

`primeExaminerVoice`/`pingScoringServiceHealth` keepalive: verified already
wired (`ExamMode.tsx`'s `KEEPALIVE_INTERVAL_MS` effect gated on
`examState === 'running'`, plus the one-shot pings in `startExam`) — no
change needed, nothing in this workstream touched them.

### Files changed

`frenchcoach2.0` (frontend):
- `src/services/exam/interpretUtterance.ts` — auth header, no-token
  short-circuit, 401/403 circuit-breaker trip.
- `src/services/exam/simulationSession.ts` — `SimulationSessionSnapshot`
  type, resume constructor param, `getSnapshot()`.
- `src/services/exam/localTranscriptStore.ts` — `RunningSessionSnapshot`
  type + `getRunningSession`/`saveRunningSession`/`clearRunningSession`.
- `src/services/persistence/storage.ts` — new `examRunningSession` key.
- `src/features/recording/useSessionClock.ts`,
  `src/features/recording/useElapsedClock.ts` — optional resume-offset param
  on `start()`.
- `src/screens/ExamMode.tsx` — resume-on-reload effect, snapshot persistence
  at every turn, clear-on-finish/clear-on-exit, daily-challenge/duel guard.
- Tests: `src/services/exam/__tests__/interpretUtterance.test.ts` (auth
  mocking + 4 new cases), `src/services/exam/__tests__/simulationSession.
  test.ts` (2 new cases: `getSnapshot()` pre-`begin()` throw, resume parity).

`french-coach-backend` (separate repo):
- `exam_controller.py` — `verify_jwt` on `POST /api/exam/interpret`
  (`/interpret/health` untouched); updated rate-limiting section comment.
- `routers/content.py` — `Request` param added to all four handlers (needed
  by slowapi's decorator), `set_rate_limiter` (30/minute, mirrors
  `exam_controller.py`'s pattern).
- `main.py` — wires `routers.content.set_rate_limiter` in after
  `app.include_router(_content_router)`.
- New test: `tests/test_exam_interpret_auth.py` (requires-auth, rejects
  bogus token, processes normally once authenticated, health stays
  unauthenticated).

### Verified

Frontend (`frenchcoach2.0`):
- `npm run typecheck` clean.
- `npx vitest run src/screens/exam src/services/exam src/domain/igcse/session
  src/features/recording src/data/exam` → 18 files, 232 tests, all pass.
- `npm test` (repo-wide) → 235 files, 2161/2163 tests pass. Same 2
  pre-existing failures as prior W1/W2 entries recorded (missing `backend/`
  checkout for `feedbackContractFixtures.test.ts`; unrelated Learn-domain
  corpus assertion in `infer.test.ts`) — confirmed unrelated to this slice
  (neither file touched), no new failures.
- `npm run lint` → 0 errors, same pre-existing warning set, none in touched
  files.
- `score:golden` not re-run — no `src/domain/igcse/**` evidence/judgement/
  guardrails/envelope/rubric.ts file was touched (only `session/types.ts`
  was *read*, never edited).
- Manual in-browser verification (an actual reload mid-exam, mic-denied
  guest path, Firefox/no-Web-Speech text path) was **not** performed — no
  browser available in this session. `simulationSession.test.ts`'s resume-
  parity test verifies the engine-state/ConductLog mechanics exactly; it
  does not verify the live React effect wiring end-to-end.

Backend (`french-coach-backend`):
- `python3 -m py_compile exam_controller.py routers/content.py main.py` —
  syntax valid.
- `python3 -m pytest tests/` → 239 files' worth of tests collected,
  238/239 pass. The one failure
  (`test_transcribe_endpoint.py::test_transcribe_rejects_a_bogus_bearer_
  token`) is pre-existing and environment-only — this sandbox has no
  `SUPABASE_JWT_SECRET`/JWKS configured at all, so a bogus token 503s
  ("Auth not configured") instead of 401ing; confirmed the same test fails
  identically before this change, and `test_api_surface_lockdown.py`'s
  `/metrics` equivalent already tolerates exactly this (`in (401, 403,
  503)`). The new `test_exam_interpret_auth.py` uses that same tolerant
  assertion for its own bogus-token case.
- Manual `TestClient` smoke test confirmed `/api/content/*` routes still
  reach `_db()` correctly after adding the `Request` param each handler
  needed for `slowapi`'s rate-limit decorator (503 "Database not
  configured" in this sandbox — expected, no Supabase env vars set; not a
  422/500 from the routing change itself).

### Not done here (deferred, in scope for later workstreams only)

Everything W1/W2/W3/W4's own "not done here" notes already listed and are
still true (Coached/Exam Sim toggle, the live corrections rail, `ExamResults.
tsx` surfacing, W8 token normalisation) — this entry adds nothing new to that
list. W7 itself is now fully implemented: keepalives (already wired, verified
only), mid-exam resume-on-reload (implemented), and the `/api/exam/interpret`
+ `/api/content/*` security gap (closed, with the two deviations above).
session/batch actually builds the rail.

## IGCSE Exam Mode overhaul — W3: live corrections rail

Date: 2026-09-23

Builds the live corrections rail into the seam W2/W4 already left in
`ExamRunner.tsx` (the `w-80` desktop column and mobile sheet, both
previously filled by a static `ExamRailPlaceholder`). Implements the design
locked in this file's "W3 pre-implementation decision" entry above: the rail
renders `ExaminerFeedbackCard` and nothing else — no `observeAttempt` call,
no evidence-log write, no belief update, per turn.

### What changed

- New `src/services/exam/turnFeedback.ts` — `useExamCorrectionsRail(entries,
  coached)`. Watches the running session's `ConductLogEntry[]` reactively
  (never a parallel mutable array) and, in coached mode only, fires one
  `getExaminerFeedback` (`feedbackMode: 'examiner'`) call per new candidate
  turn that clears `classifyTier`'s gate (tier 0/1 — silent or <=3 words —
  never spends a call; a button/verbal repeat request is skipped too, since
  it isn't an answer to comment on). Exam Sim (`coached === false`) returns
  before touching the network at all — a genuinely sealed rail, not a hidden
  call — verified by a dedicated test (`useExamCorrectionsRail` unit tests,
  "Exam Sim makes zero calls" + "tier gate"/"repeat-request" cases).
  Fire-and-forget: nothing here blocks `ExamMode.tsx`'s `submitTurn` flow,
  which reads an entirely separate piece of state. Each in-flight request is
  tracked by a per-`turnKey` request-id counter — this module's analogue of
  Learn.tsx's screen-wide `attemptIdRef`/`finalizedAttemptIdRef`, scoped per
  turn here because many turns can be in flight at once (not just one
  attempt), so a stale or retried response can never overwrite a newer one
  for the same turn. A guest/expired-session failure (`isAuthRequiredError`,
  same check as Learn.tsx) degrades the whole rail quietly
  (`disabledReason: 'signed-out'`, entry removed) rather than showing a
  per-turn failed card; any other failure shows the existing
  `ExaminerFeedbackCard` failed state with retry.
- New `src/screens/exam/ExamCorrectionsRail.tsx` — presentational fork of
  `LiveFeedbackPanel`, written against the current token set from the start
  (`surface`, `rounded-card`, `text-eyebrow`, etc. — same discipline as
  `ExamRunner`/`ExamTranscript`/`ExamTurnBubble`/`ExamComposer`, so there is
  nothing here for a later W8 pass to normalise). Renders the sealed
  placeholder, the quiet signed-out state, the empty state, or the list of
  `ExaminerFeedbackCard`s keyed by `turnKey`, each `data-turn-key`-tagged for
  the highlight/scroll wiring below.
- `ExaminerFeedbackCard.tsx` gained one optional prop, `hideSwitchToCoach` —
  exam mode has no "coach mode" to switch to, so the failed-state escape
  hatch is hidden there; Learn's usage is unaffected (prop defaults to
  showing it, as before).
- `ExamTurnBubble.tsx` — lands the wavy-underline wiring the W2 header
  comment deferred. **Deviation from the plan text, documented per root
  `CLAUDE.md`'s "adapt without changing intended behavior" instruction**:
  the plan named `MarkedUpScript`/`buildSegments`/`openCardFromIssue` for
  this, but those are built for `FeedbackV2`'s `issues`/`transcriptAnnotations`
  (category, severity, character-offset spans) — a structure this file's own
  W3 pre-implementation decision explicitly rejected mapping `ExaminerFeedback`
  into ("inventing category/severity/correction fields from prose claim/quote
  pairs fabricates structured judgement, against the spirit of ADR-0005").
  `ExaminerFeedback` is prose claim/quote pairs with no such structure by
  design, and `ExaminerFeedbackCard` has no per-citation anchor (one card per
  turn, not one per citation) — so a new, local `buildQuoteSegments` finds
  each citation's verbatim quote occurrence in the transcript (the same
  verbatim-match guarantee `isQuoteGrounded`/`groundExaminerFeedback` already
  enforce upstream) and renders it as a clickable wavy-underlined span; every
  quoted span in a turn points at that turn's single rail card, which is the
  actual available granularity. Same end-user behavior the plan asked for
  (click an underlined error, the rail highlights), correctly scoped to the
  real data shape rather than fabricating one.
- `ExamTranscript.tsx` — threads `railEntries`/`onIssueClick` through to each
  candidate `ExamTurnBubble`, looked up by `turnKey` (`entry.seq`).
- `ExamRunner.tsx` — new optional `coached` prop (default `false`, so the
  existing `ExamRunner.test.tsx` cases are unaffected without modification);
  calls `useExamCorrectionsRail` once and passes its output to both rail
  slots (desktop column, mobile sheet) and to `ExamTranscript`. Click-to-rail
  wiring: `handleIssueClick(turnKey)` opens the mobile sheet (harmless,
  CSS-hidden at desktop widths), sets a `highlightedTurnKey` that both rail
  instances ring-highlight for 1.2s (same duration as `useFeedbackState`'s
  `HIGHLIGHT_CARD` pattern), and scrolls every `[data-turn-key="N"]` element
  into view — `querySelectorAll` rather than `id` because the desktop column
  and mobile sheet can both be mounted at once and IDs must be unique.
  Removed the now-dead `ExamRailPlaceholder` function and its stale header
  comment.
- `ExamMode.tsx` — one line: `coached={sessionRef.current?.coached ?? false}`
  on the `<ExamRunner>` call. `SimulationSession.coached` was already
  plumbed in W1; this is the first read of it outside `simulationSession.
  test.ts`'s parity test, which was not touched.
- New `src/services/exam/__tests__/turnFeedbackBoundary.test.ts` — the
  rail's own boundary test, mirroring `domain/igcse/session/__tests__/
  interpreterBoundary.test.ts` as the plan asked: (1) a source-text scan
  confirms `src/domain/igcse/**` and `scripts/scoring/**` never reference
  `turnFeedback`/`ExamCorrectionsRail`/`useExamCorrectionsRail`; (2) a scan
  of `turnFeedback.ts`/`ExamCorrectionsRail.tsx` themselves confirms neither
  references `observeAttempt`, `sessionOrchestrator`, or either ConductLog-
  writing function (`candidateTurnToLogEntry`/`examinerActionToLogEntry`) —
  codifying the "no observeAttempt from the rail" decision in a test, not
  just a comment.
- New `src/services/exam/__tests__/turnFeedback.test.ts` — `renderHook`-based
  unit tests for `useExamCorrectionsRail`: Exam Sim makes zero calls; coached
  mode fires and resolves; tier gate; repeat-request skip; guest/expired
  degrades quietly; non-auth failure + retry; a turn is only ever requested
  once across re-renders (the stale/duplicate-request guard).

### Discrepancy note (backend quota status codes)

The plan's W3 text says "Guest / quota-denied (`aiQuota` 403/429) degrade to
a quiet disabled state." Checked `french-coach-backend/main.py`: `/api/
feedback/v3` calls `consume_ai_quota_or_503`, so a real quota denial comes
back as **503**, not 403/429 — 403 is `assertNotAuthFailure`'s auth-failure
status (already the "signed-out" quiet-degrade path), and 429 doesn't occur
on this endpoint at all. The frontend's `postWithSignal` doesn't distinguish
a quota-503 from any other server error — both surface as a plain `Error`,
not a typed `QuotaDenied`. Minor implementation discrepancy, adapted per
root `CLAUDE.md`: the rail only distinguishes what the existing client
plumbing actually can — `isAuthRequiredError` (guest/expired session, quiet
disabled state) vs. everything else (per-turn failed card with retry, which
already covers a quota-503 the same way a network blip would be covered).
Giving quota-denial its own distinct UI state would need a new typed error
surfaced from `apiClient.ts`, which is out of scope for this workstream.

### Not done here (deferred, in scope for later workstreams only)

The Coached/Exam Sim *toggle* itself (W5 — this slice only *reads*
`session.coached`, which W1 already plumbed; there is still no UI to choose
it, so `coached` is always `false` until W5 lands), `ExamResults.tsx`
surfacing (W6), and W8 token normalisation of any *other* exam-adjacent
legacy component — not needed for any file this slice touched, all written
against the current token set from the start.

### Verified

- `npm run typecheck` clean.
- `npx vitest run src/domain/igcse src/screens/exam src/services/exam` → 80
  files, 560 tests, all pass (was 78/541 after W7; +2 new test files
  (`turnFeedback.test.ts` 7 tests, `turnFeedbackBoundary.test.ts` 6 tests) +
  `ExamRunner.test.tsx`'s 3 existing tests unchanged and still passing with
  no edits, confirming the new `coached` prop's default kept the old
  contract intact).
- `npm test` (repo-wide) → 237 files, 2174/2176 tests pass. Same 2
  pre-existing failures as every prior workstream entry (missing `backend/`
  checkout for `feedbackContractFixtures.test.ts`; unrelated Learn-domain
  corpus assertion in `infer.test.ts`) — neither file touched, confirmed
  unrelated, no new failures.
- `npm run lint` → 0 errors, same pre-existing warning set, none in touched
  files.
- `npm run score:golden` → 5/5 match (no `src/domain/igcse/**` scoring file
  touched).
- Manual in-browser verification (mic-permission prompts, an actual
  concurrent-turn race with real network latency, the wavy-underline click
  actually scrolling/highlighting in a real viewport, mobile drag-sheet)
  was **not** performed in this session — no browser available.
  Typecheck/lint/unit tests verify correctness of the code as written, not
  the live UX; flagged per the root `CLAUDE.md` instruction to say so
  explicitly rather than claim feature-level success from tests alone.

## IGCSE Exam Mode overhaul — W5 + W6: flow stages + the /40 report

Date: 2026-09-23

W1–W4/W7 were already on this branch (see the entries above). This slice
covers the two remaining workstreams named for this session — W5 (flow
stages: select/intro/card/review/scoring) and W6 (surfacing the discarded
parts of `EnvelopeView` in `ExamResults.tsx`) — plus the "Coached/Exam Sim
toggle" and "accumulated rail entries" wiring both workstreams' text
requires but that belonged to neither file in isolation. W8 (design-token
consolidation) and the remaining out-of-scope workstreams were not touched.

### What changed

**Catalog collapse fix (W5, `ExamSelect.tsx`'s stated bug).** The offline
fixture registry in `data/exam/bank/loader.ts` held only
`original-practice-001` — a catalog-fetch failure/cold-start collapsed the
picker from 10 sets to 1, exactly as the plan described. The other 9 sets
already exist as canonical, `authoring:check`-validated content in
`french-coach-backend/data/igcse/original-practice-{002..010}.json` (verified
byte-identical in shape to `original-practice-001.json`, which
`original-practice-001.ts` is the hand-authored frontend copy of). Generated
`src/data/exam/bank/fixtures/original-practice-{002..010}.ts` 1:1 from that
JSON (a small one-off Python script did the JSON->TS-literal transcription;
not committed, it's not project tooling) and registered all 10 in
`OFFLINE_FIXTURES`. `corpusLint.test.ts`/`validate.test.ts`/`loader.test.ts`
all exercise the real fixtures and pass, which is the frontend-side
correctness check available in this repo (no nested `backend/` checkout
here to run `authoring:check` itself against — same known gap
`feedbackContractFixtures.test.ts` already documents).

**Coached/Exam Sim toggle (W5).** `ExamSelect.tsx` gained a segmented
toggle (defaults to Coached); its choice threads through `ExamMode.tsx`'s
new `coachedMode` state into `SimulationSession`'s existing (W1-plumbed)
`coached` constructor arg — previously always `false` because nothing set
it. `ExamIntro.tsx` now states in plain language what the chosen mode
does/doesn't give (mirroring the plan's own two-line framing for each).

**Voice-unavailable warning surfaced at intro, not mid-exam (W5).**
`ExamIntro.tsx` now checks `hasFrenchVoice()` (re-checked once
`ensureVoiceReady()` settles, since the voice list can still be loading on
mount) and shows a banner before the mic is ever opened, instead of the
examiner silently never speaking.

**Real role-play prep affordance (W5, `RolePlayCardPreview.tsx`).**
`ExamIntro.tsx`'s paper summary has always promised "you have the card for
1 min" with no timer behind it. Added a 60s countdown (pacing only, never a
cutoff — Begin stays clickable throughout, same discipline as
`ExamRunner`'s part countdown) and a 5-slot task-shape indicator. The slots
are deliberately content-free (a lock icon + number, not the task text) —
showing the actual `mainText` here would contradict this same screen's own
"you won't see the questions in advance" copy and the exam-realism intent;
the card's *shape* (5 tasks) is real, its *content* stays hidden.

**TranscriptReview.tsx restyled + inputMode shown (W5).** Migrated off the
pre-token-set classes (`text-[9px]`, `bg-white/[0.03]`, `btn-primary`) onto
the current token set (`rounded-card`, `surface`, `text-eyebrow`, the shared
`Button` component) — the plan named this file specifically for a restyle,
unlike the other W5 screens where only new content was added. Each answer
now shows a Mic/Type badge from `Utterance.inputMode` (W1's field, unused
until now).

**Scoring phases surfaced (W5, `ExamMode.tsx`).** The `examState ===
'scoring'` block previously collapsed `examScoringMachine.ts`'s five
reachable phases into one binary (`isRecovering`). New
`scoringPhaseCopy(machine)` gives each phase (Queued/Submitting,
WaitingForScore, Recovering — with its attempt count, Completed) its own
copy; `FailedTerminal` is excluded by construction (that phase's effect
routes straight to `results`, so this block never renders for it).

**Live-corrections rail lifted out of `ExamRunner` into `ExamMode` (W6
prerequisite).** `useExamCorrectionsRail` was previously called inside
`ExamRunner`, so its accumulated entries were lost the moment `ExamRunner`
unmounted at session end — unusable for a results-screen "what the rail
showed you" section. Moved the hook call up to `ExamMode.tsx` (computing
`entries`/`coached` the same way the existing `entries` prop to
`ExamRunner` already did) and threaded the resulting `rail` object down as
a new optional prop on `ExamRunner` (defaulting to an inert empty rail, so
`ExamRunner.test.tsx`'s existing 3 cases needed no changes — same
default-prop courtesy the `coached` prop already established in W3) and a
new `railEntries`/`coached` pair of props on `ExamResults`.

**`ExamResults.tsx` rewritten (W6).** Every item the plan named as
"discarded by `ExamResults.tsx`" is now surfaced, all from the existing
`buildEnvelopeView` output — no `envelope/`, `evidence/`, `judgement/`, or
`guardrails/` file was touched, so no stage `version.ts` bump applies here:
- Mode badge (Coached Practice / Exam Sim) + typed-answer count
  (`typedTurnCount`) in the hero.
- Per-criterion `confidence` now rendered alongside `justification` (was
  computed, never shown).
- New "Turn-by-Turn Breakdown" disclosure: `evidenceGroups` — prompt,
  candidate response, word count, filler density, time-frame alignment per
  turn.
- New "Live Corrections From This Session" disclosure, coached-mode only,
  reusing `ExaminerFeedbackCard` per accumulated rail entry (the "collapsed
  per turn" framing from the plan — a closed-by-default disclosure holding
  one card per turn, consistent with the existing "Transcript Saved"
  disclosure pattern already in this file, not a live-updating view).
- New "How This Was Scored" disclosure: `transcriptConfidence` (mean word
  confidence, low-confidence span count, user-corrected flag) and `llm`
  provenance (provider/model) + `rubricVersion`/`scoringEngineVersion`.
- "Marks — Unvalidated Estimate" copy kept verbatim, per the plan's
  explicit instruction.

### Verified

- `npm run typecheck` clean.
- `npm run typecheck:scripts` / `npm run typecheck:server` — same 2
  pre-existing errors as before this session (`supabaseEnvelopeStore.test.ts`,
  `supabaseTranscriptStore.test.ts`, neither touched); confirmed by
  `git stash`/re-run/`git stash pop` that both predate this session's diff.
- `npm run lint` → 0 errors, same 22 pre-existing warnings, none in touched
  files.
- `npx vitest run src/domain/igcse src/screens/exam src/services/exam
  src/data/exam/bank` → 86 files, 622 tests, all pass (was 85/619 before
  this slice; +1 new file, `ExamResults.test.tsx`, 3 tests — see below).
- `npm test` (repo-wide) → 237 files, 2174/2176 tests pass. Same 2
  pre-existing failures as every prior workstream entry (missing `backend/`
  checkout for `feedbackContractFixtures.test.ts`; unrelated Learn-domain
  corpus assertion in `infer.test.ts`) — neither file touched.
- `npm run score:golden` → 5/5 match.
- `npm run build` → succeeds (pre-existing CSS-minify and chunk-size
  warnings only, neither new).
- New `src/screens/exam/__tests__/ExamResults.test.tsx`: drives a full
  simulated session through the *unchanged* scoring pipeline (same pattern
  as `scoreEndToEnd.test.ts` — real `conductEngine` -> `buildSessionTranscript`
  -> `scoreAttempt` (fake judge) -> `buildEnvelopeView`) to get a real
  `EnvelopeView`, then renders `ExamResults` and asserts every new section
  (hero mode badge, criteria, Turn-by-Turn Breakdown, Live Corrections, How
  This Was Scored) is present; a second case checks the Exam Sim badge and
  that the rail section is correctly absent with no rail entries; a third
  renders the pre-existing scoring-failed path. All 3 pass.
- **Manual, in a real headless browser this session** (Playwright against
  the actual Vite dev server, not just unit tests — the prior W1–W4/W7
  entries above could not do this and said so explicitly): clicked through
  select -> toggle to Exam Sim -> intro -> greeting -> role-play card
  preview -> running, screenshotting each screen. Confirmed: the
  Coached/Exam Sim toggle renders and all 10 sets show (offline-fixture
  fallback, since the backend is unreachable from this sandbox); the
  Exam-Sim-mode explanation card and the "no French voice found" banner
  (headless Chromium genuinely has no TTS voice, so this exercised the real
  branch) both render correctly; the role-play card's 60s countdown and
  5-task-slot indicator render and count down; the running exam reaches the
  first examiner question with no console errors. Did **not** verify a full
  session through real scoring (the scoring service is unreachable from
  this sandbox — the same reason `feedbackContractFixtures.test.ts` is
  skipped) or coached-mode's live rail against a real network call; the new
  `ExamResults.test.tsx` above is what actually exercises a populated
  `EnvelopeView` and the rail-entries section, against the real (unchanged)
  scoring pipeline rather than a hand-built mock. Also not verified live:
  mic-denied path, Firefox's no-Web-Speech text-only path, light mode
  specifically (the app's actual default theme is the warm/cream token
  theme seen in the screenshots, not a light-mode variant of a dark
  default — nothing here suggested a light/dark-mode-specific defect).

### Not done here

W8 (design-token consolidation) — `ExamSelect.tsx`'s exam-card grid and
"Surprise Me" button are still on the pre-token-set classes
(`bg-navy-400`, `text-white`, `text-[10px]`) predating this session, visibly
low-contrast in the headless-browser screenshot taken this session against
this sandbox's light background; this matches the plan's own W8 description
of this era's components as a light-mode liability and was left alone as
explicitly out of this session's scope (W5 + W6 only). `TranscriptReview.tsx`
is the one exception, restyled per the plan's own explicit instruction for
that file.

## IGCSE Exam overhaul — audit fix steps 0 + A + B: scoring server hardening + client retry (2026-09-23)

Context: in a real run the user never got a /40 report. POST /score answered
500, the client treated that as ambiguous, GET answered 202 for the 5-minute
staleness window, and the cycle repeated for up to 3 attempts (10–15 min of
"Still working…"). Step A hardens the server's judge path and makes a failed
attempt answer 404 at once. Step B makes the client re-POST on a definitive
server failure instead of polling. The Render log line for the original
failure was not available this session, so the root cause of the production
500 is still unconfirmed (see "Not verified" below).

### Step 0 — baseline (before any change)

- `npm run typecheck`, `typecheck:server`: clean. `npm run lint`: 0 errors,
  22 pre-existing warnings.
- `npm run typecheck:scripts`: 3 pre-existing errors in 2 test files
  (`supabaseEnvelopeStore.test.ts`, `supabaseTranscriptStore.test.ts`).
- `npx vitest run src/domain/igcse src/screens/exam src/services/exam server`:
  84 files, 581 tests, all pass. `npm run score:golden`: 5/5.
- `npm test` (repo-wide): 2 pre-existing failures, both reading the
  `backend/` checkout (absent here). With `backend/` symlinked to a clone of
  french-coach-backend `e86df01`, `feedbackContractFixtures.test.ts` passes.
  `infer.test.ts` (Learn corpus, "expected 7 to be >= 8") still fails, with
  or without this session's changes. It is unrelated to this work.

### Step A — what changed

- `geminiJudge.ts`: `responseMimeType: 'application/json'` in `config`.
- `judgement/scoreSpeaking.ts`: `stripJsonFence` removes one fence wrapping
  the whole reply before `JSON.parse`. Prose around a fence is still rejected.
  `SCORING_PROMPT_VERSION` → `scoring-prompt-v0.3`.
- `scripts/scoring/scoreAttempt.ts`: on `JudgementValidationError`, one
  fresh `createJudge()` call. Each failure is logged as a JSON line on
  stderr (always, not gated on debug). `judgeAttempts` is logged when a retry
  happened, or under `SCORING_DEBUG`. The envelope shape is unchanged.
  Provider-call failures are not retried here, because `judgeFactory.ts`
  already falls back to Groq.
- `groqJudge.ts` + `server/index.ts` `/health`: the `GROQ_MODEL` default is
  now `openai/gpt-oss-120b`. The judge also sends `reasoning_effort: 'low'`
  (env `GROQ_REASONING_EFFORT`, where `""` disables it) and adds a 512-token
  reserve (env `GROQ_REASONING_TOKEN_RESERVE`), mirroring
  french-coach-backend `main.py`.
- `server/index.ts`: `transcriptStore.save` moved inside the try. On any
  failure, the new `markAttemptFailed()` (`scripts/stt/supabaseTranscriptStore.ts`)
  resets `last_attempt_at` to the epoch. The column is NOT NULL, so the
  epoch is used rather than null. The 500 body is `{error: 'scoring failed',
  code}`, where `code` comes from the new `server/scoringFailure.ts`:
  `judge_invalid_output` | `judge_unavailable` | `internal`.
- `server/resolveQuestionSet.ts` and `loader.ts` both import the new
  Node-safe `src/data/exam/bank/fixtures/index.ts`, which holds all 10 sets.
- New `scripts/authoring/checkFixtureParity.ts`.

### Step B — what changed

- `scoringApiClient.ts`: `ScoringApiError` carries `code` from the error
  body. `isDefinitiveServerFailure(err)` is true only for a 5xx that has a
  `code`. Network errors, timeouts and uncoded 5xx (such as a gateway page
  or an older server) stay ambiguous.
- `examScoringMachine.ts`: new event `SUBMIT_SERVER_FAILED` → `Submitting
  (attempt+1, delayMs 3s then 10s)`, which reaches `FailedTerminal` at
  `MAX_SUBMIT_ATTEMPTS` with `SERVER_FAILED_TERMINAL_REASON`. It shares one
  cap with the 404-resubmit path.
- `ExamMode.tsx`: dispatches `SUBMIT_SERVER_FAILED` for a coded 5xx and waits
  `delayMs` before POSTing. The copy for Submitting at attempt > 1 is
  "Retrying (attempt n of 3)".

### Deviations from the plan text (minor, intended behavior kept)

1. **"Bump the judgement stage `version.ts`"**: the file's only constant is
   `SCORING_PROMPT_VERSION`, which is also the only judgement-stage version
   the envelope records. It was bumped to v0.3 and its doc comment now also
   covers reply parsing. The rendered prompt did not change (the fixture hash
   in `version-pin.test.ts` is unchanged). Goldens: 2 files changed only
   their `scoringPromptVersion` line. Marks and all other fields are
   identical (5/5 after `--update-goldens`, diff checked by hand).
2. Classifying `judge_unavailable` needed a typed error. `judgeFactory.ts`
   now throws `JudgeUnavailableError` (same message) instead of a bare
   `Error`. The classifier lives in `server/scoringFailure.ts` so it can be
   unit-tested, because `server/index.ts` starts a listener on import.
3. The parity script is not wired into `package.json` (the plan calls it
   one-off). Run it with `npx tsx scripts/authoring/checkFixtureParity.ts
   <backend>/data/igcse`.
4. The machine stays pure. The backoff is `Submitting.delayMs` and the timer
   lives in the ExamMode effect. A side effect: every Submitting POST now
   goes through `setTimeout(…, delayMs ?? 0)` with cleanup, so a StrictMode
   double-invoked effect no longer sends two POSTs.
5. `scripts/scoring/__tests__/batchScore.test.ts`: the "isolates a scoring
   failure" fixture now fails both judge calls for its first session, because
   one failing call is now retried. The test's intent is unchanged.

### Verified

- Typecheck (all three), lint and the Step 0 failures are unchanged from
  the baseline. No new errors or warnings.
- `npx vitest run src/domain/igcse src/screens/exam src/services/exam server
  scripts/scoring scripts/stt src/data/exam src/screens/__tests__/ExamMode.scoringRetry.test.tsx`:
  109 files, 763 tests, all pass. `npm test` repo-wide: 2209/2211, with the
  same 2 pre-existing failures as the baseline.
- `npm run score:golden`: 5/5 (version line only, see Deviation 1).
- `npm run build` and `npm run build:server` succeed. The built `dist/server.js`
  was started locally with dummy Supabase env: `/health` → `{ok:true,
  providers:{groq:'not_configured',gemini:'not_configured'}}`, and an
  unauthenticated POST /score → 401.
- New tests:
  - The fence-strip cases (`scoreSpeaking.test.ts`).
  - Gemini JSON mode, and Groq's default, reasoning effort and budget.
  - `JudgeUnavailableError`.
  - `judgeAttempts` retry with a fake judge that fails once (scores from
    call 2), fails twice (throws, 2 logged failures), and a provider failure
    (no retry).
  - `markAttemptFailed` (epoch, user-scoped, never throws).
  - `classifyScoringFailure`.
  - The server resolves and hash-verifies all 10 sets offline and on a 429.
  - Machine transitions, including a full 500 → 500 → 500 sequence with
    13 s of total backoff.
  - The client's coded/uncoded/network/4xx classification.
  - `src/screens/__tests__/ExamMode.scoringRetry.test.tsx`: the real
    ExamMode effect with fake timers. Coded 500s reach the error screen
    10 s after the first POST on resume and 13 s on a manual retry, never
    re-polling. "Retrying (attempt 3 of 3)" shows during the backoff, and an
    uncoded 502 still polls rather than re-POSTing.
- Fixture parity: all 10 fixtures hash-match french-coach-backend `e86df01`
  `data/igcse/*.json`. A hand-mutated copy of set 004 is caught with exit 1.

### Not verified

- **Live end-to-end** against a real scoring service. This sandbox has no
  Supabase credentials or provider keys, and the server requires a real
  `auth.getUser`. The plan's local end-to-end run (a forced 500 via a bad
  `GEMINI_MODEL`) is therefore still owed.
- **The production root cause.** It still needs the Render log line for
  `exam-sim-7d977620…`.
- **Whether the new Groq default and the existing Gemini default are live.**
  french-coach-backend `main.py` records `gemini-2.5-flash-lite` as no
  longer available to new keys. That default was not changed here (out of
  this plan's scope), so set `GEMINI_MODEL` explicitly on the scoring
  service and check `/health`.

### Rollback

Each step is its own commit and reverts cleanly.
- `code` is an additive body field. An older client ignores it. The new
  client against an older server sees an uncoded 500, which it treats as
  ambiguous, which is the old behavior.
- `markAttemptFailed` only writes `last_attempt_at`, and the next `save()`
  re-stamps it.
- The fixture registry move has no behavior change for the browser.

## 2026-09-23 — Production scoring failure root-caused (session exam-sim-7d977620…)

Render log for the real failing session showed every judge attempt (both
attempts, across several POSTs) rejected with
`Role play task rp1: descriptorApplied does not match canonical text for mark 2`,
and a later attempt failing with Gemini 404 (`gemini-2.5-flash-lite` "no
longer available to new users", Google's message recommending
`gemini-3.5-flash-lite`) plus a Groq 429 (8k TPM on-demand tier).

Changes:
- `judgement/schema.ts`: a role-play `descriptorApplied` consisting of one or
  more canonical bullets for that mark, joined only by punctuation/whitespace,
  is accepted. Paraphrase, extra words, or bullets from another mark are still
  rejected (tests added). The error now includes the rejected text (rubric
  wording, not candidate speech) so the next failure is diagnosable from logs.
  `SCORING_PROMPT_VERSION` → `scoring-prompt-v0.4`; prompt text unchanged.
- Gemini default model → `gemini-3.5-flash-lite` (`geminiJudge.ts`,
  `server/index.ts`), taken from Google's own 404 message.

Verified: typecheck, typecheck:server, 707 tests across igcse/exam/server/scripts,
`score:golden` 5/5 with marks unchanged (only the version string moved).

Not verified: that the rejected production descriptor was in fact a bullet
concatenation — the old error message didn't record the text. If it was a
paraphrase, this fix won't cover it; the new error message will show it.
`/health` reported Gemini `ok` while generation 404'd — `models.get` still
resolves a model that new keys can't call, so `/health` is not proof of a
working Gemini path.

## 2026-09-24 — Cambridge 0520 examiner audit, phase 1 step 1: conduct fixes

Scope: `src/domain/igcse/session/conductEngine.ts` only (Step 1 of the
approved P0 implementation plan; full plan covers Steps 1-7, this entry is
Step 1 alone).

Changes:
- `RELEVANCE_WORD_THRESHOLD` 3 → 1: a topic-conversation answer of any length
  (once it clears `didRespond` and isn't a `dont_know`/`repeat_request`/
  `clarification_request`/`non_french` intent) now counts as answered and
  routes through the existing extension-prompt funnel
  (`moveToSecondPartOrExtension` → `moveToExtensionOrAdvance` →
  `decideExtension`), instead of being treated as a non-answer that triggers
  a REPEAT then the alternative question. Role play is unaffected —
  `computeRelevance` already short-circuits to `true` for `part === 'rolePlay'`
  regardless of the threshold.
- `stepRolePlay`'s repeat branch: on a failed second-part attempt of a
  `partsExpected: 2` task (`taskState.partsAddressed === 1`), the REPEAT
  action now re-reads `task.secondPartText` instead of always re-reading
  `task.mainText` (part 1's prompt). Part-1 repeats are unaffected.
- `SESSION_ENGINE_VERSION` `session-engine-v2` → `session-engine-v3`
  (`session/version.ts`); the one hardcoded assertion of the old string
  (`session/__tests__/scoreEndToEnd.test.ts`) updated to match.

Tests added (`session/__tests__/conductEngine.test.ts`):
- `computeRelevance({ didRespond: true, wordCount: 1 }, 'topic1')` is `true`,
  and a one-word topic answer (`"L'été."`) drives the engine to an
  `EXTENSION_PROMPT`, never a `REPEAT` or `READ_ALTERNATIVE`.
- A failed second-part role-play attempt (rp3, `partsExpected: 2`) is
  repeated with `secondPartText`, not `mainText`, then advances to rp4 on a
  second failure.

Verified:
- `npm run typecheck` — clean.
- `npm run typecheck:server` — clean.
- `npm run typecheck:scripts` — 3 pre-existing errors in
  `scripts/scoring/__tests__/supabaseEnvelopeStore.test.ts` and
  `scripts/stt/__tests__/supabaseTranscriptStore.test.ts`, unrelated to this
  change and reproduced identically on a clean stash of these edits.
- `npm run lint` — 0 errors (22 pre-existing warnings, same before/after).
- `npm test` — 2217/2219 passed, 100/100 in `src/domain/igcse/session/`
  (98 pre-existing + 2 new). The 2 failures
  (`src/services/api/__tests__/feedbackContractFixtures.test.ts` — missing
  `backend/tests/fixtures/feedback-contract` directory — and
  `src/domain/learn/demand/__tests__/infer.test.ts`) are pre-existing and
  unrelated to `session/`; reproduced identically on a clean stash.
- `npm run score:golden` — 5/5 goldens match, no shape change (these fixtures
  don't exercise the two conduct paths touched here).

Not in this entry (later steps of the same plan, not yet implemented):
scoring further questions and examiner-support projection (Step 2),
removing unvalidated L1 heuristics from the judge prompt (Step 3), per-task
role-play grounding (Step 4), Exam Sim vs. Coached Practice /
`practiceOnly` (Step 5), results-page fixes (Step 6).

## 2026-09-24 — Cambridge 0520 examiner audit, phase 1 steps 2–4: judge inputs and per-task role play

Scope: Steps 2, 3 and 4 of the approved P0 implementation plan, under one
`SCORING_PROMPT_VERSION` bump as the plan specifies. Files:
`stt/project/toSpeakingTranscript.ts`, `judgement/{types,prompt,schema,version}.ts`,
`guardrails/{quoteVerification,version}.ts`. No change to the conduct engine,
the ConductLog/SessionTranscript format, `evidence/` detectors, `rubric.ts`, or
`envelope/`.

Changes:
- **Step 2, further questions scored.** `toSpeakingTranscript` walks each topic
  part's utterances in order and groups every candidate utterance with
  `questionId === null` under the examiner utterance just before it (the
  FURTHER_QUESTION prompt, callback or authored). Each group is emitted as a
  turn `further1` / `further2`, after Q5. Its `questionPrompt` is that examiner
  text, and duration and `inputMode` are computed as for other turns. These
  answers now reach the judge, the evidence word/duration counts, and the
  envelope's `transcriptSnapshot`. Before this change they were conducted and
  then dropped.
- **Step 2, examiner support projected.** Each scripted topic turn gets
  `examinerSupport: { repetitions, alternativeAsked, secondPartAsked,
  extensionPrompts }`.
  - It is derived from `session.examinerEvents` and the examiner utterance
    text. An event with a null `questionId`, as in an ASR-annotated extension
    prompt, falls back to its utterance's attribution.
  - A further question has null on both, so it is never counted as an
    extension prompt on Q5.
  - `secondPartAsked` is read from an examiner utterance for that question
    whose text matches `secondPartText`, because the second part has no event
    kind of its own.
  - Role-play tasks get `secondPartPrompt` (from `secondPartText`) and
    `repetitions`.
  - All new fields are optional on `ConversationTurn` and
    `RolePlayTaskResponse`, so hand-authored fixtures stay valid.
- **Step 2, prompt.**
  - Each turn now renders `Asked: … | Repeated ×n | Alternative question used:
    '…' | Second part asked: '…' | Extension prompts: n`. A turn with no
    recorded support renders a bare `Asked:` line.
  - Role-play lines render `Second part: '…' | Repeated ×n`.
  - Further turns are labelled `Further question (examiner's choice)`.
  - New marking instructions:
    - (8) judge the first Communication bullet only from the recorded support;
    - (9) the transcript is ASR output, so ignore inaudible spelling
      differences and punctuation;
    - (10) delivery cannot be heard, so best-fit QoL on its other bullets and
      say in the justification that delivery was not assessed.
- **Step 3, heuristics out of the mark.** `PROMPT_EVIDENCE_ALLOW_LIST` is now
  `responseCountsByQuestion` and `topicConversationDurationByConversation`
  only. `timeFrameAlignmentByQuestion`, `fillerDensityByQuestion` and
  `rolePlayPartsByTask` are still computed and snapshotted in the envelope for
  audit, and their files are untouched. Both allow-list snapshots are updated:
  `judgement/__tests__/prompt.test.ts` and
  `guardrails/__tests__/no-uncalibrated-influence.test.ts`.
- **Step 4, per-task role play.**
  - `parseAndValidateJudgeOutput` grounds each RP task's quotes against that
    task's own response, using the new `buildRolePlayTaskCorpora`. This
    applies whatever the span's `source` label; the `EvidenceSource` enum is
    unchanged.
  - Duplicate `taskId`s are rejected.
  - `RolePlayTaskMarkSchema` allows empty `evidenceSpans` only when
    `mark === 0` (zod `superRefine`).
  - `guardrails/quoteVerification.ts` applies the same per-task grounding as
    defence in depth.
- Versions:
  - `SCORING_PROMPT_VERSION` `scoring-prompt-v0.4` → `scoring-prompt-v0.5`,
    with `SCORING_PROMPT_FIXTURE_HASH` re-pinned to `9ffd1c03…a504`.
  - `GUARDRAILS_VERSION` `guardrails-v0.4` → `guardrails-v0.5`.
    `GUARDRAILS_FIXTURE_HASH` does not move, because the pin fixture already
    quotes each task's own words; same precedent as v0.4.

Deviations from the plan (minor, behaviour-preserving):
- The plan named the branch `claude/determined-allen-d311fw`. This session's
  git instructions designate `claude/vibrant-cori-x0fgjx`, and Step 1 was
  already pushed there, so steps 2–4 went there too.
- **Added prompt instruction 11** (role play: quote only from that task's own
  response; a task with no creditable response gets 0 and an empty
  `evidenceSpans`). Without it, a judge following instruction 5 ("for EVERY
  mark decision, quote…") would cite another task's words for a silent task.
  That passed under the pooled corpus but now fails validation on every retry,
  so the attempt would fail instead of scoring the task 0. It ships under the
  same v0.5 bump the plan assigns to Step 4.
- **Changed the Layer 1 evidence header** from "Use it as instructed under
  'Marking instructions'" (no instruction ever referenced it) to "factual
  counts only … context for your judgement". This is the dangling-instruction
  defect from audit item 5, which Step 3 otherwise left in place.
- Further turns are recognised in `prompt.ts` by `turnId` matching
  `/^further\d+$/`. No new marker field was added. Authored ids are `rp*` and
  `t*q*`, and evidence rows are keyed `${conversationId}:${turnId}`, so
  `further1` in topic1 and topic2 don't collide.

Tests added:
- `stt/__tests__/toSpeakingTranscript.test.ts` (5, on a hand-built engine
  ConductLog run through `buildSessionTranscript`):
  - further answers become `further1`/`further2` turns after Q5, carrying the
    examiner's prompt, duration and `inputMode`;
  - no further turns appear where none was asked;
  - repeat, alternative, second-part and extension events land on the right
    turn;
  - a further question is not counted as an extension prompt;
  - RP gets `secondPartPrompt` and `repetitions`.
- `judgement/__tests__/prompt.test.ts` (8):
  - the support line, bare `Asked` line, RP second-part line and further-turn
    label render;
  - instructions (8)–(10) render;
  - the allow-list snapshot now has 2 fields, and the time frame, filler and
    parts sections are absent from the rendered prompt.
- `judgement/__tests__/schema.test.ts` (5):
  - cross-task RP quote rejected;
  - topic quote cited for an RP task rejected;
  - duplicate taskIds rejected;
  - silent task marked 0 with no spans accepted;
  - mark 1 or 2 with no spans rejected.
- `guardrails/__tests__/quoteVerification.test.ts` (1): a cross-task RP quote
  fires `quote_verification_failed`.

Verified:
- `npm run typecheck` and `npm run typecheck:server`: clean.
- `npm run typecheck:scripts`: the same 3 pre-existing errors as the Step 1
  entry, reproduced identically on a clean stash.
- `npm run lint`: 0 errors, the same 22 pre-existing warnings.
- `npm test`: 2236/2238 passed. The same 2 pre-existing failures
  (`feedbackContractFixtures.test.ts`, `learn/demand/__tests__/infer.test.ts`)
  reproduce identically on a clean stash. `src/domain/igcse` + `scripts` +
  `server`: all green.
- `npm run score:golden`: all goldens matched after Steps 2 and 3. After the
  version bumps, 2 goldens drifted (`clean-long-quote-verification`,
  `fabricated-quote`). The diff was only `scoringPromptVersion` and
  `guardrailsVersion` strings, with no shape change, and it was refreshed with
  `--update-goldens`. The goldens are hand-authored `SpeakingTranscript`s, so
  the new projected fields and further turns can't appear in them. Those are
  covered by the toSpeakingTranscript tests above.
- Rendered-prompt spot check: `ORIGINAL_QUESTION_SET_1` was driven through the
  engine with short answers and some silences. Further answers render as their
  own turns in both topics, and support counts match the conduct. rp3 shows its
  second part, and the evidence block carries counts only.

Not in this entry: Step 5 (Exam Sim vs Coached, `practiceOnly`), Step 6
(results-page fixes), Step 7 (ADR 0007, `docs/systems/assessment-engine.md`
allow-list/projection note, root `CLAUDE.md` invariants).

## Exam-mode audit, Phase 1 — Steps 5 & 6

Date: 2026-09-24

Implements Steps 5–6 of the P0-scoring-integrity plan exactly as specified
(Steps 1–4 landed in the two entries above). No file under
`src/domain/igcse/` was touched — this is UI/mode-gating and progression
plumbing only, so none of the version-pinned pipeline stages moved and
`npm run score:golden` needed no `--update-goldens`.

- **Step 5 — Exam Sim is the real exam; Coached still gets a `/40` that
  doesn't count** (revised per this session's instruction: both modes
  produce a full `/40` report, not just Exam Sim).
  - `src/services/exam/attemptStatus.ts` (new): `countsTowardProgress({
    coached, transcript })` — false if `coached`, if
    `transcript.userCorrected`, or if any candidate utterance has
    `inputMode === 'text'`; returns the human-readable reasons for the
    banner. `resolveCoachedMode(requestedCoached, isCompetitiveRun)` forces
    Exam Sim for Daily Challenge/Duel runs regardless of the picker.
  - `src/types/index.ts`'s `Session` and
    `src/services/analytics/analyticsService.ts`'s `StoredSession` both gain
    `practiceOnly?: boolean`. `recordSession()` now copies it through —
    without this, `roadmapService`'s filtering below would read a field that
    never survives the `Session -> StoredSession` projection.
  - `ExamComposer.tsx` takes a new `coached` prop: Exam Sim renders mic-only
    (no textarea, no Send button); if guardian consent is pending in Exam
    Sim (no mic use possible), it shows "Exam Sim needs a microphone —
    switch to Coached Practice to type" instead of an empty bar.
    `ExamRunner.tsx` threads its own `coached` prop through.
  - `ExamMode.tsx`: `handleSubmitTypedTurn` refuses a typed turn unless
    `session.coached` (defence in depth — the composer itself already never
    renders the keyboard in Exam Sim). `coachedMode` now defaults to `false`
    (Exam Sim); `startExam()` and the pre-session `coached` fallback both go
    through `resolveCoachedMode(coachedMode, isDailyChallengeRun ||
    isDuelRun)`. `finishWithScore` computes `attemptStatus =
    countsTowardProgress({ coached, transcript })` and sets
    `Session.practiceOnly = !attemptStatus.countsTowardProgress`.
  - `TranscriptReview.tsx` takes a `coached` prop: Exam Sim renders each
    answer as plain (non-editable) text and a "Submit for marking" button
    plus "In Exam Sim your answers are marked exactly as recorded, like the
    real exam."; Coached keeps the existing editable textarea + "Confirm &
    Finish".
  - `ExamSelect.tsx`'s mode toggle now defaults to Exam Sim and its blurbs
    state the practice-mark/counts distinction; `ExamIntro.tsx`'s per-mode
    copy matches the plan's wording verbatim.
  - `roadmapService.ts`: the exam-derived skill average (`recent.forEach`)
    and the `igcse`/`igcseScore` milestone nodes (`Exam Preview`, `Exam
    Technique`, `Exam Champion`) now filter on `!session.practiceOnly`. The
    pre-existing `/20`-rescale drift this forEach also has (documented in
    root `CLAUDE.md`'s Known Traps and the audit's P2 item 5) was left
    alone — out of this phase's scope, and fixing it would be a scoring
    -meaning change, not a `practiceOnly` filter.
  - `HistoryTab.tsx` shows a small "practice" tag next to a `practiceOnly`
    session's mode label; `Progress.tsx`'s `storedToSession` now carries
    `practiceOnly` through from `StoredSession`.
  - Server-side enforcement for Daily Challenge/Duel submission (rejecting a
    typed/edited envelope in `submit_daily_challenge_attempt`/
    `submit_duel_attempt`) is **not** in this phase, per the plan — noted as
    a follow-up requiring a `french-coach-backend` migration.

- **Step 6 — results page.**
  - `ExamResults.tsx`'s Turn-by-Turn panel no longer renders the `filler
    density` or `time frame:` chips (word count stays).
  - "Transcript confidence" reads "Not measured" instead of a synthetic
    100% when `transcript.stt.provider === 'session-engine'` (the ASR-vs-
    session-engine distinction lives on `SessionTranscript.stt`, already
    passed into `ExamResults` — no `envelope/envelopeView.ts` projection was
    needed).
  - Each criterion mark now shows its denominator (`/2` for a role-play
    task, `/15` for Communication/Quality of Language), plus a `Role play
    N/10` subtotal row above the per-task marks.
  - The per-criterion "Confidence: unassessed" line is removed — every
    criterion's `confidence` is unconditionally the literal `'unassessed'`
    by design (single-run, no standardisation yet — `envelope/types.ts`),
    so the line carried no information.
  - The mode badge and a new banner ("Practice mark — doesn't count" plus
    its reasons) both read `countsTowardProgress` directly, so they're
    correct even before `ADD_SESSION`'s side effects (which set
    `Session.practiceOnly`) have run.

Deviations from the plan (minor, behaviour-preserving):
- This session's own instructions revised Step 5's premise before
  implementation started: both Exam Sim and Coached Practice produce a full
  `/40` report (not just Exam Sim), with Coached tagged `practiceOnly`
  rather than withheld. Implemented exactly as that revision specifies.
- `attemptStatus.ts`'s typed-answer reason string is always plural ("N
  answers were typed"), matching the plan's literal example text, rather
  than grammatically agreeing with `N === 1`.

Tests added:
- `src/services/exam/__tests__/attemptStatus.test.ts` (7): `
  countsTowardProgress`'s four inputs (Exam Sim/coached/edited/typed) and
  their combination; `resolveCoachedMode`'s pass-through vs forced-Exam-Sim
  cases.
- `src/screens/exam/__tests__/ExamComposer.test.tsx` (+2): Exam Sim hides
  the keyboard entirely; Exam Sim + consent-pending shows neither control
  and the "switch to Coached Practice" message. (Existing cases updated to
  pass the new required `coached` prop.)
- `src/screens/exam/__tests__/TranscriptReview.test.tsx` (new, 2): Coached
  edits set `userCorrected`; Exam Sim is read-only with the "Submit for
  marking" copy and confirms the transcript unchanged.
- `src/screens/exam/__tests__/ExamResults.test.tsx` (+2, existing 2
  updated for the new badge/banner text): `/2`/`/10`/`/15` labels and "Not
  measured" confidence render, and the filler/time-frame chips don't; the
  Exam Sim case has no "Practice mark" banner.
- `src/services/progression/__tests__/roadmapService.practiceOnly.test.ts`
  (new, 3): a `practiceOnly` session is excluded from `examResponse`'s
  average and from completing the `igcse` milestone node; a counting
  session does complete it.
- `src/services/analytics/__tests__/analyticsService.practiceOnly.test.ts`
  (new, 1): `recordSession`/`getStats` round-trip `practiceOnly` through
  `StoredSession` — this is what makes the roadmapService filtering above
  non-vacuous.
- `src/screens/progress/__tests__/HistoryTab.test.tsx` (new, 2): the
  "practice" tag renders only for a `practiceOnly` session.
- `useExamCorrectionsRail`'s existing "Exam Sim (coached=false) makes zero
  calls" test (`src/services/exam/__tests__/turnFeedback.test.ts`) already
  locks the "no live feedback in Exam Sim" invariant the plan asked for —
  no new test needed there.

Verified:
- `npm run typecheck`, `npm run typecheck:server`: clean.
- `npm run typecheck:scripts`: the same 3 pre-existing errors reproduced
  identically (unrelated fixture-typing issues in
  `supabaseEnvelopeStore.test.ts`/`supabaseTranscriptStore.test.ts`).
- `npm run lint`: 0 errors, the same 22 pre-existing warnings.
- `npm test`: 2254/2256 passed (2256, up from 2238 pre-Step-5 — 25 new
  tests). The same 2 pre-existing failures
  (`feedbackContractFixtures.test.ts`, `learn/demand/__tests__/infer.test.ts`)
  reproduce identically.
- `npm run score:golden`: all 5 goldens match, no `--update-goldens` run —
  expected, since no pipeline stage under `src/domain/igcse/` changed.
- Manual verification (via the `run` skill) was not performed this session
  — the plan's manual checklist (mic-only Exam Sim flow, extension prompt on
  a short answer, read-only review, further-question turn in the
  Turn-by-Turn panel; typed+edited Coached flow with the "doesn't count"
  banner and "practice" history tag) is recorded here as **not yet run**,
  not as passed.

Not in this entry: Step 7's remaining item beyond what's folded in above —
none; ADR-0007, the `docs/systems/assessment-engine.md` allow-list/
projection note, and the two new root `CLAUDE.md` Known Traps entries are
all included in this same session.

## 2026-09-24 — Manual verification of the P0 plan's live exam flow (Steps 1, 5, 6)

The Step 5/6 entry above recorded the plan's manual checklist as owed. Ran
it against the actual dev server (`npm run dev`), driven headlessly
(`playwright-core` against the container's pre-installed Chromium — no
`chromium-cli`/project run-skill available, so this was a one-off driver
script, not a committed skill) rather than the test suite.

Sandbox constraints (same as prior entries): no Supabase/provider
credentials, `VITE_SCORING_API_URL` unset, and headless Chromium has no
`webkitSpeechRecognition` and no real mic. So the parts of the checklist
that need live speech recognition or a live scoring service (submitting an
Exam Sim session end-to-end to a real judge, seeing an actual `/40` with
`/2`/`/10`/`/15` subtotals, the Coached "doesn't count" banner, the
"practice" history tag) were **not exercised** — those still rest on the
unit/component tests the Step 5/6 entry already lists. What *was*
exercised live:

- **Exam Sim default.** Fresh session -> `/exam` -> `ExamSelect`'s mode
  toggle shows `aria-pressed="true"` on "Exam Sim" with no interaction.
- **Exam Sim is mic-only.** In `ExamSim`, the running screen has 0
  `<textarea>` elements and exactly 1 mic button; the corrections rail
  reads "Sealed until you submit — this is Exam Sim." (no live feedback).
- **The Step 1 fix, live:** switched to Coached Practice (typed input,
  since headless Chromium can't drive real speech), answered role play
  with a full sentence, then answered topic1's first scripted question
  ("Que fais-tu pour aider à la maison ?") with the one-word answer
  "L'été." The examiner's next line was "Donne-moi plus de détails." —
  `AUTHORIZED_EXTENSION_PROMPTS[0]` — not a repeat of the same question and
  not the alternative question. This is the exact behavior
  `RELEVANCE_WORD_THRESHOLD` 3->1 was meant to produce, confirmed against
  the running UI, not just the unit test added for it.
- No console errors from the app itself; the only browser console errors
  were expected sandbox noise (Google Fonts blocked by the proxy's TLS
  interception, `localhost:8000` connection-refused from the coach
  backend/rail not being reachable here).

Not re-verified here (unchanged from the Step 5/6 entry, still owed): the
mic-required messaging path, the full role-play second-part repeat live
(exercised only in the unit test added in the Step 1 entry), and anything
requiring a reachable scoring service.

## 2026-09-26 — Real end-to-end coverage: fake-judge Playwright harness + real Gemini judge check

Two independent pieces of work, both closing gaps the prior entries left
"not yet run" for lack of credentials.

### Part 1 — `npm run e2e:exam`: a committed, reusable Playwright harness

New files: `playwright.config.ts`, `scripts/e2e/fakeScoringServer.ts`,
`e2e/fixtures/fakeSpeechRecognition.js`, `e2e/exam.spec.ts`. `tsconfig.scripts.json`'s
`include` gained `e2e` and `playwright.config.ts` so this is typechecked by
`npm run typecheck:scripts` (verified: only the 3 pre-existing, unrelated
errors in `supabaseEnvelopeStore.test.ts`/`supabaseTranscriptStore.test.ts`
remain). `@playwright/test` added as a devDependency; the harness uses the
container's pre-installed Chromium (`launchOptions.executablePath`), no
browser download.

**`scripts/e2e/fakeScoringServer.ts`** — test-only, never imported by
`server/index.ts` or referenced by `render.yaml`. Mirrors `server/index.ts`'s
`GET /health` / `POST /score` / `GET /score` contract exactly (same status
codes: 200 done, 202 in-progress, 404 not found) so `scoringApiClient.ts`
talks to it unmodified, but skips auth entirely and uses in-memory
transcript/envelope stores instead of Supabase. Runs the **real** production
pipeline otherwise — `parseSessionTranscript` -> `resolveAndVerifyQuestionSet`
(the same one `server/index.ts` uses, offline-fixture fallback, no backend
needed) -> `scoreAttempt` (real evidence extraction, real guardrails, real
envelope building) — injecting a fake judge through the exact
`createJudge: () => CreateJudgeResult` seam `scoreAttempt.ts` already takes
as a dependency (the same seam `server/index.ts` fills with
`createJudgeWithFallback()`). The fake judge returns a **fixed** top-band
mark (`RP_MARK_2`/`COMM_13_15`/`QOL_13_15`, 40/40) but every evidence quote
is pulled live from that request's own transcript (via
`toSpeakingTranscript` + `buildRolePlayTaskCorpora`, computed the same way
`scoreAttempt` computes it internally) — never a hardcoded quote — so real
schema/grounding validation still runs and would still catch a real bug in
that layer. A role-play task with no words is correctly scored 0 with no
spans (Step 4's silent-task rule).

**`e2e/fixtures/fakeSpeechRecognition.js`** — injected via
`page.addInitScript`. Overrides **both** `window.SpeechRecognition` and
`window.webkitSpeechRecognition` — the first debug pass only overrode the
webkit-prefixed one and every turn silently used Chromium's real (headless,
backend-less) `SpeechRecognition`, which never fires a result, surfacing as
`ExamRunner`'s "We can't hear you" dead-end. `start()` fires one final
`onresult` with whatever `window.__fakeSpeechNextAnswer` was set to;
`stop()`/`abort()` fire `onend()` asynchronously — enough of the real
`SpeechRecognition` shape for `useRecording.ts`'s reader.

**`e2e/exam.spec.ts`** — four scenarios, run against a throwaway `vite`
dev server (port 5180) pointed at the fake scoring service via
`VITE_SCORING_API_URL`, both booted by Playwright's own `webServer` config.
No Supabase mocking was needed for Exam Sim/Coached — confirmed empirically
that guest mode (no `VITE_SUPABASE_URL` set) makes no network calls on this
path (`src/lib/supabase.ts`'s client reads a null local session, no fetch).

1. **Exam Sim (spoken)** — drives real role play + two topic conversations
   via the fake recognizer, including a deliberate one-word answer
   ("L'été.") to the first scripted topic question. Asserts, live: the next
   examiner line is one of `AUTHORIZED_EXTENSION_PROMPTS` (Step 1's fix,
   confirmed end-to-end here, not just unit-tested), never a repeat; 0
   `<textarea>`s anywhere (mic-only); the review screen is read-only
   ("marked exactly as recorded"); the final report shows `2/2` per
   role-play task, a `/10` role-play subtotal, and `15/15` per criterion
   (Step 6); no `time frame`/`filler density` text anywhere; the
   Turn-by-Turn panel (expanded via its own disclosure button) includes a
   `FURTHER1`/`FURTHER2` turn (Step 2's further-question projection). A
   guardrail flag ("Not enough spoken evidence...") also fired correctly
   given the short/repetitive scripted answers — the real guardrail layer
   ran, not a stub.
2. **Coached Practice (typed + edited)** — types every answer, edits one
   utterance in the (editable, Step 5) review screen, confirms. Asserts the
   `/40` report shows the "Practice mark — doesn't count" banner with its
   reasons, the "Coached Practice" mode badge, and — navigating to
   `/progress?tab=history` — a "practice" tag on that session in history.
3–4. **Daily Challenge / Duel force Exam Sim** — see the limitation below;
   asserts that `ExamMode`'s two mount-time effects (`isDailyChallengeRun`/
   `isDuelRun`, keyed off `location.state`) skip `ExamSelect` entirely and
   render with the `EXAM SIM` badge, never `COACHED PRACTICE`, when arriving
   via that state shape — reproduced with a `history.replaceState` +
   `page.reload()` (the same state React Router's own `navigate(path,
   {state})` leaves behind), not an app-internal hook.

**Known flake fixed during development** (kept as comments in the spec,
not just here): the mic button is `disabled` for up to ~900ms of examiner
pacing (`examinerPacing.ts`'s leads) between turns, more when a turn emits
several actions back-to-back (e.g. TRANSITION + READ_MAIN); the harness
waits for the button to actually become enabled (and, after submitting,
for either the next turn or the review screen) rather than a fixed sleep —
a fixed-sleep version was flaky under exactly this timing. Global test
timeout raised to 180s (a full spoken run is legitimately ~1–1.5 min).
**Verified stable across 2 consecutive full runs, 4/4 passing both times.**

**Explicit limitation — Daily Challenge / Duel's own start lifecycle is
NOT exercised.** `dailyChallengeService.ts`/`duelsService.ts` gate on
`supabaseConfigured` (`src/lib/supabase.ts`) and this sandbox has no
Supabase project, real or stubbed — so their actual Start buttons
(assignment fetch, `start_daily_challenge`/`start_duel_attempt` RPCs,
later `submit_*_attempt`) were never driven. What tests 3–4 verify is
real and was the thing the audit actually asked for (ExamMode enforces
Exam Sim once such a run begins) — but a regression in
`dailyChallengeService.ts` itself, or in the RPCs' own SQL, would not be
caught by this harness. Standing up a stub PostgREST/Supabase-Auth server
for that full lifecycle was scoped out as materially larger than the rest
of this harness combined, for a payoff (SQL-level daily-challenge/duel
correctness) this plan was never about.

Verified: `npm run typecheck`, `typecheck:server`, `typecheck:scripts`
(pre-existing errors only), `npm run lint` (0 errors, same 22 pre-existing
warnings), `npm test` (2254/2256 — the same 2 pre-existing failures,
unrelated), `npm run score:golden` (5/5, unchanged).

### Part 2 — Real Gemini judge check on 5 scripted transcripts

Confirmed `GEMINI_API_KEY` is present in this environment (39 characters)
via `[ -n "$GEMINI_API_KEY" ]` — the value itself was never read into any
tool output, file, or commit. A throwaway script (not committed — deleted
immediately after the run; nothing in `src/`, `scripts/`, or `server/` was
touched for this) called `createGeminiJudge()` from
`scripts/scoring/providers/geminiJudge.ts` with no `apiKey` option, so the
`@google/genai` SDK read the key from `process.env` itself — this
conversation never saw it. Five hand-authored transcripts (same
`rolePlay`/`topicConversations` shape as
`judgement/__tests__/fixtures.ts`'s `PRACTICE_TRANSCRIPT`, only
`candidateResponse` text varied) went through the real, unmodified
`buildEvidenceProfile` -> `scoreSpeaking` -> real Gemini call pipeline —
model resolved to `gemini-3.5-flash-lite` (the live `GEMINI_MODEL`
default). No production code was changed to make this pass.

| Case | Total /40 | Role play /10 | Communication /15 | QoL /15 |
|---|---|---|---|---|
| 1. Weak | 18 | 8 | 5 (Weak) | 5 (Weak) |
| 2. Middling | 38 | 10 | 14 (Very good) | 14 (Very good) |
| 3. Strong | 40 | 10 | 15 (Very good) | 15 (Very good) |
| 4. Borderline (fluent, frequent basic errors) | 31 | 9 | 11 (Good) | 11 (Good) |
| 5. Very short/poor | 10 | 8 | 1 (Poor) | 1 (Poor) |

Every mark's `evidenceSpans` were genuine verbatim quotes from that case's
own transcript (schema-validated, so a fabricated quote would have thrown),
and each justification named the actual behaviour driving the mark (e.g.
case 5: "only communicates a single basic word per response"; case 4:
"preferring cinema because they do not like running" — correctly citing
that transcript's own opinion+reason). Ordering is monotonic and
directionally sensible (weak < borderline < middling ≈ strong), including
role play correctly crediting short-but-correct answers (a bare "Bonjour."
or "Combien?" scored 2/2, matching the rubric's positive-marking /
concise-answer principle) while still docking single-word non-answers
("Croissant.", "Carte.") to 1/2 for ambiguity.

**One authoring artifact worth naming, not a scoring bug:** case 2
("middling") scored 38/40, nearly identical to case 3 ("strong", 40/40).
The transcript I wrote for "middling" turned out to already be fluent,
accurate, well-formed French with no real errors — the judge scored the
*language actually produced*, correctly, rather than the label I gave the
case. A genuinely middling transcript (accurate but simple, register-flat,
minimal development) would need to be written more deliberately to land
mid-band; this is a caveat about my five hand-written samples, not a
finding about the judge.

**Explicitly not claimed:** this is 5 samples from one session against one
model snapshot — it verifies the real Gemini-backed path *works* and
produces schema-valid, evidence-grounded, directionally sensible output.
It is not a calibration result and says nothing about agreement with a
real examiner (that remains contingent on the real 2025/26 TN booklet +
marked exemplars, per the original plan's explicitly deferred
standardisation phase).

**`GEMINI_API_KEY` was not printed, logged, committed, or exposed at any
point in this work** — only its presence and length were checked, and the
throwaway verification script was deleted after the run.

## 2026-09-27 — 0520 Phase 1 completion, Batch 1: Quality of Language in its own judge call (engine change)

**What changed (implementation steps 1–8 and 10–12 of the approved plan; step 9 token capture, `judge:check`, and log entries a–c are Batches 2–3, not done here):**

- **L2 is two judge calls**, run concurrently in `scoreAttempt` (`Promise.all`):
  `'rolePlayCommunication'` (Tables A+B, full transcript with examiner support, L1 counts allow-list) and
  `'qualityOfLanguage'` (Table C with its CEFR line, the TC best-fit principles and positive marking; topic
  conversations only — no role play, no examiner-support lines, no L1 word counts). `JudgeRequest` gained `kind`;
  real providers ignore it, fake judges switch on it.
- **QoL contract puts `errors` first**: the judge lists every error (`source`, `turnId`, verbatim `quote`, `kind`,
  `correction`), states `errorFrequency` in the booklet's own wording, then best-fits the band. `errorFrequency` is
  recorded, never mapped to a mark (the not-a-formula invariant sits right before the band instructions). The
  no-minor-allowance, no-quantity and quote-rule lines are rendered verbatim and pinned by `prompt.test.ts`.
- **Per-turn grounding for error quotes** (`buildTopicTurnCorpora`, keyed `conversationId:turnId`): a quote must be
  grounded in that one turn's candidate response. Rejected: unknown turn, wrong turn, right id in the other topic, a
  quote straddling two answers, examiner question text, and any `rolePlay` source (errors and QoL evidence spans).
  No accent folding — the strictness is unchanged.
- **Retry per call** (`MAX_JUDGE_ATTEMPTS = 2` each, fresh `createJudge()` per judge call): a bad QoL reply never
  re-runs RP/Communication. `logJudgeAttempts`/`logJudgeValidationFailure` now carry `judgeKind`. A terminal failure
  of either call fails the attempt — no partial marks.
- **Envelope `envelope-v0.4`** (appended to `KNOWN_ENVELOPE_SCHEMA_VERSIONS`): `qualityOfLanguage.errors` /
  `errorFrequency` and `qualityOfLanguageLlm`. **Deviation from the plan's wording, same intent:** the three fields are
  *optional* in the type and zod schema, because a migrated v0.3 envelope never had them and backfilling `[]` would
  falsely assert "no errors found" — absent stays absent (the v0.1→v0.2 `questionSetId` precedent). Every v0.4 writer
  sets all three.
- **Guardrail** `verifyQuotes` also verifies QoL `errors[].quote` per turn → `GUARDRAILS_VERSION` `guardrails-v0.6`.
  `GUARDRAILS_FIXTURE_HASH` did not move (clean fixtures produce no trigger), same as the v0.4/v0.5 bumps.
- **Versions**: `SCORING_PROMPT_VERSION` `scoring-prompt-v0.6`; `version-pin.test.ts` pins two hashes
  (main `59d95748…`, QoL `f1da2708…`). `RUBRIC_VERSION` unchanged — no rubric text changed.
- **Minor implementation adaptations (behaviour as planned):** `scoreSpeaking()` is kept as a no-retry convenience that
  runs both calls against one judge (production goes through `scoreAttempt`); `parseAndValidateJudgeOutput` /
  `JudgeOutputSchema` / `buildJudgementPrompt` are replaced by the per-call functions. Test callers that only needed
  "a valid SpeakingAssessment" now use the `buildValidAssessment()` fixture.

**Verified (this session, branch `claude/vibrant-cori-x0fgjx`):**

- `npm run typecheck`: clean. `npm run typecheck:server`: clean. `npm run typecheck:scripts`: only the 3 errors that
  exist on the untouched base commit (`scripts/scoring/__tests__/supabaseEnvelopeStore.test.ts`,
  `scripts/stt/__tests__/supabaseTranscriptStore.test.ts` ×2) — checked in a clean worktree of 7a97972; not touched.
- `npm run lint`: 0 errors (22 pre-existing warnings, none in touched files).
- `npm test`: 2298 passed, 2 failed — the same 2 pre-existing failures as the baseline run on 7a97972 before any
  change (`learn/demand/__tests__/infer.test.ts`, `feedbackContractFixtures.test.ts`); baseline was 2254 passed.
- `npm run score:golden`: two goldens (`clean-long-quote-verification`, `fabricated-quote`) updated deliberately with
  `--update-goldens`. The diff is exactly the expected fields: `envelopeSchemaVersion` v0.3→v0.4,
  `scoringPromptVersion` v0.5→v0.6, `guardrailsVersion` v0.5→v0.6, new `qualityOfLanguageLlm`, and new
  `qualityOfLanguage.errors` / `errorFrequency`. No mark, band, total, trigger or evidence field moved; the three
  assessment-less goldens are byte-identical. (A first update also moved a fixture justification string I had edited;
  that edit was reverted so the diff is limited to the planned shape change.)
- `npm run e2e:exam` (Playwright against the updated fake scoring server, which answers each call kind): 4/4 passed —
  also confirms `envelopeView`/ExamResults read a v0.4 envelope end to end.

**Explicitly not verified here:** any real-judge behaviour. Whether split A's QoL actually drops to ≤ 9, the
Communication decision-rule signal, retry rates from per-turn grounding on real replies, and the measured cost of the
second call are all Batch 2 (`npm run judge:check`) — nothing in this entry is evidence about them.

## 2026-09-27 — 0520 Phase 1 completion, Batch 2: `judge:check` + measurement (branch `claude/vibrant-cori-x0fgjx`)

**What changed (implementation step 9, the harness, fixtures, offline test, the real 3-run check):**

- **Token usage capture** (`getLastCallMetadata().usage`) added to `geminiJudge.ts` (from
  `response.usageMetadata.{promptTokenCount,candidatesTokenCount,totalTokenCount}`) and
  `groqJudge.ts` (from `response.usage.{prompt_tokens,completion_tokens,total_tokens}`). Optional,
  omitted when the provider's response carries none; never reaches the envelope, logs/`judge:check`
  only.
- **`npm run judge:check`** (`scripts/scoring/judgeCheck.ts`): runs the real
  `buildEvidenceProfile` → both L2 calls (each with its own fresh judge + its own retry, mirroring
  `scoreAttempt.ts`) → `runGuardrails`, against Gemini by default (`--provider groq` available).
  Flags: `--runs` (default 3), `--case`. Prints a per-fixture, per-run table (RP/Comm/QoL/total,
  error count, `errorFrequency`, attempts per call kind), a spread line, and PASS/FAIL against each
  fixture's pass-bar `expect` block; writes a JSON report to `data/reports/judge-check/`
  (gitignored) with token totals and an estimated Gemini cost. Not run in CI.
  - **Rate-limit handling added after the first real run hit it**: the Gemini free tier caps
    `generate_content_free_tier_requests` at 15/min. `runJudgeCallWithRetry` now retries a
    `RESOURCE_EXHAUSTED` (HTTP 429) response using the server's own `retryDelay`, uncounted
    against the per-call `JudgementValidationError` retry (that response was never a judged
    reply); the harness also paces successive runs ~9s apart so the limit is rarely hit at all.
  - **Per-run failure isolation added after the same run**: a terminal failure (rate limit
    exhausted, a call that returns non-JSON after both attempts) no longer crashes the whole
    harness — it's caught, logged, and the remaining runs/fixtures continue. A gated fixture with
    any failed run fails its pass-bar automatically (can't confirm 3-of-3 without 3 completed
    runs).
- **8 fixtures** (`scripts/scoring/judgeCheck/fixtures/*.json`, loaded via `fs` + zod, not a static
  import, so they stay plain JSON): `weak`, `middling-original`, `strong`, `borderline`,
  `very-short` reconstruct the pre-change 5-case experiment already logged above (same marks/
  descriptions, since the exact original wording was never logged); `split-a-strong-comm-poor-
  grammar` and `split-b-accurate-minimal` reconstruct the plan's own split-pair description (its
  exact original transcript and per-run numbers were given in an earlier chat message that is not
  in this session's context — not copied, only the plan's own quoted phrases and figures were
  used); `middling-rewritten` is new. Each file's `description` says exactly what is reconstructed
  vs. quoted vs. new.
- **Offline test** (`scripts/scoring/judgeCheck/__tests__/fixtures.test.ts`, 11 tests, no network):
  every fixture parses, has 5 role-play tasks + 2×2 topic turns, is `original-practice`, and the 4
  gated fixtures carry an `expect` block; `passBar.ts`'s pure evaluator is tested against fake
  run data (max/min bounds, 3-of-3 required, multi-fixture aggregation).
- **One real-judge prompt bug found and fixed by the harness's first live run** (this is what
  `judge:check` is for): the QoL contract's `turnId` placeholder ("<turn id as rendered>") and
  `QOL_QUOTE_RULE_LINE` were ambiguous against the transcript's own "Turn q1" heading — Gemini's
  real reply echoed `"turnId": "Turn q1"` literally, which `validateQolErrors` correctly rejected
  as an unknown turn on every single run (100% failure rate before the fix). Fixed by stating
  explicitly, in both the JSON contract and the quote-rule line, that `turnId` is the bare id
  ("q1"), never "Turn q1". **`SCORING_PROMPT_VERSION` → `scoring-prompt-v0.6.1`** (QoL prompt hash
  changed: `f1da2708…` → `e9b77...`; main-call hash unchanged, confirmed by direct hash
  recomputation). `score:golden` goldens updated deliberately (`scoringPromptVersion` string only,
  no mark/band/trigger moved).

**Fixture iteration (reported, not a scoring-engine change):** two of the eight fixtures needed
more than one iteration to reliably clear their pass-bar, and in both cases the *fixture* was
adjusted, never the prompt or the scorer, per the plan's own instruction not to force a number:
- `weak`: v1/v2 (verb-form and article errors in otherwise complete sentences) landed a stable
  Comm 7-8/QoL 7 — one point over each gate, inside Table C's 7-9 "frequent errors" band. v3
  (near-total loss of sentence structure — isolated words/fragments, no connectors) landed
  Comm 4-5/QoL 1, inside the 1-3 "almost always inaccurate" band, and passed 3/3.
- `split-a-strong-comm-poor-grammar`: v1 (~6-8 audible errors, the plan's own phrases) landed
  QoL 7-11 across runs — borderline between "frequent" (7-9) and "some" (10-12). v2 (a few more
  instances of the same error *types* — infinitive-for-conjugated, "préfère … que") landed QoL 7
  in all 3 runs.

**Real Gemini `judge:check` result — final run, `gemini-3.5-flash-lite`, 3 runs, all 8 fixtures:**

| Fixture | Runs (RP / Comm / QoL / total) | Pass-bar | Result |
|---|---|---|---|
| weak | 9/4/1/14 (×3, identical) | Comm ≤6 and QoL ≤6 | **PASS 3/3** |
| middling-original | 10/15/15/40 (×3) | not gated | reported |
| strong | 10/15/15/40 (×3) | Comm ≥13 and QoL ≥13 | **PASS 3/3** |
| borderline | 10/12/11/33 (×3, identical) | not gated | reported |
| very-short | 7-8/1-2/1-4/9-13 | not gated | reported |
| split-a-strong-comm-poor-grammar | 10/12-14/7/29-31 | QoL ≤9 | **PASS 3/3** |
| split-b-accurate-minimal | 10/7/9/26 (×3, identical) | Comm ≤7 | **PASS 3/3** |
| middling-rewritten | 10/14/15/39 (×3) | not gated (target 8-10) | reported — landed error-free like `middling-original`, same authoring caveat |

**All four gated pass-bar items pass in 3/3** (the plan's stated Batch 2 gate). One
`JudgementValidationError` retry occurred across the 48 real calls in this final run
(`very-short` run 1, main call: "Judge response is not valid JSON" — succeeded on the fresh-judge
retry, attempt 2); no other retries. Token usage this run: 88,065 input + 29,589 output tokens
across 24 attempts (no QoL-call retries) → **estimated cost $0.1004** for the full 8-fixture,
3-run sweep at $0.30/M input + $2.50/M output (unconfirmed against Google's own pricing page —
see the plan's own caveat on the OpenRouter-sourced price). Per-exam net extra from adding the QoL
call is therefore in the same ballpark as the plan's pre-measurement estimate ($0.004-0.007);
this run's own average (~$0.0042/attempt-pair) sits inside that range, though it is not a
production-traffic sample.

**Signal for the plan's own decision rule** (not gated): `split-a`'s Communication (12-14) did not
drop with its grammar — it stayed inside the same 12-14 band `borderline`'s Communication landed
in with fewer errors. Nothing here indicates grammar is contaminating Communication; the plan's
stated trigger for giving Communication its own call ("if A's Communication drops with its
grammar to ≤ 9") did not fire.

**Explicitly not claimed:** these are 8 hand-authored (five reconstructed from a logged
description, two reconstructed from the plan's own quoted phrases with no access to the original
transcript, one new) fixtures against one model snapshot in one session — not a calibration
result, not agreement with a real examiner, and not evidence about any transcript this harness
didn't run. The reconstructed fixtures' exact wording differs from whatever produced the original
pre-change numbers; only the marks/behavior they were built to reproduce are attested here.

**Verified:** `npm run typecheck`, `typecheck:server`: clean. `npm run typecheck:scripts`: only the
same 3 pre-existing errors (untouched). `npm run lint`: 0 errors, 22 pre-existing warnings, none
in touched files. `npm test`: 2313 passed, 2 failed — same 2 pre-existing failures
(`learn/demand/__tests__/infer.test.ts`, `feedbackContractFixtures.test.ts`); 15 new tests added
(provider usage capture ×4, fixture/pass-bar offline suite ×11), all passing. `npm run
score:golden`: 5/5, diff limited to `scoringPromptVersion` v0.6→v0.6.1 on the two
assessment-bearing goldens. `npm run e2e:exam`: 4/4 passed (unaffected by this batch's changes;
re-run for the QoL prompt fix).

**Explicitly not verified here:** Batch 3 (verification-log entries (a) the M/J/26 booklet check
and (b) the pre-change split/rewritten experiment tables, and the `assessment-engine.md` update)
— out of scope for this session, per the plan's own batch boundaries.

## 2026-09-27 — 0520 Phase 1 completion, Batch 3: gate on verbatim pre-change transcripts + docs (branch `claude/vibrant-cori-x0fgjx`)

**(c) Batch 2 correction — the earlier "4/4 pass 3/3" is WITHDRAWN as gate evidence.** Every one of
Batch 2's 8 fixtures was hand-authored: 5 reconstructed only from a logged *description* of the
pre-change experiment, 2 (split A, split B) reconstructed from the plan's own quoted phrases with
no access to the original transcript, and 1 new. Two of the four gated fixtures (`weak`, split A)
were then iterated — edited — until they cleared their pass-bar, which makes a gate meaningless as
a test of the judge. This session re-ran the gate against the **exact verbatim transcripts** the
pre-change single-call experiment used (given directly in this session's task message, copied
without any edits). The 8 iterated Batch-2 fixtures were renamed `<id>-reconstructed` with their
`expect` blocks removed — they still run and report every time (for continuity), but never gate.

### (b) Pre-change experiment (never logged until now)

Model `gemini-3.5-flash-lite`, single-call judge, `scoring-prompt-v0.5`. Per-run marks
(total/RP/Comm/QoL), 5 runs per fixture except split A/split B/middling-rewritten (3 runs):

| Fixture | Runs (total/RP/Comm/QoL) |
|---|---|
| weak | 18/8/5/5, 18/8/5/5, 18/8/5/5, 19/9/5/5, 19/9/5/5 |
| middling-original | 34/10/12/12, 38/10/14/14, 38/10/14/14, 34/10/12/12, 38/10/14/14 |
| strong | 40/10/15/15 ×5 |
| borderline | 31/9/11/11, 30/9/11/10, 31/9/11/11, 32/10/11/11, 31/9/11/11 |
| very-short | 9/7/1/1, 10/8/1/1, 10/8/1/1, 10/8/1/1, 10/8/1/1 |
| split-a-strong-comm-poor-grammar | 33/10/12/11, 35/10/14/11, 35/10/14/11 |
| split-b-accurate-minimal | 24/10/7/7, 21/10/4/7, 18/10/4/4 |
| middling-rewritten | 32/10/11/11 ×3 |

**Finding:** Communication and Quality of Language moved in lockstep in every fixture (same figure,
or within 1 mark, every run) — the single-call judge never separated "how much/how well organised"
from "how accurate." Split A's QoL was 11/15 in all 3 pre-change runs, justified as "minor slips" —
a phrase that appears only in the role-play marking scheme (0520/03/TN, p.10), not anywhere in the
Table C descriptors (p.12). This lockstep-and-borrowed-vocabulary pattern is exactly what the
two-call split (Batch 1) targets.

### This session's verbatim run (post-change, two-call judge, `scoring-prompt-v0.6.1`, `gemini-3.5-flash-lite`, 3 runs each)

| Fixture | Runs (RP/Comm/QoL/total) | Gate | Result |
|---|---|---|---|
| weak | 8/5/7/20, 8/5/7/20, 8/5/10/23 | Comm ≤6 and QoL ≤6 | **FAIL** — QoL 7,7,10 (Comm 5 passes) |
| strong | 10/15/15/40 ×3 (identical) | Comm ≥13 and QoL ≥13 | **PASS 3/3** |
| split-a-strong-comm-poor-grammar | 9/11/11/31, 9/12/11/32, 9/12/11/32 | QoL ≤9 | **FAIL raw, reclassified (a) — see below** |
| split-b-accurate-minimal | 10/4/7/21 ×3 (identical) | Comm ≤7 | **PASS 3/3** |
| middling-original | 10/14-15/15/39-40 | not gated | reported — landed error-free, same as pre-change |
| borderline | 9-10/12-14/11/32-34 | not gated | reported |
| very-short | 6-8/1-2/1/9-10 | not gated | reported (one QoL retry: "not valid JSON", succeeded on attempt 2) |
| middling-rewritten | 10/14/12/36 ×3 (identical) | not gated | reported — landed higher than the pre-change 11, both bands, on a slightly different (though still accurate/simple) rewritten transcript |

**Step 3 classification, applying the plan's pre-decided rules exactly, before any of the above was
tuned:**

- **weak: rule "weak > 6 on Comm or QoL → report it, don't rewrite" applies.** QoL is 7, 7, 10 —
  over the ≤6 bar in 3/3 runs. Communication (5/15) stays inside its ≤6 bar. The judge's own QoL
  justification text (captured directly, verbatim, from two separate runs): *"The performance just
  meets the Satisfactory band descriptors, earning the lowest mark in the range"* (run 1) and *"The
  performance just meets the 'Good' descriptor, placing it at the lowest mark in the band (10)"*
  (run 3, the 10). On this transcript (`"Le weekend je... je regarde télé. Et je... je mange."` /
  `"Sport. Sport est bon."` / `"Mon ami... il est... gentil. Il a un chien."` / `"Nous jouer. Nous
  jouer football des fois."`), the candidate does produce short but grammatically-recognisable
  sentences with present-tense verbs (`regarde`, `mange`, `est`, `a`) — this is a real, reportable
  gap between the ≤6 target and what the judge reads off Table C's own bottom-of-Satisfactory /
  bottom-of-Good bullets, **not fixed this session** per the plan's explicit instruction not to
  rewrite `weak`.
- **split A: rule "QoL 10–12 in any run → classify" applies (QoL was 11 in all 3 runs).** auditErrors
  recall was **5/5 in every run** (all 5 of the transcript's actual audible errors — `je faire`, `on
  jouer`, `on regarder`, `je aime`, `Je prefere le sport que le cinema` — were caught every time,
  with 1-2 additional real errors found beyond the 5: `plein de chose`→`plein de choses` and `au
  jeux video`→`aux jeux video`, both genuine agreement errors, not inaudible-as-ASR items). Reported
  `errorFrequency` was **"some errors" in all 3 runs**. That is recall 5/5 + "some errors" →
  **case (a)**: *"judge applied a defensible booklet reading; the ≤9 bar is UNVALIDATED pending
  Cambridge exemplars."* This is explicitly **not** a prompt failure and gets no prompt change per
  the plan's own rule. **Split A's Communication marks:** 11, 12, 12 (/15) — inside the same 11-14
  band `borderline` (more errors, plainer Communication) landed in, so — as in Batch 2 — nothing
  here shows grammar contaminating Communication; the plan's stated trigger for a third call ("if
  A's Communication drops to ≤9 with its grammar") did not fire.
- **strong and split B pass 3/3 on the verbatim text**, same as their Batch-2 (iterated) fixtures had
  — these two were never edited to pass, so this is confirmatory, not new.
- Every gate result above is reported plainly, including the two failures/reclassifications; neither
  the prompt, the fixtures, nor the pass bar were changed after seeing these numbers.

**Retries:** 2 `JudgementValidationError` retries across 54 total judge-call-runs (48 in the main
16-fixture sweep + 6 in the two targeted re-runs for justification text): `very-short-reconstructed`
run 1 ("Quality of Language judge response is not valid JSON", succeeded on the fresh-judge retry)
and `split-a-strong-comm-poor-grammar-reconstructed` run 2 ("quote not grounded in that turn's
candidate response... 'préférer le sport que'", succeeded on retry). Both occurred on
**-reconstructed** (ungated) fixtures; zero retries on any of the 8 verbatim, gated-or-not fixtures.

**Tokens/cost:** main 16-fixture, 3-run sweep: 176,874 input + 60,594 output tokens, estimated
$0.2045 (48 runs, same $0.30/M-input + $2.50/M-output OpenRouter-sourced, unconfirmed rate as
Batch 2). Two small targeted re-runs (`weak` and split A only, 3 runs each) to capture the judge's
QoL justification text for this log — a diagnostic addition to the harness's *output*, not a
prompt/fixture/pass-bar change — added 22,437 input + 8,315 output tokens, $0.0276. **Session total:
$0.2321** across 54 runs.

**Harness change made this session (reporting only, not scoring behavior):** `judgeCheck.ts` now
captures each run's `qualityOfLanguage.justification` text and prints it per run; a new, optional
per-fixture `auditErrors` field (populated for split A only, from the 5 audible errors named
above) is matched against the judge's returned QoL error list (same source+turnId,
`canonicalizeForMatch`-substring match) and reported as a recall count, never affecting marks or
the pass bar. `fixtures.ts`'s `BaselineSchema` gained an optional `runs: [{total, rolePlay,
communication, qualityOfLanguage}]` array so a fixture can carry the real pre-change per-run
figures instead of one averaged number. Also fixed a pre-existing cosmetic bug in the cost-summary
line (it always printed "(no retries)" regardless of whether any occurred — corrected to actually
check `anyValidationErrors`). None of this touches `src/domain/igcse/`.

### (a) M/J/26 booklet check (done in the planning session; recorded here, not redone)

**Method:** pypdf text extraction of Cambridge 0520/03/TN/M/J/26 (32 pp.). Every one of the 47
frozen strings in `src/domain/igcse/canonical.ts` was searched in pp. 6, 8, 10, 11, 12 after
whitespace-only normalisation.

**Result:** 47/47 exact matches, including U+2019 apostrophes, and the page numbers match (role
play p.10, concise-response p.6, Table-C best-fit p.11, Communication p.11, Quality of Language
p.12). The descriptor text transcribed into `canonical.ts` is therefore unchanged from M/J/24 in
the M/J/26 booklet. The 2024 PDF itself was **not** re-checked in this pass; this result relies on
`canonical.ts`'s own claim that it was manually diffed against M/J/24 at authoring time.

**Non-descriptor differences found between M/J/26 and what the code cites/uses:**
- The code still cites `0520/03/TN/M/J/24` (`rubric.ts`'s `TN_CODE`/`TN_SERIES`) — a live series
  reference now one cycle behind the booklet just checked.
- p.6 step 8 (concise-response guidance) reads "...best fits the candidate's *response*. Then
  award the mark for that band," where p.10 (role play) reads "...best fits the candidate's
  *performance*." The code uses and cites p.10's wording, which is correct for the role-play
  context it's used in.
- The name `AWARD_COMMUNICATION` is used for text that is identical on both p.11 (Communication)
  and p.12 (Quality of Language) — a naming note, not a content problem.

**Not resolved here:** the `UNSOURCED_ALLOWLIST` item `reconfirmation-2025-2027` (`unsourced.ts`)
can now be updated to cite the M/J/26 confirmation instead of asking for one — that's a separate,
small rubric-provenance change, not done in this session.

### Docs updated

`docs/systems/assessment-engine.md`: the `judgement/` bullet under "The three layers" now states
L2 is two concurrent calls (`rolePlayCommunication` / `qualityOfLanguage`), describes the QoL call
as topic-only, error-list-first, per-turn-grounded, with the error list as evidence for a holistic
band fit rather than a formula input, and states the persisted envelope is `envelope-v0.4`. The
evidence-allow-list section's stale "`scoring-prompt-v0.5`" reference is corrected to
`v0.6.1` and now notes the allow-list only reaches the `rolePlayCommunication` call.
`docs/guides/development.md` already documented `npm run judge:check` as of Batch 2; unchanged
here beyond what the fixture rename implies (no doc text named specific fixture ids that changed).

**Verified this session:** `npm run typecheck`, `typecheck:server`: clean. `npm run
typecheck:scripts`: only the same 3 pre-existing errors, unchanged
(`supabaseEnvelopeStore.test.ts`, `supabaseTranscriptStore.test.ts` — both untouched by this
batch). `npm run lint`: 0 errors, same 22 pre-existing warnings. `npm test`: 2317 tests (2 new
offline tests added — a `-reconstructed` fixture's `expect`-block-removal check and split A's
`auditErrors` grounding check), 2315 passed, 2 failed — same 2 pre-existing failures
(`learn/demand/__tests__/infer.test.ts`, `feedbackContractFixtures.test.ts`), unrelated to this
batch. `npm run score:golden`: 5/5, no diff (no prompt/rubric/version change this session, so no
golden movement expected). `npm run e2e:exam`: 4/4 (unaffected by this batch).

## 2026-09-27 — 0520 Phase 1: QoL quantity-balance line for the "weak" regression — TRIED, REVERTED

**Problem:** on the verbatim pre-change `weak` fixture, the previous entry's gate run showed QoL at
7-10/15, over the plan's ≤6 pass bar in 3/3 runs, versus a pre-change 5/15. Hypothesis: the QoL
prompt's `QOL_NO_QUANTITY_LINE` ("Do not reward the quantity of speech... 'Range' means variety of
structures and vocabulary, not length") was being read by the judge as "do not penalise a lack of
language," when Table C (0520/03/TN, p.12) does grade range and completeness, not just error
frequency.

**Change made (one attempt, per instruction):** added a new line, `QOL_QUANTITY_BALANCE_LINE`,
directly after `QOL_NO_QUANTITY_LINE` in `buildQualityOfLanguagePrompt` (instruction 9,
renumbering 9-13 to 10-14), quoting Table C's own 4-6/1-3 band descriptors verbatim and stating that
one-word/fragment answers and sentences missing a required verb form or article count as evidence
under those bullets, while accurate complete sentences are not penalised for being short. No
numbers, counts, or thresholds were added. `SCORING_PROMPT_VERSION` was bumped to
`scoring-prompt-v0.6.2`, the QoL prompt hash pin and its `prompt.test.ts` assertion were updated,
and the 2 assessment-bearing goldens picked up the version-string change only (confirmed via diff
before running the gate).

**Gate run (3 verbatim runs, `gemini-3.5-flash-lite`, all 16 fixtures):**

| Fixture | Runs (RP/Comm/QoL/total) | Guard | v0.6.1 (prior) | v0.6.2 (this attempt) |
|---|---|---|---|---|
| weak | 8/4/7/19, 8/5/7/20, 8/5/7/20 | Comm≤6 and QoL≤6 | QoL 7,7,10 (FAIL) | **QoL 7,7,7 (still FAIL)** |
| strong | 10/15/15/40 ×3 | Comm≥13 and QoL≥13 | PASS 3/3 | **PASS 3/3, unchanged** |
| split-a | 9/14/11/34, 9/11/11/31, 9/12/11/32 | QoL not > 11 | QoL 11,11,11 | **QoL 11,11,11, unchanged** |
| split-b | 10/4/9/23 ×3 | Comm≤7 and QoL≥7 (guard) | Comm 4, QoL 7-7 | **Comm 4 (unchanged), QoL 9,9,9 (up 2, still clears the ≥7 guard)** |

**Outcome, applying the pre-decided SUCCESS rule exactly (all four conditions required, none
renegotiated after seeing the numbers):** weak's QoL is 7, 7, 7 — still over the ≤6 bar in 3/3 runs.
The SUCCESS rule requires weak QoL ≤6 in 3/3 as one of its four ANDed conditions; that condition is
false, so **the overall rule is FAIL regardless of the other three passing**. Per the task's
explicit instruction, this attempt is **REVERTED**: `prompt.ts`, `prompt.test.ts`,
`version-pin.test.ts`, and both goldens are back to their exact pre-attempt (`scoring-prompt-v0.6.1`)
content (confirmed via `git diff --stat` showing only `version.ts` touched, and `score:golden`
reporting 5/5 with no diff after the revert). `version.ts` keeps a "TRIED AND REVERTED" note under
a `v0.6.2` heading so a future session doesn't re-attempt the identical wording without reading why
it didn't work; `SCORING_PROMPT_VERSION` itself is back to `'scoring-prompt-v0.6.1'` — v0.6.2 was
never a released version. **No second wording was tried**, per the one-attempt-only instruction.

**What the judge's own justification text shows (weak, all 3 runs, quantity-balance line present):**
it still explicitly frames the transcript as "just meets the satisfactory level" / "the lowest mark
in the [7-9] band" — i.e. it is choosing the bottom of Table C's Satisfactory band (7-9) rather than
reading down into Weak (4-6) or Poor (1-3), even with the new line telling it that fragments count
as evidence for the lower bands. One justification explicitly cites "present tense verbs and simple
adjectives ('il est gentil', 'il a un chien')" as its basis for placing the candidate in
Satisfactory — the new instruction didn't change which existing structures the judge treats as
sufficient to clear the Satisfactory floor. This suggests the miss is not really about the
no-quantity line's phrasing at all, but about how much credit the judge gives `weak`'s handful of
genuinely well-formed fragments ("il est gentil", "Il a un chien") against the many broken ones —
a different mechanism than the one this attempt targeted. Left as an open finding for a future
session, not re-attempted here.

**Hold-out check — the 8 ungated `-reconstructed` fixtures, QoL spread before (v0.6.1, prior entry)
vs. after (this attempt), before the revert:**

| Fixture | QoL before | QoL after | Move ≥3? |
|---|---|---|---|
| weak-reconstructed | 1-2 | 1-5 | **YES** (+3 on the upper end) |
| middling-original-reconstructed | 15-15 | 15-15 | no |
| strong-reconstructed | 15-15 | 15-15 | no |
| borderline-reconstructed | 11-11 | 11-11 | no |
| very-short-reconstructed | 1-4 | 1-1 | **YES** (-3 on the upper end — but confounded: this run had only 2/3 successful attempts, one run failed terminally on "Quality of Language judge response is not valid JSON" twice, unrelated to the prompt wording change; the 2 surviving runs both landed at QoL 1, same as 2 of 3 pre-attempt runs) |
| split-a-strong-comm-poor-grammar-reconstructed | 7-7 | 7-7 | no |
| split-b-accurate-minimal-reconstructed | 7-9 | 9-9 | no (min moved +2, under the 3+ threshold) |
| middling-rewritten-reconstructed | 15-15 | 13-15 | no (min moved -2, under the 3+ threshold) |

Two fixtures cross the 3+ threshold, both `weak`-shaped cases (weak-reconstructed's near-fragment
transcript, and very-short-reconstructed's single-word answers) — consistent with the change's
target being exactly this kind of transcript, though neither move is large enough or clean enough
(the second is sample-size confounded) to change the overall REVERT decision, since these are
ungated hold-outs, not gate criteria.

**Tokens/cost:** this attempt's gate run: 178,163 input + 60,293 output tokens, estimated $0.2042
across 48 runs (one retry: `very-short-reconstructed` JSON-parse failure exhausted both attempts on
run 2, terminal; one retry on `strong`'s `rolePlayCommunication` call, ungrounded evidence quote,
succeeded on attempt 2; one retry on `split-b`'s QoL call, invalid `bestFitPlacement` enum value,
succeeded on attempt 2 — all three unrelated to the QoL wording change itself).

**Verified:** `npm run typecheck`, `typecheck:server`: clean. `npm run typecheck:scripts`: only the
same 3 pre-existing errors. `npm run lint`: 0 errors, same 22 pre-existing warnings. `npm test`:
2317 tests, 2315 passed, 2 failed — same 2 pre-existing failures, unrelated. `npm run score:golden`:
5/5, no diff (confirms the revert is exact). `npm run e2e:exam`: 4/4.

## 2026-09-27 — JSON-parse reliability follow-up: retry count + debug-gated parse diagnostics

**Context:** a real `judge:check` run (previous entry) hit one terminal failure —
`very-short-reconstructed` failed both attempts of its QoL call on "Quality of Language judge
response is not valid JSON." Investigated the actual production impact before changing anything:
`scoreAttempt.ts`'s `runJudgeCall` already retries a `JudgementValidationError` up to
`MAX_JUDGE_ATTEMPTS` times per call kind, and if a whole `scoreAttempt()` still fails, the client
(`examScoringMachine.ts`) auto-resubmits up to `MAX_SUBMIT_ATTEMPTS = 3` times with backoff before
showing the student anything — so a real exam attempt already gets far more chances than
`judge:check`'s bare 2-attempt harness run suggested, and the transcript is saved throughout. This
isn't "the student gets no score"; it's "may need to wait and retry," already handled. Confirmed
before implementing anything, per `src/domain/igcse/CLAUDE.md`'s plan-first rule.

**Change 1 — retry count, 2 -> 3 (`scoreAttempt.ts`, `judgeCheck.ts`):** `MAX_JUDGE_ATTEMPTS` raised
from 2 to 3 in both the production path and the harness (which explicitly claims to mirror it). A
pure retry-count change — no parsing rule touched. In particular, `stripJsonFence`/`callJudge` in
`scoreSpeaking.ts` still deliberately refuses to hunt for a JSON blob inside surrounding prose (see
its own test, `'still rejects prose around a fenced reply'`) — that design decision was explicitly
NOT reopened, per the user's own instruction ("Don't change any parsing rules").

**Change 2 — debug-gated parse-failure diagnostics, never the reply text:** `JudgementValidationError`
(`schema.ts`) gained an optional `replyDiagnostics?: { replyLength: number; looksTruncated: boolean }`,
populated ONLY at `scoreSpeaking.ts`'s `callJudge()` JSON.parse-failure site (every other
throw site — schema/grounding/range failures — leaves it `undefined`). `looksTruncated` is a cheap
signal (does the parsed-for string end with `}` after trimming?), not a claim about root cause.
`scoreAttempt.ts`'s `runJudgeCall` catch block reads it and, only when
`isScoringDebugEnabled()` (env `SCORING_DEBUG=1` or `--debug`), logs one line via a new
`logJudgeParseFailureDiagnostics` (`observability/logger.ts`) carrying `judgeKind`, `provider`,
`model`, `replyLength`, `looksTruncated` — never the reply text itself, since it can carry the
candidate's own spoken words. The existing always-on `logJudgeValidationFailure` line is unchanged.

**Tests added:** `scoreSpeaking.test.ts` (3: diagnostics present + correct on a parse failure,
`looksTruncated` false when the malformed reply still ends with `}`, diagnostics absent on a
schema/grounding failure). `logger.test.ts` (2: `logJudgeParseFailureDiagnostics` is a no-op when
debug is off, logs the exact fields with no reply text when debug is on — ordered around the
module's one-way debug-enable ratchet, same pattern as the existing `logStage` tests).
`scoreAttempt.test.ts` (updated the old "gives up after the second invalid reply" test to 3
attempts/6 calls; added a new test proving recovery specifically on the 3rd attempt; added 2 tests
for the debug-gated diagnostic line end-to-end, on/off). `batchScore.test.ts`'s
"isolates a scoring failure" test hardcoded the old 4-call (2 kind x 2 attempts) failure window —
updated to 6 calls; this was a real, caught regression (all-good, then all-invalid, then good
across all attempts would have silently made that fixture's "always fails" case start succeeding).

**No envelope/prompt/rubric/guardrails change, no version bump** — retry count and logging are not
scoring behavior, and `score:golden`'s 5/5 no-diff result confirms it.

**Verified:** `npm run typecheck`, `typecheck:server`, `typecheck:scripts`: same pre-existing
3 scripts errors only. `npm run lint`: 0 errors, same 22 warnings. `npm test`: 2325 tests (8 new:
3 scoreSpeaking, 2 logger, 3 scoreAttempt — plus batchScore's existing test updated in place, not
counted as new), 2323 passed, 2 failed — same 2 pre-existing failures. `npm run score:golden`: 5/5,
no diff. `npm run e2e:exam`: 4/4.

## 2026-09-27 — 0520 conduct plan, Batches 0–2: conduct rules spec, repro tests, mode-aware engine (`session-engine-v4`)

**Scope.** Only the conduct engine and its driver: `session/conductEngine.ts`, `session/types.ts`,
`session/version.ts`, `services/exam/simulationSession.ts`, plus one projection fix in
`stt/project/toSpeakingTranscript.ts` (below). No change to `evidence/`, `judgement/`,
`guardrails/`, `envelope/` or `rubric.ts`. New live spec `docs/systems/exam-conduct-0520.md`
(rules cited by Teacher's Notes page, no script text) and ADR 0008.

**Baseline before any change** (`npm ci`, `backend` symlinked to the sibling
`french-coach-backend` clone, not committed): `npm test` 2324/2325, one pre-existing failure
(`learn/demand/__tests__/infer.test.ts`, 8-word floor; `feedbackContractFixtures.test.ts` passes
once `backend/` exists). `typecheck:scripts`: the same 3 pre-existing errors. `lint`: 0 errors,
22 warnings. `score:golden`: 5/5.

**Repro tests, run against the unchanged engine first.** `session/__tests__/conductRules0520.test.ts`
(24 tests, one `describe` per `exam-conduct §N`): 16 failed for the reasons the plan gives, 8
characterization tests passed. Confirmed failure reasons included: 002 t1q2 unanswered twice got
`READ_ALTERNATIVE`; after a skipped t1q5 alternative, silence on the further question re-read
t1q5's alternative with trigger `failed_repeat`; a 40-word part 1 + 4-word part 2 drew an
extension prompt; a 4:10 conversation of 25 s answers (or of typed answers) still got a further
question; the first further question was a callback ("Tu as parlé de « … ». Peux-tu
développer ?"); a Repeat request on an extension prompt or further question moved on instead; a
skipped extension prompt or further question was followed by a `TRANSITION`; Coached got further
questions. UI repros whose fixes are Batch 3 (`ExamRunner` part-2 label and per-part countdown,
`ExamIntro` copy ×4, `ExamSelect` hiding topics in Exam Sim) all failed for the stated reason when
run as plain `it`, and are committed as `it.fails` (7 "expected fail") so the suite stays green;
Batch 3 flips them.

**Engine changes (Batch 2).**
- `ConductPolicy { mode: 'examSim' | 'coached' }` passed to `initConductEngineState` and kept in
  state. `SimulationSession` derives it from `coached`.
- `StepInput.candidateTurn.clockS` (required) = `SimulationSession.getClockS()`.
  `ConductEngineState.partStartS` records each topic's start; the conversation's length is
  `clockS − partStartS`. `topicSpeakingS` (candidate-only time) is gone.
- Further questions: Exam Sim only, when the conversation has lasted ≤ 210 s (`<=`, "3½ minutes or
  less"), authored text only, re-checked after each. Own phase (`ConductPhase` kind `further`) with
  one verbatim repeat, so Q5's sub-state never bleeds into them. Callbacks and conversational memory
  removed (D6); the `callback` trigger stays in the type for old logs.
- Alternatives only for question index ≥ 2 (`FIRST_ALTERNATIVE_QUESTION_INDEX`).
- D9: `alternativeTexts` walked as the alternative's ordered parts, one repeat per part. Current
  content has exactly one alternative per Q3–Q5, so behaviour on it is unchanged.
- Extension decision on the whole answer to the question (`answerWords`/`answerSpeechS` summed over
  answered parts). One verbatim repeat of an extension prompt. Extension cutoff at 240 s is
  wall-clock and Exam Sim only.
- No `TRANSITION` after an unanswered extension prompt or further question.
- `AUTHORIZED_EXTENSION_PROMPTS` comment corrected: they are the notes' own example prompts (D16).
- `SimulationSession` refuses to restore a pre-v4 snapshot (no `policy`/`partStartS`); ExamMode's
  resume effect catches that and discards the snapshot. The proper resume guard (hash + engine
  version, with a message) is Batch 3.
- `SESSION_ENGINE_VERSION` `session-engine-v3` → `session-engine-v4`.

**Projection fix (judge input).** A further question can now be repeated, and `buildFurtherTurns`
previously opened a new `furtherN` turn at every examiner utterance, so a repeat would have produced
a blank `further1` and pushed the answer to `further2`. A verbatim repeat of the open further
question (null `questionId`, same canonical text) now continues that turn. New test fails without
the fix (3 further turns instead of 2). Transcripts from `session-engine-v3` never contain such a
repeat, so their projection is unchanged.

**Known limitation, not changed:** with a multi-part alternative, `examinerSupport.alternativeAsked`
still records only the alternative's first part (it lives in `toSpeakingTranscript`'s support
derivation, read by the judge prompt). No current content has a multi-part alternative.

**Existing tests updated:** `conductEngine.test.ts` (clock added to `driveStep`, advancing by each
turn's duration; floor/C8 assertions read the clock; callback and memory tests removed with the
feature; the failed-second-part test now asserts no `TRANSITION`), `simulationSession.test.ts`
(parity test kept for role play only, plus per-mode policy, clock-driven floor, Coached no-further,
pre-v4 snapshot refusal), `buildSessionTranscript.test.ts`, `scoreEndToEnd.test.ts` (version
string), `ExamResults.test.tsx` (pass `clockS`).

**Verified after the change:** `npm run typecheck` and `typecheck:server`: clean.
`typecheck:scripts`: the same 3 pre-existing errors. `npm run lint`: 0 errors, same 22 warnings.
`npm test`: 2351 tests, 2343 passed, 7 expected-fail (the Batch 3 UI repros), 1 failed (the same
pre-existing `infer.test.ts`). `npm run score:golden`: 5/5, output byte-identical to the baseline
run — no shape change. `npm run e2e:exam`: 4/4.

## 2026-09-28 — 0520 conduct plan, Batch 3: exam flow/UI, and Batch 6: two-candidate hash match

**Scope.** Session A landed Batches 0–2 (conduct rules spec + repro tests + the mode-aware v4
engine, entry above). This session executed Batch 3 (exam flow and UI: the fixed 10:00 prep,
hiding topics/the card before prep, topic announcements, the per-part countdown, the part-2 label,
the `ExamIntro` rewrite, the resume guard, the 409 message) and Batch 6 (`server/resolveQuestionSet.ts`'s
two-candidate hash match). Batches 4/5/7/8 (schema/lint/content/CI/docs sweep) are out of scope for
this session.

**Two engine changes landed here, not in Batch 2** (both flagged as "planned (Batch 3)" or decided
after Batch 2 shipped, per the plan's own Batch 3 section):
- **D5 revised: Coached Practice now always asks both authored further questions per topic, never
  time-gated** (`checkFloorOrAdvancePart`, `conductEngine.ts`) — supersedes Batch 2's "Coached asks
  none" before it reached `main`. Judge input effect: a Coached transcript now carries `further1`/
  `further2` turns it never did before.
- **D13: an in-role `TRANSITION` acknowledgement between answered role-play tasks**
  (`advanceRolePlayWithTransition`), never crossing into topic 1 (that boundary is the UI's own
  "role play finished" line, not an engine action). Judge input effect: none — `TRANSITION` carries
  `questionId: null` and `buildRolePlayTasks`/`countRepetitions` in `toSpeakingTranscript.ts` only
  ever query role-play entries by `questionId`, so these entries are simply never read (confirmed
  by a new test asserting the projection is unaffected).

Per the Assessment-Engine change procedure: `npm run score:golden` matches with no shape change
(the 5 golden fixtures are fixed synthetic transcripts that never reach a further question or a
role-play advance mid-task, so neither change is exercised by them — expected, per the plan's own
note that `score:golden` can't show a conduct-only change). `SESSION_ENGINE_VERSION` stays
`session-engine-v4` (Batch 2's version, not re-bumped — these are the same version's rules settling
before `main`, not a second engine revision).

**Audit #15 (repeat re-reads the currently-awaited part) — confirmed fixed, not re-fixed.** Added
one regression test per repeatable part (role-play part 1, role-play part 2, a topic main question,
a topic second part, and each part of a D9 multi-part alternative — extension prompts and further
questions were already covered by Batch 2's own tests) to
`session/__tests__/conductRules0520.test.ts`. All 7 passed against the unchanged v4 engine on the
first run — no engine fix was needed here; role-play part 2 was already fixed in `session-engine-v3`
(commit `d1b74c0`), and the rest were already correct in v4.

**UI changes:**
- `RolePlayCardPreview.tsx`: `PREP_SECONDS` 60 → 600 (10:00). Exam Sim: fixed countdown,
  auto-advances at 0:00 (no "Begin" button); a "Start now" button is offered instead, which calls
  `onBegin(earlyStart: true)`. Coached: untimed, plain "Begin", no countdown shown. Two-topic
  reminder added to the card copy.
- `attemptStatus.ts`: `earlyStart`/`resumed` added to `AttemptStatusInput`, each with its own
  practice-only reason. `ExamMode.tsx` tracks both in refs (`earlyStartRef`, `resumedRef`, reset on
  retake) and passes them into `countsTowardProgress` at `finishWithScore`. **Also had to pass both
  through to `ExamResults.tsx`** — it independently recomputes `countsTowardProgress` from
  `coached`+`transcript` alone for its own "doesn't count" banner (so the banner is right before
  `ADD_SESSION`'s side effects run), and neither flag is recoverable from the transcript. Missing
  this would have left the results banner silently wrong (showing "counts" when
  `Session.practiceOnly` was actually `true`) — caught by a new `ExamResults.test.tsx` case before
  it shipped.
- `ExamSelect.tsx`: Exam Sim mode now renders a single "Start Exam Sim" button (the existing
  uniform-random pick via `onAutoFallback`) and skips the remote-catalog fetch entirely; Coached
  keeps the full picker (topic areas, sub-topics, role-play titles). `DailyChallenge.tsx`
  (always Exam Sim) no longer previews the assigned set's title/scenario before prep.
- `ExamIntro.tsx`: rewritten from set data — "Paper 3, Speaking" (not "Paper 4"), the real part
  structure and timings (no "three minutes"/"general conversation"), mentions two topic
  conversations and 10 minutes of preparation, never names a topic. Removed the "Hear the card
  first" button, which duplicated the primary Start button's `onStart` call with no different
  behavior.
- `ExamRunner.tsx`: the header countdown now counts down from the CURRENT part's own start
  (`partStartS`, derived from the `ConductLogEntry[]` already passed in — no new prop needed),
  Exam Sim only; Coached shows no countdown. A two-part role-play task's part 2 gets its own
  "· part 2" label (`isSecondPart`, counts `READ_MAIN` entries per `(part, questionId)`).
- Topic/role-play announcements and the scene read aloud (audit #12, TN p.6 #5): `ExamMode.tsx`
  now speaks the role-play `setup` aloud before rp1 (previously never spoken — only shown on the
  card and in the `ExamRunner` header), and speaks an original French "role play finished" line
  plus a topic-transition line at each part boundary (`announceIfPartChanged`, keyed off the
  previous action's `part`). **Known, documented gap:** the topic-transition lines announce that a
  new conversation is starting but do NOT name the actual sub-topic, since `AuthoredTopic.title`
  doesn't exist yet (Batch 4 schema + Batch 5 content) — this is UI-only, unscored, outside the
  ConductLog/hash/judge input either way.
- Resume guard: `RunningSessionSnapshot` gained `questionSetHash`/`engineVersion`
  (`localTranscriptStore.ts`); `ExamMode.tsx`'s resume effect hashes the freshly-resolved question
  set and compares both fields before resuming, discarding (with a one-line banner on `ExamSelect`)
  on a mismatch instead of mixing old/new content or running stale engine state.
- 409 terminal message: `scoringApiClient.ts`'s new `terminalScoringMessage()` replaces a 409's raw
  `"...hash does not match..."` server text with plain language ("this exam's questions were
  updated... please retake"); every other terminal status still shows the server's own message.
- `useRecording.ts`: `onend` now restarts the recognizer (keeping `finalTextRef`) when it fires
  while still recording (`recogRef.current === recog`, i.e. nobody called `stop()`) instead of
  silently ending the turn and dropping the rest of the answer — a real Bug 3 contributor per the
  plan's Batch 3 section. Also moved `recogRef.current = null` to BEFORE calling `recog.stop()`
  (was after) so the same `recogRef.current === recog` check reads correctly even when a
  recognizer's `stop()` invokes `onend` synchronously (true of every fake recognizer in this
  file's own test suite, and not excluded for real engines either).

**Batch 6 — `server/resolveQuestionSet.ts`:** `resolveAndVerifyQuestionSet` now hashes BOTH
candidates (remote and in-repo fixture, whichever exist) and accepts whichever matches the
transcript's declared `questionSetHash`, instead of only ever trying the first-resolved candidate
(remote-first) and failing permanently if the deploy has already updated one source but not the
other. `resolveQuestionSet` (used everywhere else) is unchanged — still remote-first,
fixture-fallback. New tests in `server/__tests__/resolveQuestionSet.test.ts` cover: fixture hash
matches when the remote serves different content, remote hash matches when the fixture is stale,
and the mismatch error still fires when neither matches.

**Tests added/changed:** `session/__tests__/conductRules0520.test.ts` (D5 test rewritten for the
revised policy; role-play prompt-count characterization updated to exclude `TRANSITION` entries
from the "scripted prompts" count; new "audit #15" describe block, 7 tests); `conductEngine.test.ts`
(role-play `driveOne`→`driveStep` at every call site where an advance now emits
`[TRANSITION, READ_MAIN]`, i.e. everywhere except a second-part delivery or a failed-repeat
advance; "never emits TRANSITION during role play" rewritten to assert the new, intended
behaviour); `simulationSession.test.ts` (Coached further-question test rewritten for D5);
`buildSessionTranscript.test.ts` (the `annotateExaminer` cross-check now matches by `utteranceId`,
not array index, since `TRANSITION` utterances during role play break the old 1:1 index alignment);
`ExamSelect.test.tsx`, `ExamIntro.test.tsx`, `ExamRunner.test.tsx` (Batch 1's 7 `it.fails` all
flipped to normal, passing `it`s, plus new Coached-still-shows-catalog / "part 2" absent-when-
first-time / Coached-no-countdown cases); `ExamResults.test.tsx` (2 new: `earlyStart`/`resumed`
banners); `attemptStatus.test.ts` (2 new); `scoringApiClient.test.ts` (2 new: `terminalScoringMessage`);
`useRecording.test.tsx` (1 new: onend-restarts-mid-recording); `resolveQuestionSet.test.ts` (3 new,
Batch 6).

**`e2e/exam.spec.ts` updated per the plan's §6:** `enterExam`'s Exam Sim path now clicks
"Start Exam Sim" (no set grid) and "Start now" (not "Begin") — the full multi-turn flows use the
practice-only escape hatch rather than driving Playwright's fake clock through the ENTIRE exam
(examinerPacing's own real `setTimeout` waits, TTS, etc.), which would be a lot of surface to keep
synchronized with a faked clock for no assertion gain, since D3 conduct itself doesn't change.
Both full-flow tests' assertions updated accordingly (Sim now expects "practice mark" + the
`earlyStart` reason; Coached gains a `further1`/`further2` presence assertion per D5, plus a loop
cap raised 40→50 to fit the 4 extra always-asked further-question turns). A NEW, separate, short
test (`Exam Sim prep countdown (D3)`) covers the real countdown path: `page.clock.install()`
before navigation (a clock installed after `RolePlayCardPreview` already created its real,
unfaked `setInterval` can't see or fast-forward it), then `runFor` (not `fastForward` — the latter
jumps straight to the end and fires the interval once, which would never satisfy the component's
`remainingS === 0` equality check) in two steps, confirming the on-screen countdown itself
moves (`9:30` after 30s) before relying on it to auto-advance at 0:00 into a COUNTING (non-
practice-only) running exam. **Verified: `npm run e2e:exam` — 5/5, including this new test
(20.5s).**

**Verified:** `npm run typecheck`, `npm run typecheck:server`: clean. `npm run typecheck:scripts`:
the same 3 pre-existing errors (unrelated: `supabaseEnvelopeStore.test.ts`,
`supabaseTranscriptStore.test.ts`). `npm run lint`: 0 errors, same 22 pre-existing warnings.
`npm test`: 2374 tests, 2373 passed, 1 failed — the same pre-existing `infer.test.ts` floor
failure (unrelated to this plan); zero expected-fails remain (all 7 from Batch 2 flipped to
passing `it`s). `npm run score:golden`: 5/5, byte-identical to the Batch 2 baseline — no scoring
shape change. `npm run e2e:exam`: 5/5 (see above).

**Manual verification (the `run` skill):** one Exam Sim run and one Coached Practice run driven
live — see the session's chat summary for what was observed; not re-transcribed here since it
covers UI/UX impressions rather than a specific claim this log needs to preserve.

**Known gaps carried forward, not fixed here (out of scope for Batches 3/6):** topic announcements
don't name the actual sub-topic (needs Batch 4's `AuthoredTopic.title` + Batch 5 content); the
candidate card has no English gloss in Coached (D14's "English instructions" half); Batches 4/5/7/8
(schema/lint rules, the 10-set content rewrite, CI, and the doc/CLAUDE.md sweep for those) are
untouched.

## 2026-09-28 — 0520 conduct plan, Batches 4–5: question-bank rules and the 10-set content rewrite

**Scope.** Batch 4 (schema + authoring rules) and Batch 5 (all 10 sets rewritten, fixture
generator, originality check, G2 review sheet), across both repos on
`claude/igcse-0520-conduct-rules-e4npbq`. No scoring code changed (`evidence/`, `judgement/`,
`guardrails/`, `envelope/`, `rubric.ts`, `conductEngine.ts` untouched). What changes for scoring is
the *content* new sessions run on, so the judge sees different questions and more two-part turns —
intended, per the plan's "what 'don't change scoring' covers" note.

**Rules (Batch 4).**
- Runtime validator (`validate.ts`, fatal; mirrored in `backend/models/igcse.py`):
  `topic-area-slot`, `alternative-on-q1-q2`, `roleplay-alternative`, `sub-topic-not-in-area` (closed
  Syl p.14 enum, `SUB_TOPICS_BY_AREA`), plus required `AuthoredTopic.title` and
  `rolePlay.examinerRegister` (both unhashed). The backend also gained topic/question tag agreement
  and topic question `part` checks, which the TS validator already had.
- Authoring-only pattern lint (`patternLint.ts`, run by `authoring:check`, D12): errors
  `two-part-position`, `roleplay-two-part-count`, `q3-q5-time-frames`, `echo-choice`,
  `trivial-closing`, `loaded-negative`; warnings `register-mismatch`, `yes-no-question`,
  `assumed-experience`. `expectedTimeFrame` already had `future` and `conditional`, so
  `q3-q5-time-frames` needed no hashed-tag change.
- Corpus lint: `thin-sub-topic`, `duplicate-sub-topic-slot` (max 2 per slot),
  `duplicate-area-subtopic-pair`; `cross-set-duplicate-alternative` now compares only an
  alternative's first part (D9); pair coverage is keyed ordered topic1+topic2.
- `lint.ts`'s `time-frame-monotony` warning now accepts a conditional as the forward frame (same as
  `q3-q5-time-frames`). `check.ts`'s legacy-overlap exemption for 001 is removed.
- Every new rule has a passing and a failing test (`patternLint.test.ts`, `validate.test.ts`,
  `corpusLint.test.ts`; backend `tests/test_igcse_content.py`).

**Content (Batch 5).** All 10 sets rewritten to the new `corpus-matrix.md` (ids kept, D11): topic 1
always A/B, topic 2 always C/D/E, six legal area pairs, no sub-topic pair repeated, each role-play
area twice, 5 *tu* / 5 *vous* role plays, 2–3 two-part role-play tasks among rp3–rp5, two-part
topic questions only among Q3–Q5, alternatives keep the main question's shape. Every set's hash
changed (first 12 hex): 001 `bf2f5f398fb3`, 002 `4644f9619e2c`, 003 `2274545efa8e`, 004
`32d33b01c5af`, 005 `96e93375813c`, 006 `a19c8e5b7014`, 007 `24f5f2544818`, 008 `31f7277bf7cc`,
009 `84789ef4ce99`, 010 `9737c22285cd`. `seed_igcse_questions.py --dry-run` computed the same ten
hashes in Python, so the TS and Python canonicalizations still agree on the new content.
- `review.status: approved` / `reviewedBy: internal:claude`, with notes saying G2 native-speaker
  review and the originality check are PENDING — "do not seed or merge before" them. `approved` is
  required for sets to load at all.
- **Originality check NOT run against the notes.** `scripts/authoring/originalityCheck.ts` exists
  and is tested (synthetic text; refuses paths inside either repo), but the Teacher's Notes PDF was
  not available in this session's container, so there are no first-run/final findings yet.
- G2 sheet: `docs/guides/review/0520-g2-review.md`, generated from the JSON with an English gloss
  per line (`docs/guides/review/0520-g2-glosses.json`).

**Other changes.** `ExamMode.tsx` now names each topic when its conversation starts, from
`AuthoredTopic.title` (`src/screens/exam/examAnnouncements.ts`; closes Batch 3's documented §5
gap). `conductRules0520.test.ts` updated to the new 001 shape (rp3–rp5 two-part; topic-1 Q3 and Q5
two-part) — the Q1–Q2 "alternative anyway" case now uses a synthetic variant, since content can no
longer carry one. No engine assertion changed meaning.

**Verified.**
- `npm run authoring:check` (no `--draft`): 0 errors, 0 warnings across 10 files.
- `npm run authoring:parity`: 10/10 fixtures match the backend JSON.
- `npm run typecheck`, `npm run typecheck:server`: clean. `npm run typecheck:scripts`: the same 3
  pre-existing errors. `npm run lint`: 0 errors, the same 22 pre-existing warnings.
- `npm test`: 2438 tests, 2437 passed, 1 failed — the same pre-existing `infer.test.ts` failure.
- `npm run score:golden`: 5/5, output byte-identical to the pre-change baseline.
- `npm run e2e:exam`: 5/5.
- Backend `pytest tests/ -q`: 272 passed, 1 failed — `test_transcribe_endpoint.py::
  test_transcribe_rejects_a_bogus_bearer_token` (503 vs 401), which fails identically on untouched
  `main` (238 passed, 1 failed). `test_hash_question_set.py` is now collected (it had no `test_`
  function). The new JSON also passes the pre-change pydantic model, so backend commit 1 is green
  on its own.

**Still needs a human.** G2 native-speaker review (required before seeding or merging); the
originality run against the notes text; G3 teacher exam-realism review (optional).

**Deploy-order consequence (found while checking the resolver).** `server/resolveQuestionSet.ts`
drops a remote set that fails validation (`fetchPublishedSet` returns `null`), and the old seeded
content fails the new validator (free-text sub-topics, no titles). So once this code is deployed,
the pre-rewrite remote content is no longer a hash candidate. Re-seed the hosted content **before**
deploying this commit: the pre-change TS validator and pydantic model both accept the new JSON
(checked), so the live old build scores both old- and new-content sessions during that window.

## 2026-09-28 — 0520 Batch 5 follow-up: originality check run against the Teacher's Notes

**Scope.** The June 2026 0520/03 Teacher/Examiner Notes PDF was supplied after the entry above.
It was extracted to text in the session scratchpad (outside both repos; never committed) and used
for three things: the originality check, a manual comparison with the notes' scripts, and a check
of the pattern-lint rules against the real cards and topics.

**Originality check** (`scripts/authoring/originalityCheck.ts`, 5-gram overlap + line similarity
≥0.6). First run: **41 findings** (33 five-gram, 8 similar-line) across all 10 sets. Most were
common French frames ("qu'est-ce que tu …", "quand tu étais petit(e)", "C'était comment ?"), but
every flagged item was rewritten. Final run: **0 findings**. A stricter self-check at ≥0.45 left
only generic fragments ("Et les inconvénients ?", a title "Les loisirs").

**Manual comparison found closer copies than the checker could see:**
- 004's role play (a summer job at a campsite) and 010's (phoning a language school) mirrored two
  notes cards' situations and question order, with different wording. Both were replaced with new
  scenarios: a work placement in a sports shop (D) and a guided tour in Quebec (E).
- Several topic questions mirrored a notes question plus its alternative (e.g. the job you wanted
  as a child; an interesting vs a well-paid job; your ideal home; recycling this week; food at
  celebrations; activities after an outing). All rewritten.
- content-authoring §5 and corpus-matrix.md now say never to re-use a notes card's scenario, or a
  topic question with its alternative, since the originality check only sees wording.

**Pattern rules checked against the notes.** Across the 9 cards: 2–3 two-part tasks, always among
rp3–rp5 (`two-part-position`, `roleplay-two-part-count` hold). Across the 7 topics: no alternative
on Q1–Q2, alternatives on Q3–Q5 keeping the main question's shape, including multi-part ones (D9),
and a past and a future/conditional among Q3–Q5 (`q3-q5-time-frames` holds). One rule was wrong:
**every scenario is read in *vous*, even for friend roles**, so `register-mismatch` now expects
`setup` in *vous* and applies `examinerRegister` to the tasks only. The five *tu* sets' setups
were rewritten in *vous*. content-authoring §3 updated.

**New hashes** (first 12 hex; Python seed dry-run and TS parity agree): 001 `30708da138d2`, 002
`d362bfc8631a`, 003 `e48f9f1a94fe`, 004 `7e574ecc00cc`, 005 `718fe2610d9f`, 006 `57649524e1ae`,
007 `0b10dc4e3bd0`, 008 `deb9d877753e`, 009 `ec3dd3ebc53c`, 010 `235516059200`. The pre-change TS
validator and pydantic model still accept every revised set, so the re-seed-before-deploy order
above still holds.

**Verified.** `authoring:check` 0 errors/0 warnings; `authoring:parity` 10/10; typecheck and
typecheck:server clean, typecheck:scripts the same 3 pre-existing errors; lint 0 errors/22
pre-existing warnings; `npm test` 2439/2440 (the pre-existing `infer.test.ts` failure);
`score:golden` 5/5 byte-identical to baseline; `e2e:exam` 5/5; backend pytest 272 passed, 1
pre-existing failure. Review notes now record the originality check as clean; G2 native-speaker
review remains PENDING.

## 2026-09-29 — 0520 conduct plan, Batches 7–8: CI, backend CI root cause, duel-expiry SQL, docs

**Batch 7 — `.github/workflows/ci.yml` (first frontend CI).** Checks out the public
`RXcodeWalker/french-coach-backend` into `backend/` (same-named branch if `git ls-remote` finds it,
else `main`), then `npm ci`, `typecheck`, `typecheck:server`, `lint`, `vitest run src/data/exam
src/domain/igcse src/services/exam src/screens/exam`, `authoring:check`, `authoring:parity`.
Reproduced locally first with `backend/` symlinked to the sibling clone: typecheck and
typecheck:server clean; lint 0 errors / 22 pre-existing warnings; targeted vitest 93 files / 825 tests
pass; `authoring:check` 0 errors / 0 warnings over 10 files; `authoring:parity` "All 10 fixture(s)
match the backend JSON."

**Full `npm test` — NOT widened into CI.** With `backend/` present: 2440 tests, 2439 pass, 1 fails —
`src/domain/learn/demand/__tests__/infer.test.ts` "never produces a sufficientAnswer under the
8-word validator floor across the real corpus". Cause: Learn question `ani_21` ("Est-ce que tu es
allergique à des animaux ?") infers `sufficientAnswer` "A complete answer should: Discuss pet
allergies." = 7 words. Not an exam-surface issue; reported, not skipped or patched here. (The other
formerly-known failure, `feedbackContractFixtures`, passes once `backend/` exists.)
`typecheck:scripts` and `score:golden` / `e2e:exam` are not in CI (unchanged; no engine code
touched this batch).

**Backend CI — root cause of `test_transcribe_rejects_a_bogus_bearer_token`.** It asserted 401 but got
503. `lib/auth.py`'s `decode_supabase_jwt` raises 503 "Auth not configured on server" when neither
`SUPABASE_JWT_SECRET` nor `SUPABASE_URL` is set, before it looks at the token. CI has no `.env`, so
the 401 branch was unreachable; it only passed on machines with a `.env`. It is a test-setup bug,
not a product bug (503-when-unconfigured is intended). Fix: the test now
`monkeypatch.setattr(main, "SUPABASE_JWT_SECRET", …)` like the other auth tests. `env -u
SUPABASE_JWT_SECRET -u SUPABASE_URL pytest tests/ -q`: 273 passed. Backend CI run 47 on the branch:
success.

**D11 — expire open duels (written, NOT run).** `backend/supabase/ops/expire_open_duels_at_deploy.sql`
(outside `migrations/` on purpose). Read `20260814140000_phase2_duel_tables.sql` and
`20260814140100_phase2_duel_rpcs.sql` first: open = `pending`/`accepted`; `expired` needs
`completed_at`, no winner, `is_tie=false`. It sets those on open duels for `original-practice-%`
sets, deliberately NOT via `resolve_expired_duel` (which would award a forfeit win + XP to a lone
submitter). Has a preview query and ends in `ROLLBACK` until edited to `COMMIT`. Not exercised
against any database.

**Batch 8 — docs.** CLAUDE.md: added Known Traps for the UI-spoken role-play `setup` (unhashed,
never a conduct-engine action) and for the exam-surface-only CI + its `backend/` dependency. The
other Batch 8 items (mode-aware engine, wall-clock 3½-min rule, part 2 always asked, area-slot
rule) were already present from Batches 2–5 and were left as they are. `docs/systems/topology.md`
CI section and `docs/guides/development.md` suite 1 no longer say "no frontend CI". README does not
describe the exam, so it is unchanged.

## 2026-09-29 — G2 waived by owner; naturalness self-review pass over the 10 sets

**Waiver.** The owner waived the G2 native-speaker review for `original-practice-001`–`010`. In all
10 backend JSON sets `review.notes` had "G2 native-speaker review PENDING — do not seed or merge
before it." replaced with "G2 waived by owner 2026-09-29; content is machine-authored and
self-reviewed (G1)."; `reviewedAt` set to 2026-09-29. ADR 0008 got an "Amendment — 2026-09-29"
section; `content-authoring.md` §14 step 6, §15 (table + a waiver paragraph) and §16 (new
naturalness item) and the review-sheet header (`reviewSheet.ts` `G2_HEADER`, regenerated
`docs/guides/review/0520-g2-review.md`, glosses for every changed line) were updated to match. The
waiver is per set; G2 remains the gate for any new or changed set. The content is **not**
native-reviewed.

**Extra naturalness pass (G1), all 150 spoken items** (10 setups, 50 role-play tasks + second
parts, 100 topic questions + second parts, alternatives and 40 further questions), read as an
examiner would say them aloud. 23 lines changed (id: before → after):
- 001 t2q5: "…comment sera le temps dans ta région…" → "…quel temps fera-t-il dans ta région dans cinquante ans ?"
- 001 t2q5 alt: "…plus froid plus tard chez toi ?" → "Dans vingt ans, fera-t-il plus chaud ou plus froid chez toi ?"
- 002 t1q5: "Quelle chose changerais-tu chez toi si c'était possible ?" → "Que changerais-tu chez toi si c'était possible ?"
- 004 setup: "Je suis le/la responsable du magasin." → "Je suis responsable du magasin." (no slash form read aloud)
- 004 further: "Que sais-tu sur un pays francophone ?" → "Que sais-tu d'un pays francophone ?"
- 005 t1q5 alt: "Où vas-tu habiter plus tard ?" → "Où aimerais-tu habiter plus tard ?"
- 005 t2q3 alt: "…à l'âge de sept ans ?" → "Quel magasin aimais-tu quand tu avais sept ans ?"
- 005 t2q4 alt: "Quel endroit n'existe pas dans ta ville ?" → "Y a-t-il assez d'activités pour les jeunes dans ta ville ?"
- 005 t2q5 alt: "Que voudrais-tu avoir de nouveau dans ta ville ?" → "Quel nouvel endroit voudrais-tu dans ta ville ?"
- 006 t2q5: "…si tu pouvais faire n'importe lequel ?" → "Parmi tous les métiers, lequel choisirais-tu ?"
- 006 further: "Que penses-tu du travail à la maison ?" (ambiguous: housework?) → "…du télétravail ?"
- 007 t2q5: "…aimerais-tu vivre un jour ?" → "…aimerais-tu connaître un jour ?"
- 008 rp4 part 2: "Pourquoi c'est important pour toi ?" (register mix) → "Pourquoi est-ce important pour toi ?"
- 008 t1q3: "Raconte comment tu as préparé un repas toi-même." (assumed experience) → "Raconte-moi un repas que tu as préparé ou aidé à préparer."; part 2 and the alternative's part 2 "Qui t'a aidé(e) ?" (contradicted "toi-même") → "Qui était avec toi ?"
- 008 t2q1/q2: "Qui sont tes voisins ?" → "Comment sont tes voisins ?"; q2 (now a duplicate) → "Comment est l'ambiance dans ton quartier ?"
- 008 further: "…personnes âgées de son quartier ?" → "…de ton quartier ?"
- 009 t1q1: "Comment es-tu de caractère ?" → "Comment est ton caractère ?"
- 009 t1q4 alt part 2: "C'est important pour toi ?" → "Est-ce important pour toi ?"
- 009 t2q5: "…si tu avais le pouvoir ?" → "Que ferais-tu pour protéger les animaux, si tu en avais le pouvoir ?"
- 010 t1q3 alt part 2: "Il était comment ?" → "Comment était-il ?"
- 010 further: "…pour les étudiants ?" → "…pour les jeunes ?"

My first pass of these edits tripped `corpus-overused-stem` (over 3 sets for "Parle-moi d'un" and
"Si tu"); three of the rewrites were re-phrased (008 t1q3, 002 t1q5, 006 t2q5, 009 t2q5) so the
stems are back within the limit, rather than loosening the lint.

**Gates after the pass:** `authoring:generate` (10 fixtures), `authoring:check` 0 errors / 0
warnings, `authoring:parity` "All 10 fixture(s) match the backend JSON", targeted vitest 93 files /
825 tests, `typecheck` clean, `lint` 0 errors / 22 pre-existing warnings, backend `pytest tests/` 273
passed. All content hashes changed (as expected for any wording change; nothing is seeded yet).

**Not re-run:** the local-only originality check. The Teacher's Notes text is not in this container,
so the 23 rewritten lines were not re-checked against it; they are generic rewordings of earlier
clean lines, but re-run `originalityCheck.ts` against your extraction before seeding.

## 2026-09-29 — 0520 content: originality re-check after the naturalness pass

Re-ran `scripts/authoring/originalityCheck.ts` against a text extraction of the June 2026
Teacher's Notes (kept in the session scratchpad, outside both repos; not committed).

- First run: 1 finding — `original-practice-008` `topic1.questions[2].mainText`, one shared
  5-gram (a line reworded in the naturalness pass).
- Fix: reworded that main question only (same meaning, time frame, two-part shape and
  alternative). Gloss and G2 sheet regenerated.
- Final run: 0 findings (0 five-gram, 0 similar-line).

Gates after the fix: `authoring:generate` (10 fixtures), `authoring:check` 0 errors / 0
warnings, `authoring:parity` 10/10, targeted vitest (`src/data/exam`, `src/domain/igcse`,
`src/services/exam`, `src/screens/exam`, `server`) 853/853, `typecheck` clean, backend
`pytest tests/ -q` 273 passed, `e2e:exam` 5/5.

## 2026-10-03 — Phase 3 Batch 0: examiner-feedback security

The examiner branch of `/api/feedback` (`/v2`, `/v3`) relayed a client-built `prompt` to the
model unchanged: no length cap, no quota, Gemini fallback under the coach `SYSTEM_PROMPT`.

**Changed (backend):** `ExaminerFeedbackRequest` (`extra='forbid'`, so `prompt` → 422; caps:
question/context/setup ≤2000, transcript ≤8000 learn / ≤2000 rail). Prompt rendered server-side
from `data/examiner_feedback/prompts.json[promptVersion][profile][turnKind]` (409
`unknown_prompt_version` if absent), with client text stripped of `<<<`/`>>>` and substituted
in one pass inside the DATA BOUNDARY delimiters. Metered: Learn → `feedback`, rail →
`exam_turn_feedback` (new row, 60/day, migration `20261003090000`). Key =
sha256(profile|promptVersion|attempt|question|context|transcript). Replay → per-user cache or 409
`already_generated`, never a model call. Provider failure → `release_ai_quota_grant`. Gemini
fallback uses `get_gemini_examiner()` (examiner system instruction, `GEMINI_MODEL`).
`exam_controller.py`'s `/interpret` docstring now points at the real metering.

**Changed (frontend):** `examinerFeedback.ts` builds the templates (`examiner-v1` = today's
prompt content, boundary-wrapped); `npm run examiner:generate` / `examiner:parity` (in CI).
`getExaminerFeedback` sends structured fields + `attempt` 1/2; rethrows `AuthRequiredError` (D3);
429 → `ExaminerQuotaExceededError`. Rail: quiet `quota-exhausted` state and no further calls;
Learn: quota message with Continue.

**Deviations from the plan, all minor:**
- Branch is `claude/friendly-goldberg-hqnh6w` in both repos (the session's assigned branch),
  not `claude/pensive-bardeen-6rhzzx`.
- Each template carries `retryReminder` and `maxOutputTokens`. v1 sets 1200 for **both**
  profiles because v1 rail output is still the full Learn shape, and 300 would truncate the JSON.
  The ≈300 rail cap belongs to the smaller v2 rail shape (Batch B). The backend clamps at 1500,
  the old call's budget.
- The key's "context" part also includes `turnKind`.

**Gates:** backend `pytest tests/ -q` 303 passed (30 new in `test_examiner_feedback.py`).
Local-stack `phase3_invite_and_quota.test.mjs`: 55/57 pass, including the new test 22
(`exam_turn_feedback` = 60, consumable, replay uncharged). The 2 failures are test 20:
anon/authenticated can EXECUTE the quota RPCs on the **local** stack only, because of the
CLI's default grants; this predates this batch. Hosted ACL checked (read-only): service_role
only, so it is not a production issue. Frontend `typecheck`, `typecheck:server` clean;
`typecheck:scripts` 3 pre-existing errors; `lint` 0 errors; `npm test` 253 files / 2457 tests;
`authoring:check` 0/0; `authoring:parity` 10/10; `examiner:parity` ✓.

**Deploy order (not done here):** apply the migration to the hosted project (no
`exam_turn_feedback` row there as of this entry) → merge backend → merge frontend. Old
clients get 422 on examiner feedback during the window. **Rollback:** revert frontend, then
backend; the migration row is harmless to leave.

## 2026-10-03 — Phase 3 Batch 0: `exam_turn_feedback` row applied to production

Applied through the Supabase MCP `apply_migration` to the hosted French Coach project
(`mlukwnhpazxbgaqyskjl`), on the owner's request. Production recorded it as version
`20261003064654`, so the backend file was renamed from `20261003090000_…` to
`20261003064654_exam_turn_feedback_quota.sql` to keep the repo and `schema_migrations` in
step. Same SQL (an idempotent `INSERT … ON CONFLICT DO NOTHING`).

Checked afterwards (read-only): `ai_quota_limits` now has `exam_turn_feedback = 60`; the other
six rows are unchanged (score 20, feedback 20, roleplay_turn 30, transcribe 30,
pronunciation 30, exam 10). Remaining deploy steps: merge backend → merge frontend.

## 2026-10-03 — Phase 3 Batch D: roadmap exam scores, coach score definitions

**D1 (`roadmapService.ts`).** Exam Sim sessions (`mode === 'exam' && !practiceOnly`, latest 15) now feed
`examResponse` via their `Session.score` unchanged (already /10); the dead `/20*10` branch is gone.
Intended visible change: Exam Sim results now reach the level-3 `examResponse` gate (7.0), as ADR 0007
assumes. Learn session scores still average into `examResponse` (pre-existing, untouched). Tests: 7.5 counts
as 7.5; practice-only ignored.

**D2 (coach scores).** `scores.communication=comm`, `language=know`, new `accuracy=acc`,
`fluency=raw.fluency`, `overall=raw.scores.overall ?? computeOverall(...)` (equal-weight mean of present
sub-scores, 1 dp; `NoScoreInFeedbackError` if none). One mapper (`mapCoachScores`) serves both the
non-streaming and streaming paths. Deviation, minor: a missing sub-score still falls back to `overall` so the
required numeric fields stay numeric; `NoScoreInFeedbackError` now lives in `domain/scoring.ts` (re-exported
from `apiClient`) so `computeOverall` can throw it without `domain/` importing a service. `feedbackSchema.ts`
already required `acc`, so it needed no change. Grids show Overall as a headline with Comm/Lang/Accuracy/
Fluency beneath (`coachScoreGrid`). `diagnosticEngine` `fluency_score` now reads `scores.fluency`.
`accuracy` is added to the `sessionSync` summary blob.

**UNVALIDATED, not retuned:** thresholds reading `overall` keep their numbers but its distribution changes
(a four-way mean tends to sit higher than the old strict fluency number): `LANGUAGE_SUCCESS_SCORE` and `>= 8`
in `diagnosticEngine.ts`, the gems bonus (`xp.ts`), placement `aim` seeding (`OnboardingPlacement.tsx`),
`scoreColor`. Owner: clear local sessions once after deploy; old entries keep the old meaning. Out of scope:
`DailyNewsFlash.tsx`'s own non-AI `overall`.

Gates: `typecheck` clean; `lint` 0 errors; targeted suites (domain, services/api|coaching|sync|progression) pass.

## 2026-10-03 — Phase 3 Batch C: invented Cambridge claims removed; `/api/feedback/igcse` deleted

**Frontend.** `coachService.ts` examiner notes and `_findStrongestMoment` explanations lose the invented
"Tier 1 / Core-Secure / Extended-band / Extended-High / mark booster / Fluency band" claims (grammar
teaching kept); QoL claims now cite TN p.12 (checked against the booklet: QoL is one mark out of 15 across
both conversations, with "occasional/some/frequent errors"), the giving-a-reason line cites TN p.11.
`responseTier.ts` examiner line now says a one-to-three-word answer gives the examiner very little to
credit (TN p.11; not claimed for role play, where TN p.10 credits any communicated information); coach
line: "gives the examiner something to credit". Comment in `apiClient.ts` fixed. New
`noInventedCambridgeClaims.test.ts` (banned-phrase scan over `coachService.ts`, `responseTier.ts`,
`MinimalResponseCard.tsx`). Not touched (not in plan): two `coachService.ts` notes saying an error "costs marks".

**Backend** (`french-coach-backend`, pushed first). `SYSTEM_PROMPT`/`MULTIMODAL_SYSTEM_PROMPT`: `igcseLevel`
removed (the optional `feedbackSchema.ts` field is left); `acc` is a holistic practice judgement, not a
formula; "earn IGCSE marks", "directly earns marks", "one IGCSE band higher" reworded.
`LEARN_PROMPT_VERSION` v2 → v3 (system prompt text changed; the user-prompt fixture hash is unchanged).
`/api/feedback/igcse` and its model, prompt, provider callers and offline evaluator deleted; evidence in the
ADR 0003 amendment (0 requests in 30 days of Render logs, 0 code callers). `evaluator_service.py` and the
`exam_controller.py` `grade_band` passthrough untouched. Tests: route is 404; prompts contain no
`igcseLevel`/"subtract"/"Extended —". Backend `pytest tests/ -q`: 305 passed.

**Rollback.** Revert the frontend commit and the backend commit independently; neither depends on the other
at runtime (nothing in `src/` called the deleted route; `igcseLevel` was never rendered).
## 2026-10-03 — Phase 3 Batch B: one examiner engine, two profiles

**Scope:** examiner-style feedback for Learn and the Coached rail (not the exam report — that is
Batch A). No scored-pipeline file changed (`git diff -- src/domain/igcse scripts/scoring server` is
empty), so `SCORING_PROMPT_VERSION`, `GUARDRAILS_VERSION`, `RUBRIC_VERSION` and
`ENVELOPE_SCHEMA_VERSION` are untouched and no `judge:check` / `score:golden` run was needed for
this batch. Branch `claude/inspiring-ride-f9s3d5` in both repos (the session's assigned branch).

**Changed (frontend):**
- `src/domain/examFeedback/shared/` (new, pure): `errorCategories` (9), `markClaimFilter`,
  `descriptorCopyFilter` (whole bullet or 8+ words; bullets passed in), `quoteRules` (grounded,
  min length, overlap, claim budget), `spellingOnly` (sound-alike filter, spoken turns only).
  Imports only `igcse/text/normalize` and `igcse/judgement/schema` (`isQuoteGrounded`).
- `examinerFeedback.ts`: `ExaminerFeedback` is a union on profile (`learn`; rail `topic`;
  rail `rolePlay`) with no numeric field (compile-time test); `parseAndGroundExaminerFeedback`;
  `EXAMINER_FEEDBACK_PROMPT_VERSION = 'examiner-v2'` (v1 still generated for one release).
  v2 has no band labels and no marking-principles lines; descriptor bullets are listed unlabelled
  by id (C1–C5, S1–S3, V1–V3, read from `rubric.ts`, only single-answer ones); a next step must
  name one of those ids; `{{inputMode}}` drives the spoken/typed sound-alike rule.
- `apiClient.getExaminerFeedback` sends `inputMode`; `turnFeedback.ts` sends the rail's context
  (`resolveRailPrompt`: REPEAT/TRANSITION skipped; an extension carries every READ_MAIN /
  READ_ALTERNATIVE of its question in that part, in log order; a further question carries none) and
  the role-play setup (`ExamMode` passes it). `ExaminerFeedbackCard` has the new headings and a
  `variant="compact"` prop for the rail and the results replay.
- ESLint: `examinerFeedback.ts` may import `domain/examFeedback/shared/**` only (checked with
  positive and negative probes); `shared/` itself is fenced. ADR 0009 (amends 0005); `CLAUDE.md`
  Known Traps updated.

**Changed (backend):** `ExaminerFeedbackRequest.inputMode` (optional; in the idempotency key only
when sent, so v1 keys are unchanged; absent renders as typed); a template's `responseKeys` is the
allowlist of relayed top-level keys (v1 keeps its two legacy keys); regenerated `prompts.json`
(v1 byte-identical, v2 added; learn cap 1200 tokens, rail 300).

**Deviations from the plan, all minor:**
- The role-play rail card's section is headed "This task", not "What worked": a task note may say
  what is *missing*, which is not something that "worked".
- The learn card also prints the aimed-at descriptor's text and TN page under the next step (the
  full card only; the id would otherwise go unused).
- `parseAndGroundExaminerFeedback` returns `null` for "unusable, retry once" (malformed, or nothing
  proposed was grounded) and a real, possibly empty, result otherwise — so a rail turn with nothing
  to fix is not retried (a retry costs quota). Learn with zero proposed items is retried.
- Silent `s`/`x` stripping applies only where the stem keeps 3+ letters, plus `aux`→`au`: `les`/`le`,
  `des`/`de`, `ils`/`il` differ in what is heard. When unsure the error is kept.
- The existing builder keeps its name `buildExaminerPromptTemplates` (the plan says
  `buildExaminerTemplates`). `isQuoteGrounded` now reaches `examinerFeedback.ts` through `shared/`.
- `CandidateInputMode` is restated structurally in `spellingOnly.ts` so `shared/` imports nothing
  but the normalizer and `isQuoteGrounded`.
- Batches D and C were reported done but are **not in this checkout** (no `computeOverall`,
  `igcseLevel` and `/api/feedback/igcse` still present). Batch B does not depend on them; flagged
  for the owner, nothing here touches them.

**Not verified:** no live model call was made, so how well Groq/Gemini follow the v2 prompts
(JSON shape, quote fidelity, category choice, whether the sound-alike rule is respected) is
unmeasured. The display filters are deterministic and unit-tested, but their recall on real
transcripts (does a filter eat a true error?) is what `judge:check --feedback` in Batch A is for.
The minimum-quote lengths remain `UNVALIDATED` app policy.

**Gates:** backend `pytest tests/ -q` 315 passed (12 new). Frontend `typecheck` and
`typecheck:server` clean; `typecheck:scripts` the 3 pre-existing errors only; `lint` 0 errors
(22 pre-existing warnings); `npm test` 262 files / 2625 tests; `authoring:check` 0/0;
`authoring:parity` 10/10; `examiner:parity` ✓.

**Deploy order:** merge backend first (serves v1 and v2; an old client keeps working), then
frontend (sends v2; against an old backend it would get 409 `unknown_prompt_version`). **Rollback:**
revert the frontend, then the backend; v1 stays in the file for exactly this reason.

## 2026-10-03 — Phase 3 Batch A: post-marking exam report

**Scope:** the exam results report — a separate model call on an already-persisted envelope that
cannot change a mark (ADR 0009 + its Batch A amendment). Branch `claude/serene-cori-wxl3r8` in both
repos (the session's assigned branch), based on `claude/examiner-feedback-phase-3-64grfu`, where
Batches 0, D, C and B live (not yet on `main`).

**Changed (frontend repo):**
- `src/domain/examFeedback/` (new): `types.ts` (no mark field; type test), `prompt.ts` (turn-id
  transcript, read-only marks, QoL errors indexed `[i]`, next-band target bullets by id),
  `schema.ts` (validation; drops, never rewrites), `generate.ts` (injected
  `(prompt) => Promise<string>`, one retry), `version.ts` (`EXAM_FEEDBACK_VERSION =
  'exam-feedback-v0.1'`, prompt hash pinned). QoL quote/correction copied from the envelope; the
  model only categorises (unclassified → `other`). Role-play task errors only below the top mark.
- `envelope/envelopeView.ts`: the `qualityOfLanguage` row exposes the envelope's QoL `errors`
  (display only; `ENVELOPE_SCHEMA_VERSION` unchanged).
- `server/feedbackRoute.ts` (`POST /feedback {sessionId}`, `GET /feedback?sessionId=`, injected
  deps), mounted in `server/index.ts`; `scripts/scoring/supabaseFeedbackStore.ts` (user-scoped
  reads, race-safe save). Generator = the judge's env-driven Gemini→Groq providers.
- `scoringApiClient.requestExamFeedback`; `ExamResults.tsx` + `ExamCriterionFeedback.tsx`: marks
  first, then "What you did well" / "Mistakes" (by category chip) / "Next step" + "Target:
  <descriptor> (TN p.N)" per criterion, a task-specific reason under each role-play task; failure
  shows the envelope's errors uncategorised + retry; 429 shows a daily-limit note, no retry.
- `fakeScoringServer.ts`: fake `/feedback` (real `generateExamFeedback`, fake reply) and one
  grounded QoL error in the fake judge; `e2e/exam.spec.ts` asserts the report.
- `judgeCheck.ts --feedback` + `judgeCheck/feedbackCheck.ts`; split-A fixture gains report-only
  `auditErrors[].correction` and `inaudibleWatchList` (chose ×2, au jeux).
- `scoredPipelineBoundary.test.ts`: names the four feedback-surface files as the only exemptions in
  `server/` / `scripts/scoring/`, and adds a transitive import-closure check from `scoreAttempt.ts`
  and all of `src/domain/igcse/`.

**Changed (backend repo):** migration `20261003120000_exam_feedback_reports.sql` (one row per
envelope, FK to `scoring_envelopes.attempt_id` with cascade, RLS on with no policies,
`revoke all … from anon, authenticated`); `supabase/tests/exam_feedback_reports.test.mjs`.

**Deviations from the plan (minor; behaviour as intended):**
- The route uses the envelope's own `transcriptSnapshot` as "the transcript" rather than loading
  `session_transcripts` separately — it is the exact turn-id transcript that was scored.
- A quota replay of `feedback:{sessionId}` is not short-circuited (unlike the FastAPI examiner
  route): the stored report is checked first and is durable, so a replay only reaches the model if
  no report exists (crash mid-generation, concurrent duplicate); every failed generation releases
  its grant. A save failure after a successful generation returns the report (200) unstored.
- Strengths and next steps carry a `ref` (task id or `topic1:q1`) so each quote is grounded in one
  turn; a role-play quote may be the task's whole answer when it is under 3 words. Strengths are
  capped at 3 per criterion (same as Learn). The target's page is a string (`'TN p.11'`) so the
  only number in the report is `errorIndex`.
- ADR 0009 said `server/` and `scripts/scoring/` may not import the feedback modules at all; the
  plan puts the route and store there, so the rule is amended (named exemptions + transitive check).

**Verified:**
- Unit/integration: `npm test` 272 files / 2727 tests (63 new, incl. version pin, no-mutation on a
  deep-frozen envelope, validation table, route, store, client, `ExamResults` pending / ready /
  failed / limit / empty / no-envelope, boundary). `typecheck`, `typecheck:server` clean;
  `typecheck:scripts` the 3 pre-existing errors only; `lint` 0 errors (22 pre-existing warnings,
  none in touched files); `authoring:check` 0/0; `authoring:parity` 10/10; `examiner:parity` ✓;
  `score:golden` 5/5, no diff; `build:server` bundles. Backend `pytest tests/ -q` 317 passed.
- Marks untouched by construction: `git diff` against the base is empty for `judgement/`,
  `guardrails/`, `evidence/`, `rubric.ts`, `canonical.ts`, `envelope/types.ts`,
  `buildEnvelope.ts`, `scoreAttempt.ts` and `providers/`; `SCORING_PROMPT_VERSION`,
  `GUARDRAILS_VERSION`, `RUBRIC_VERSION`, `ENVELOPE_SCHEMA_VERSION` unchanged.
- Local Supabase stack (`npx supabase start`, every migration applied cleanly incl. the new one):
  `exam_feedback_reports.test.mjs` 9/9 (owner/anon cannot read or write; service can; 23505 on a
  second report; 23503 on a dangling envelope; cascade on envelope delete). The real
  `supabaseFeedbackStore` against it: lost race returns the winner; another user reads null.
- Real end-to-end, local: built `server/` + local Supabase + real Gemini, envelope row inserted for
  a test user: GET before → 404; POST unauthenticated → 401; POST by another user → 404 (no grant);
  POST → 200 in ~3 s with one `score` grant; second POST → 200 in ~50 ms, deep-equal stored report,
  still one grant; GET → 200, other user → 404; the envelope row deep-equal afterwards. The spoken
  sound-alike error (`c est` → `c'est`) was dropped from display; the audible one shown as `tense`.
- `npm run e2e:exam` 5/5 (the report's three headings, a category chip, a role-play reason that is
  not `RP_MARK_2[0]`, no `N/N` in the feedback section).
- `judge:check` (Gemini `gemini-3.5-flash-lite`, 3 runs × 16 fixtures), **before** (base commit,
  no flag) and **after** (`--feedback`), same day:

  | Gated fixture | Before (RP/Comm/QoL) | After | Pass bar before → after |
  |---|---|---|---|
  | weak | 8-9 / 4 / 7 | 8 / 5-6 / 7-11 | FAIL → FAIL |
  | strong | 10 / 15 / 15 | 10 / 15 / 15 | PASS → PASS |
  | split-a | 10 / 14 / 11 | 10 / 14 / 11 | FAIL → FAIL |
  | split-b | 10 / 4-5 / 7-9 | 10 / 7 / 7-9 | PASS → PASS |

  Every gated outcome is unchanged. Two per-run values sit outside today's "before" and the
  earlier logged spreads: weak QoL 11 in one run (logged 7-10) and split-b Comm 7 (before 4-5;
  Batch 2 logged 7, the reverted-v0.6.2 entry logged 4). The judge's inputs are byte-identical in
  both passes (empty diff above; `--feedback` runs only after the marks), so these are model
  sampling variance, not this change. The weak / split-a FAILs are the pre-existing open finding
  (weak QoL logged 7-10 FAIL; split-a QoL 11), not new.
- `--feedback` measurements (48 reports, 51 calls — 3 needed the one retry, 0 failed): **split-A
  feedback recall 5/5 in 3/3 runs** (judge recall equal — the display filters ate no real error);
  corrections match 4/5 every run, the fifth matching in 1/3 — the judge's correction for
  `Je prefere le sport que le cinema` was unaccented (`Je prefere le sport au cinema`) in 2 runs;
  inaudible watch-list: the judge counted `plein de chose` and `au jeux video` in 3/3 runs, and the
  display filter dropped both each time (never shown); **0 errors shown on `strong` and
  `strong-reconstructed`** (no candidate false positives); borderline's `beaucoup de chose` /
  `des série` dropped as sound-alike. Feedback tokens: 83,936 in / 53,211 out ≈ **$0.158 for 48
  reports ≈ $0.0033 per report** (~1.5-1.9k in / ~1k out each — below the plan's ~5k / 1.5-2k
  estimate), at the unconfirmed $0.30/M in, $2.50/M out.

**Not verified:** Groq as the report generator (no `GROQ_API_KEY` here); the hosted Supabase
project (the migration has not been applied to production). The minimum-quote lengths stay
`UNVALIDATED` app policy.

**Found, pre-existing, out of scope (not changed):** on the local stack, `anon` and
`authenticated` hold `EXECUTE` on server-only RPCs (`consume_ai_quota`, `release_ai_quota_grant`,
`award_xp`, `mint_gems_from_envelope`, …): their migrations `REVOKE … FROM PUBLIC` only, but
Supabase's default privileges grant `anon`/`authenticated` directly. `phase3_invite_and_quota.test.mjs`
fails exactly these two checks (55/57). Whether production has the same grants is unchecked.

**Deploy order:** apply the migration → merge backend → merge frontend (`server/` and the
frontend deploy together from the frontend repo; the route 500s on lookup without the table, before
any charge). **Rollback:** revert the frontend merge (the route and UI go; marks unaffected); the
table can stay (unused) or be dropped.

## 2026-10-03 — Phase 3 Batch E: docs

ADR 0009 gains its Batch A amendment (route, table, boundary exemptions + transitive check, what
the model may decide). `CLAUDE.md`: the `server/` surface now names `/feedback`; a Known Trap for
the exam report (Batch 0/B traps — `prompt` rejected, `prompts.json` generated and versioned,
`exam_turn_feedback`, the replay rule, the `examFeedback` boundary — were already present).
`docs/systems/assessment-engine.md` ("After marking: the exam report"), `docs/systems/topology.md`
(the route, the table, deploy order), `docs/guides/development.md` (`judge:check --feedback`).
`data-model.md` unchanged: it is deliberately not a table catalogue.

## 2026-10-03 — Server-only RPC grants hardened; Batch A table applied to production

**Production (project `mlukwnhpazxbgaqyskjl`, via the Supabase MCP):** applied
`exam_feedback_reports` (recorded as `20261003101119`, so the backend file was renamed from the
`20261003120000` named in the Batch A entry above) and `revoke_server_only_rpcs_from_clients`
(`20261003101130`). Checked afterwards: the table has RLS on, `anon`/`authenticated` hold no
privilege on it, `service_role` holds select/insert; none of the 13 server-only functions is
executable by `anon` or `authenticated`; `service_role` still executes them (except
`resolve_expired_duel`, which production grants to no role).

**The gap:** on a fresh local stack, `anon`/`authenticated` could execute every server-only RPC
(`award_xp`, `consume_ai_quota`, `release_ai_quota_grant`, the shadowing quota pair, league
assignment/reset, daily-challenge seeding, `get_notification_candidates`, `_league_week_key`),
because their migrations only `REVOKE … FROM PUBLIC` and the local default privileges grant
`anon`/`authenticated` directly. A read-only check found production **not** exposed (it already
denied all of them), so the migration is a no-op there; it makes the migrations correct on any
fresh database. Client-facing RPCs, and the under-13 / guardian-consent flow, were deliberately
left unchanged (owner instruction).

**Local stack, after `supabase db reset` with the new migration:** `phase3_invite_and_quota`
57/57 (was 55/57 — the two anon/authenticated `consume_ai_quota` checks), `phase2_friend_duels`
80/80 (was 79/80 — `service_role` on `resolve_expired_duel`), `league_power` 67/67 on one fresh
run and 66/67 on another (the only failure, "bottom-ranked diamond-origin user demotes to
platinum", is a ranking flake: without the migration it fails 6 grant checks this migration
fixes, and the flake is independent of grants); all other suites pass except two pre-existing,
grant-unrelated failures: `account_data_rpcs` (5 — `export_my_data`/`delete_my_account` overload
ambiguity) and `notifications` (2 — `get_notification_candidates` result-type mismatch, also when
called as `service_role`). Those are noted, not fixed here.

**Not changed (owner instruction):** `revoke_guardian_consent` is callable by `anon` with only a
child user id and erases that child's profile; the age self-declaration flow is unchanged.

## 2026-10-03 — `revoke_guardian_consent` no longer erasable by child id

**Problem:** `revoke_guardian_consent(p_child_user_id uuid)` was callable by `anon` with only a
child's user id, and erases that child's profile (cascading their data).

**Production:** `20261003113012_close_revoke_guardian_consent_by_child_id` applied —
`anon`/`authenticated` can no longer execute the child-id form (checked afterwards: both false).
The replacement `revoke_guardian_consent(p_token text)` (`20261003113100`, the guardian presents
the email-link token that granted consent) is **not yet applied**: the Supabase MCP held the
statement (its body contains a `DELETE`) for a confirmation that timed out, three times; nothing
was half-applied (checked after each attempt). It must be run in the Supabase SQL editor. Until
then revocation is unavailable in production; no UI calls it.

**Local stack (fresh `db reset`):** `guardian_consent.test.mjs` 18/18 — revoking by child id
fails, a wrong token is rejected (`no_active_consent`) and the profile survives, the guardian's
own token revokes and erases. `consentService` unit tests 17/17. The under-13 / age
self-declaration flow is unchanged (owner instruction).

## 2026-10-03 — Phase 3 Batch F: difficulty context

**Change:** `difficultyContext` is `{ tier }` only; the backend owns the per-tier CEFR/tone/rubric
text and rejects an unknown tier or extra key with 422. No tier is sent while
`learnAdaptiveDifficulty` is live; the backend then targets "A2 with elements of B1" (TN p.11).
`LEARN_PROMPT_VERSION` `learn-prompt-v3` → `v4` (the TARGET LEVEL line is always rendered).
Two `coachService.ts` `examinerNote`s no longer claim an error "costs marks".

**Verified (local):** backend `pytest tests` 320/320 (new: tier→text mapping, default target,
422 on free-text/unknown/extra keys); frontend `typecheck` clean, `npm test` 2732/2732 (new:
`difficultyContext.test.ts`, "costs marks" scan), `lint` 0 errors. Marks unaffected: no scoring
file touched. **Not verified:** a live coach call against the deployed backend; the exact
learner-visible effect of the changed default target on feedback tone is unmeasured.

**Deploy:** backend `main` first, then frontend `main`. Between the two, an old client's coach
calls get 422 and Learn falls back to offline evaluation.

## 2026-10-03 — Coached rail: `examiner-v3` (strength when nothing to fix) + Q/A labels

Rail topic turns with no mistakes now return `strength` (one grounded, ≥3-word-quote claim, ≤160
chars; null whenever a mistake is reported). It is parsed apart from `errors`: an ungrounded
strength is dropped, never a retry. `examiner-v3` is v2 with only the rail-topic template changed;
v2 and v1 stay in `prompts.json` for one release. No scoring file touched; the scored pipeline's
import graph is unchanged. **Verified:** `npm run typecheck`, full `vitest run src` (2562 pass),
`examiner:parity`, backend `tests/test_examiner_feedback.py` (42 pass), new parser/card tests.
**Not verified:** a live model call (does it actually return a usable `strength`?).

**Deploy:** backend `main` first, then frontend `main`; an old client keeps working on v2.

## 2026-10-04 — `/api/exam/interpret` model 404 (backend)

Render logs showed every interpret call failing with Groq `model_not_found` for
`llama-3.3-70b-versatile`: `exam_controller.py` (and `scenario_generator.py`) kept their own
fallback defaults after `main.py` moved to `openai/gpt-oss-120b`, so the endpoint silently returned
its confidence-0 fallback and live routing ran on the deterministic classifier only. Model IDs and
the reasoning settings now live once in `backend/lib/model_config.py`; interpret, the legacy topic
examiner and scenario generation also pass `reasoning_effort` and top up their token budget so the
reasoning phase can't eat a 60-token answer. **Verified:** backend pytest (328 pass, incl. new
`tests/test_model_config.py`). **Not verified:** a live interpret call after deploy — check the
Render logs for the `Interpret Groq failed` warning disappearing.

## 2026-10-05 — Exam-pronunciation plan Batch 1 (backend): Azure safety, metering, consent

**Change:** migration `20261005090000_azure_speech_usage_and_budget.sql` adds the
`azure_speech_usage` ledger (reserve → settle | release, `user_id` ON DELETE SET NULL), the
single-row `azure_speech_budget` (`cap_seconds` NULL = unlimited — no number chosen),
`reserve/settle/release_azure_seconds` + `azure_speech_usage_summary` (service role only, advisory
lock in `reserve`), and `('exam_pronunciation', 1000)`. `lib/azure_budget.py` measures seconds from
the WAV header; `lib/consent.py` is the first server-side consent check (`pending` or no profile →
403 `consent_required`, unreadable → 503, guests not gated) on `/api/pronunciation` and
`/api/transcribe`. `azure_client.py`: process-wide semaphore (`AZURE_SPEECH_MAX_CONCURRENCY`,
default 1; the chunker's fan-out reads it too), Azure quota refusals → `AzureQuotaExceeded` (not
retried), UnexpectedBreak/MissingBreak/Monotone/unknown → `errorType: null` instead of
`"correct"`. `/api/pronunciation` meters every Azure call, releases the `pronunciation` grant when
the assessment raises or nothing was assessed and Azure never ran, and returns the
whisper-heuristic result with `azureBudgetExhausted: true` when the cap (or Azure's quota) is
spent. `/api/repair` and its tests are deleted. `GET /api/admin/azure-usage` (admin) reads the
summary RPC.

**Verified (local):** backend `pytest tests/ -q` 414 pass (was 333; −3 deleted repair tests). New:
`test_azure_budget.py` (WAV header, wrapper fail-open, and the SQL itself — reserve to cap, NULL
cap, settle, release, month rollover, a 10-way concurrent-reserve race, client grants, the
`exam_pronunciation` row — against a throwaway local Postgres 16 with a stub `profiles` /
`ai_quota_limits`), `test_consent_gate.py`, `test_quota_features_seeded.py`,
`test_azure_semaphore.py`, `test_azure_quota_and_break_mapping.py`, `test_azure_client_request.py`
(no `storeAudio`, base endpoint only), `test_pronunciation.py` (+release, ledger, budget, source).

**Not verified:** `supabase/tests/azure_budget.test.mjs` was written but not run — the local
Supabase stack's images can't be pulled from this environment. The Azure quota-exceeded response
shape is ASSUMED (no exhausted resource to probe). The migration is not applied to production.

**Deploy:** apply the migration in the Supabase SQL editor first (until then `reserve` fails open
with a WARNING and `/api/admin/azure-usage` errors), then backend `main`.

## 2026-10-05 — Exam-pronunciation plan Batch 2 (frontend): Learn handles the new backend states

**Change:** `pronunciationSchema.ts`/`types.ts` accept optional `azureBudgetExhausted`;
`AzurePronunciationCard` shows "Pronunciation analysis is unavailable until next month." (instead
of "couldn't assess" when that's why). `httpProvider.ts` maps 403 `consent_required` to
`ConsentRequiredError` (`src/lib/consentRequired.ts`); any other 403 keeps the sign-in path. Learn
(`pronunciationStatus: 'consent-required'`), Accent Analyzer and Shadowing (`consent-required`
screen state) and Say-It-Again (notice + Continue) render `GuardianConsentNotice`, the copy now
shared with `SpeakingConsentGate`. Requests send the screen's ledger `source` (learn / lab /
shadowing; Say-It-Again counts as learn) — attribution only.

**Verified (local):** `npm run typecheck`, `typecheck:server` clean; `npm run lint` 0 errors;
`npm test` 2760 pass (new: `consentAndBudget.test.ts`, `AzurePronunciationCard.test.tsx`,
`SayItAgainCard.consent.test.tsx`). Marks unaffected: nothing under `src/domain/igcse/`,
`server/` or `scripts/scoring/` touched. **Not verified:** a real `pending` account against the
deployed backend.

## 2026-10-05 — Exam-pronunciation plan Batch 3 (frontend): audio capture and measurement, dark

**Change:** no network call, no UI, nothing shown. `ExamMode.handleSubmitTurn` takes the blob
promise from `recording.audioBlobPromise()` (the same promise the Firefox transcribe fallback
already awaited) and, once `submitTurn` has logged the candidate entry, hands it to the new
in-memory `examAudioStore` (`Map<sessionId, Map<turnKey, Blob>>`) via `captureTurnAudio`,
keyed by that entry's `seq` (the rail's `turnKey`). It is fire-and-forget — the submit path
does not wait on it. Only genuine speech turns are stored (`isSpeechTurn`): typed turns, repeat
requests and `dont_know`/`clarification_request`/`non_french` intents are skipped, and the
greeting reply is discarded before the engine ever sees it. The store forgets a session on
`ExamMode` unmount, on a new attempt / retake, on sign-out (`AuthContext`, both `signOut()` and
the `onAuthStateChange` null-session branch), and after 60 minutes untouched. At `finishSession`,
`measureExamAudio` waits for the last turn's blob to land, then — one turn at a time — normalises
(`normalizeToWav16kMono(blob, { maxSeconds: 180 })`), trims silence and emits
`exam_pronunciation_audio_measured` (`raw_s`, `trimmed_s`, `status`, `part`, `turn_key`,
`session_id`; durations only). `normalizeToWav16kMono` gained an optional `{ maxSeconds }`; the
default stays 60, so Learn is unchanged. New pure modules under `src/domain/examPronunciation/`:
`segment.ts` (ConductLog → speech turns by part) and `trim.ts` (edge pad 150 ms, internal silence
capped at 600 ms, pause stats computed before trimming).

**Deviations from the plan text (behaviour unchanged):** (1) `trim.ts` also returns `segments` and
`trimmedToOriginalS`, which map an in-clip offset back to the original recording — Azure's offsets
are relative to the *trimmed* clip, and the Batch 6 "You" playback slices the original blob, so
without the map every clip would start in the wrong place. (2) `trim.ts` returns the pause stats
(`pausesOver2s`, `longestPauseS`) that the plan says are computed before trimming; the fluency
note that consumes them is still Batch 5. (3) The store is cleared in `ExamMode` and
`AuthContext` rather than in a store-owned lifecycle hook, so the store itself stays a plain
module. (4) `captureTurnAudio` returns a promise that `finishSession` chains the measurement
onto; the plan does not mention it, it only prevents the final turn being reported `no_audio`.

**Verified (local):** `npm run typecheck`, `typecheck:server` clean; `npm run lint` 0 errors (22
warnings, all pre-existing); `npm test` all pass, including new `segment`, `trim`,
`examAudioStore`, `captureTurnAudio`, `measureExamAudio` tests and the extended
`audioNormalizer` test (typed and greeting turns excluded; idle expiry; sequential decode;
never rejects). `npm run score:golden`: all 5 goldens match. Marks unaffected: nothing under
`src/domain/igcse/`, `server/` or `scripts/scoring/` touched, and no scored-pipeline file imports
the new modules.

**Not verified:** the silence-gate numbers in `TRIM_CONFIG` (floor 0.004 RMS, 8% of the 95th
percentile, 20 ms frames) are tuned on synthetic PCM only — UNVALIDATED until real
`raw_s`/`trimmed_s` data is read. No real browser run: `MediaRecorder`/`decodeAudioData` paths are
exercised through fakes, so a real Chrome/Safari/Firefox exam has not been observed to fill the
store. `track()` is a Sentry breadcrumb in production (capped, attached only to errors), so the
telemetry is only readable from a captured error or the dev console until a real sink exists —
the server-side ledger (`azure_speech_usage`) is what will give authoritative minutes once Batch
4 lands.

## 2026-10-05 — Exam-pronunciation plan Batch 4 (backend): exam route and evidence table

**Change (backend repo):** migration `20261005100000_exam_pronunciation_evidence.sql` adds
`exam_pronunciation_evidence` (unique `(user_id, session_id, turn_key, assessor_version)`, FK
`user_id → profiles ON DELETE CASCADE`, RLS on with a select-own policy, INSERT for the service
role only) and re-creates `export_my_data(uuid)` with an `exam_pronunciation_evidence` key (body
otherwise identical to `20260911110000`). New `routers/exam_pronunciation.py`:
`POST /api/exam/pronunciation` (multipart, one turn per request) runs access mode
(`EXAM_PRONUNCIATION_ACCESS`, default `off`; `admin` checks `app_metadata.role`; anything else
403 `{status:"not_enabled"}`) → `verify_supabase_jwt` (no guests; `user_id` only from `sub`) →
consent → cache (the stored row; no Azure, no charge) → daily quota (`exam_pronunciation`, key
`exam-pron:{session}:{part}`) → Whisper → Azure freeform, chunked on Whisper boundaries at
`AZURE_SPEECH_MAX_CONCURRENCY`, one ledger reservation (`source='exam'`, session/part/turn) per
Azure request → settle, store, return. `budget_exhausted` (cap or Azure quota) is a 200 status.
On any failure the part grant is released only if no turn of that part is stored.
`GET /api/exam/pronunciation?session_id=` returns stored rows for the JWT subject only, never
analyses. `EXAM_PRONUNCIATION_ASSESSOR_VERSION = "exam-pronunciation-v1"`. Wired in `main.py`
with the same Whisper/retry DI seam as `/api/pronunciation`. New `services/pronunciation/wav.py`
(read/slice PCM WAV), `models/exam_pronunciation.py`.

**Deviations from the plan text (behaviour unchanged):** (1) The ledger reservation (plan step 6)
is taken per Azure request inside step 8, after Whisper: chunk boundaries come from Whisper's
timings, and the ledger is one row per Azure HTTP request. (2) Extra form fields the later steps
need: `fairness_version` (stored in the `fairness_version` column), `recognizer`
(`webspeech`|`whisper`, for single-recogniser mode), and optional `raw_s`, `pauses_over_2s`,
`longest_pause_s`, `clipped_ratio` — the pause stats and clipping ratio are stored in `result` so
the fluency note and the "not clipped" rule survive a report reopen, when the recording is gone.
(3) The `suppressed` column holds the assessor's threshold-free recognition-trust reasons
(`asr_disagreement`, `near_seam`, `short_word`, `number`). Threshold-based reasons are applied
client-side from `FAIRNESS_CONFIG` after the response, so they are not stored; they are
reproducible from `result` + `fairness_version`. (4) No overall score, sub-score or fluency score
is stored or returned — per-word accuracy only. (5) `nearChunkBoundary` is recomputed for internal
seams only (the aggregator also flags the clip's own start, which the client's 150 ms edge pad
would trip on every first word). (6) Groq Whisper has segment timings only, so windows use
segments; a window still over 29.5 s is cut evenly, and a piece with no reference text is not
sent (counted as a failed chunk). (7) Uploads must be PCM WAV (415) of at most 180 s (413, matching
the client's `EXAM_TURN_MAX_SECONDS`); a missing audio part or blank transcript (a typed or empty
turn) is 422. (8) Whisper hearing nothing → `done` with `couldNotAssess: no_speech_recognized`,
not stored and not billed; Whisper failing → `failed` (`transcription_failed`); Azure not
configured → 503 before any charge. (9) No route rate limit (the plan names none; the per-part
quota bounds it).

**Verified (local):** `pytest tests/ -q` — 448 passed, incl. the new
`tests/test_exam_pronunciation.py` (35): access off/unknown/admin/all, no guests, cache hit = no
Azure and no charge, consent pending/missing → 403 before any charge, budget exhausted and Azure
quota-exceeded → 200 `budget_exhausted` + releases, failure releases reservation and grant,
grant kept when another turn of the part is stored, a 40 s turn → 2 serial chunks (max in flight
1, ledger 19 s + 21 s), per-part key replays across turns, rejected requests never charge, a form
`user_id` is ignored, user B with A's `session_id` gets separate rows and leaves A's untouched,
B's GET for A's session returns nothing. `test_quota_features_seeded.py` passes (the call site
uses the `'exam_pronunciation'` literal).

**Not verified:** the migration has not been applied to any database (no local Supabase stack run,
not applied to production). No live Azure or Groq call. Deploy order: apply
`20261005100000` before setting `EXAM_PRONUNCIATION_ACCESS` to `admin`; until then the route
answers 403 `not_enabled` (default `off`).

## 2026-10-05 — Exam-pronunciation plan Batch 5 (frontend): domain, client, mark-safety tests

**Change:** dark — nothing calls `analysePart` yet (UI is Batch 6). New pure modules under
`src/domain/examPronunciation/`: `types.ts` (evidence vs display types), `version.ts`
(`EXAM_PRONUNCIATION_VERSION = 'exam-pronunciation-fairness-v1'`, pins the `FAIRNESS_CONFIG`
hash), `fairness.ts` (rules 1–4), `patterns.ts` (rule 5, ≥2 distinct words, ≤3 examples,
`inferred`), `fluencyNote.ts` (pause stats + the existing `countFillers`, one descriptive
sentence), `buildReport.ts` (report section + Coached part card, display strings through the
shared mark/band filter). `src/services/exam/pronunciation/client.ts`: normalise → trim → one
sequential POST per turn (60 s timeout, one retry), the plan's state set, `fetchStoredEvidence`
for reopen. Guards: `scoredPipelineBoundary.test.ts` extended (`/domain\/examPronunciation/`,
`/exam\/pronunciation/`, `/ExamPronunciation/`, no exemptions, transitive closure checked),
new `dataIsolation`, `marksUnchanged`, `versionsUnchanged`, `types`, `version` tests, and two
ESLint blocks (the scored pipeline may not import exam pronunciation; the domain is pure).

**Deviations from the plan text (behaviour unchanged):** (1) Category inference is orthographic:
fr-FR Azure returns no phoneme names, so the backend's IPA-keyed phonology rules produce nothing
for these words. The word lists (minimal-pair vowels, obligatory-liaison triggers, pronounced
finals, loanwords) sit in `FAIRNESS_CONFIG.lexicon` and are covered by the version hash.
(2) "French R is never reported" is enforced conservatively: any word containing an r is
suppressed (`may_be_french_r`), because without phoneme names a low score on it may be the R
alone. This costs some true positives; calibration may relax it. (3) Proper noun = a capitalised
exam-transcript word that is not the turn's first word; loanword = the closed list. (4) Suppressed
verdicts are returned by `judgeTurns` for calibration and never displayed or stored (see Batch 4
deviation 3). (5) `audioNormalizer.ts` now exports `encodePcm16Wav(samples, sampleRate)`; the
private AudioBuffer encoder delegates to it, so Learn's output is byte-identical. (6) A guest
(`requireAuthHeader()` returns no `Authorization`) resolves `signed_out` without a request.
(7) The client takes injectable dependencies so it is testable without Web Audio. (8)
`versionsUnchanged.test.ts` deliberately duplicates the existing scoring pins, so an
exam-pronunciation change that reaches the scorer fails in this feature's own suite.

**Verified (local):** `npm run typecheck`, `typecheck:server` clean; `npm run lint` 0 errors (22
warnings, all pre-existing); `npm test` — 291 files, 2895 tests pass (with `backend/` linked to the
backend clone); `authoring:check` 0 errors, `authoring:parity` 10/10; `npm run score:golden` all 5
goldens match. `marksUnchanged`: `scoreAttempt` (fake judges) gives deep-equal mark fields with
and without exam audio + pronunciation evidence in state; the `/score` body equals the transcript
and contains no pronunciation key. Probe files confirmed both ESLint blocks fire (and allow the
ConductLog types and `countFillers`). `typecheck:scripts` has 3 pre-existing errors in
`scripts/**/supabase*Store.test.ts` (identical on a clean checkout; not run by CI).

**Not verified:** every `FAIRNESS_CONFIG` number and list is UNVALIDATED until the Batch 7
calibration; the access mode must stay `off`/`admin` until then. No real browser run of the
client (Web Audio and fetch are faked). Process note: Batch 3 was on
`claude/inspiring-johnson-2djemo`, one commit ahead of Batch 2 on `main`; this work fast-forwarded
onto it, so this branch carries Batches 3–5.

## 2026-10-05 — Exam-pronunciation plan Batch 6 (frontend): UI — report section and Coached card

**Change:** the opt-in surfaces, still feedback only. `src/features/exam/pronunciation/`:
`useExamPronunciation` (owned by `ExamMode`; per-part status, stored evidence, the Batch 5 report
builders), `access.ts` (admin, or `VITE_EXAM_PRONUNCIATION_PUBLIC=1`; never a `pending` account),
`messages.ts` (one sentence per state), `ExamPronunciationSection` (report: transcript with reported
words highlighted, tap a word for "You" from the in-memory recording via `playClip.ts` and "Model"
via browser TTS when `hasFrenchVoice()`, the top patterns labelled *Inferred*, one fluency sentence,
a link to `/accent-analyzer`) and `ExamPronunciationPartCard` (Coached rail: ≤2 words and 1 pattern,
no number). Wired into `ExamResults` (after the Examiner Feedback block, never inside the marks or
`ExamFeedbackReport`), `ExamCorrectionsRail`/`ExamRunner` (desktop rail and mobile sheet) and
`ExamMode` (`markPartEnded` from `announceIfPartChanged` and `finishSession`; `reset` on a new
attempt/retake). No engine change, so `session-engine-v4` is unchanged; nothing under
`src/domain/igcse/`, `server/` or `scripts/scoring/` changed (`git status` there is empty).
Nothing is analysed on its own: the only automatic call is the read-only stored-rows GET when the
report opens. Backend: no change in this batch.

**Deviations from the plan text (behaviour unchanged):** (1) The e2e is its own spec
(`e2e/examPronunciation.spec.ts`) and Playwright project (`exam-pronunciation`) on a second Vite
server, not inside `exam.spec.ts`: the feature is admin-gated and `AuthProvider` loads a Supabase
session only when `VITE_SUPABASE_URL` is set, which the main e2e server deliberately leaves unset
(its guest/offline path). The second server points that URL at a non-existent host; the spec
answers every call to it with `page.route`, plus a stubbed admin session and profile and a stub of
`/api/exam/pronunciation`. Shared drivers moved to `e2e/helpers/examFlow.ts` (Playwright cannot
import one spec from another). (2) Topic 2 has no *live* card: the rail is unmounted when the exam
ends, so its end-of-part marker is recorded at completion but its analysis is reached from the
report section. (3) A retry sends only the turns with no stored result (a client-side filter ahead
of `analysePart`), so a mid-part failure does not re-upload turns already stored. (4) On the report,
the single button runs parts in exam order and stops at the first part that does not finish; the
blocking state (budget, daily cap, consent, signed out, not enabled) is one sentence for the whole
section. (5) The mobile sheet is closed by default, so a card that appears while it is closed is
seen when the sheet is opened — the same as the existing live corrections.

**Found in review, fixed:** the hook's unmount cleanup aborted its controller without replacing it,
so under React StrictMode's simulated unmount/remount (the app uses StrictMode) a later analysis
would have started already aborted and stuck on "running". The e2e did not catch it only because
`reset()` on attempt start replaced the controller. Fixed; the regression test fails on the old
code and passes on the fix (checked by temporarily restoring the old cleanup).

**Verified (local):** `npm run typecheck`, `typecheck:server` clean; `npm run lint` 0 errors (22
warnings, all pre-existing); `npm test` — 296 files, 2953 tests pass (+5 files, +58 tests, with
`backend/` linked to the backend clone); `authoring:check` 0 errors, `authoring:parity` 10/10;
`npm run score:golden` all 5 goldens match. New RTL: `ExamResults.pronunciation` (opt-in only, one
button after the marks, marks and the rest of the page byte-identical before and after, every
state sentence, highlights, word playback, "Recording not kept", reopen from stored rows, nothing
reads as a mark/band/score) and `ExamRunner.pronunciation` (a card only after a part ends, Coached
only, enabled only, ≤2 words + 1 pattern with no numeric value, desktop and mobile copies share one
result). E2E, all 8 passing on a clean run — the 5 existing `exam` tests unchanged, plus: Exam Sim
(no POST before the tap; the section fills in; the `/40` text identical before and after), Exam Sim
with the allowance spent (message shown, role play kept, exam complete), and Coached (no card
mid-part; a card after the role play; nothing sent until tapped; no digit on the card). The
browser's fake microphone supplied the real recordings, so normalise → trim → upload is exercised
up to the stubbed network call.

**Not verified:** no real backend, Azure or Whisper in any run (all stubbed), so the end-to-end
wire contract with the Batch 4 route is covered only by the Batch 4/5 tests and the shared
`ExamPronunciationTurnEvidence` shape. "You" playback (`playClip.ts`, Web Audio) has no test of its
own — jsdom has no `AudioContext`; the RTL tests mock it and the e2e only asserts the button is
offered, so nobody has heard a clip. "Model" is covered with a mocked TTS only (headless Chromium
has no French voice). No visual review at phone width. Every `FAIRNESS_CONFIG` number is still
UNVALIDATED until Batch 7; `EXAM_PRONUNCIATION_ACCESS` must stay `off`/`admin` until then.
Process notes: Batches 3–5 were committed on `claude/lucid-ptolemy-xdc7pt`, not on this session's
branch, so this branch (and the backend's) was fast-forwarded onto it: the frontend branch now
carries Batches 1–6, the backend branch Batches 1 and 4.
An earlier e2e run was invalidated by my own source edit mid-run (Vite's full reload hit the
browser); it was re-run clean with nothing else running.

## 2026-10-06 — Exam-pronunciation plan Batch 7 (docs slice): ADR 0010, system spec, consent/topology docs

**Change:** documentation only, written against the code on `main` (frontend `35fed68`, backend
`a80572a`; Batches 1–6). New: `docs/decisions/0010-pronunciation-evidence-is-post-hoc-mark-free-and-gated.md`
(amends 0009's boundary list: no exemptions, because the route is FastAPI) and
`docs/systems/exam-pronunciation.md` (UI, fairness rules, evidence table and route, auth scoping,
metering, privacy, release gate, calibration plan, known gaps). Updated:
`docs/systems/child-safety-consent.md` (the server-side `require_speaking_consent` gate and the
subprocessor check), `docs/systems/topology.md` (`EXAM_PRONUNCIATION_ACCESS`,
`AZURE_SPEECH_MAX_CONCURRENCY`, `VITE_EXAM_PRONUNCIATION_PUBLIC`, and the migration → backend →
frontend deploy order; the single-instance prerequisite and lease fallback were already there from
Batch 1), `docs/README.md` (map and ADR range), and `CLAUDE.md` (Documentation map pointer, and the
existing exam-pronunciation Known Trap now points at the spec/ADR and states both release
preconditions). Nothing in `src/`, `server/`, `scripts/` or the backend code changed.

**Verified:** `GuardianConsent.tsx` already names Groq, Google Gemini and Microsoft Azure Speech as
processors, so no copy change was needed. The doc claims about the route's step order, the evidence
table's columns/FK/RLS, `export_my_data`, the access-mode default and the Azure `storeAudio`
assertion were read from the migration, `routers/exam_pronunciation.py` and the tests, not from the
plan.

**Deviation from the plan text:** the plan said calibration probe runs log to the ledger as source
`probe`. The ledger's `source` CHECK (`20261005090000`) allows only `learn`, `exam`, `repair`, `lab`,
`shadowing`, so the spec records that the probe script needs a migration or an unmetered path, to be
decided when it is written.

**Not done — the release gate is still closed:** the Batch 7 *calibration* has not been run. No
Common Voice download, no recorded minimal-pair set, no replay fixtures, no
`probe_exam_pronunciation.py`, and no CI pass criteria exist, so every `FAIRNESS_CONFIG` number is
still `UNVALIDATED`. `EXAM_PRONUNCIATION_ACCESS` must not be set to `all`. Migration
`20261003113100_revoke_guardian_consent_by_token.sql` is not confirmed applied to production (the
consent doc still says it must be applied in the SQL editor); this session cannot check production.
Cost/capacity is not computed (no real exam traffic through the ledger yet). The Batch 1 `azure_budget`
Supabase test and the Batch 4 migrations remain unapplied to production per their own entries.

## 2026-10-06 — Learn overhaul Batch 1 (frontend): aim, review pool, average, "Why this question?", hidden tier, examiner evidence

Scope: `src/` only; no backend change, no demands/content change (corpus hash untouched, so no
L2-off window). Each bug was reproduced by a failing test before its fix; the test is named in
each slice's commit.

- **1a Aim honoured.** `buildSessionQuestions(…, { aim, migratedTier })` from `AppState`; the
  builder no longer reads `storageGet(difficulty)` (always null: `SET_DIFFICULTY` writes raw).
  `sessionBuilder.adaptiveFlag.test.ts` "honours aim and the stored tier".
- **1b Review pool reaches learners.** Review candidates exclude this session's picks only, on
  both paths. `sessionBuilder.reviewExclusion.test.ts` (realistic `topicMastery`).
- **1c Average.** `features/learn/topicAverage.ts` (`nextTopicMastery`,
  `normalizeTopicMastery` at `AppContext` initial state); `averageScore: number | null`. Read-time
  repair only: `averageScore === 0 && !(scoredSessionsCompleted > 0)` → no average. Already
  deflated non-zero legacy averages are not repairable deterministically and are left as they are.
  `topicAverage.test.ts`.
- **1d "Why this question?"** Rung returned by `selectQuestions`; a downgraded stretch uses
  `bandFor('target')`; `explainSelection`; `midSessionAdjust` replacements carry a reason (a raise
  that came back downgraded is labelled `target`, so label and reason agree).
  `selectionReason.test.ts`.
- **1e Hidden tier gone + level wording.** `IGCSE_EXPECTATIONS` = intermediate (A2) word counts +
  `requireConnectors` + `requireDetailedJustification` (the B1 elements, TN p.11);
  `requirePastTense` left off so a present-tense question isn't nagged for tense variety — an
  implementer's reading of "A2+B1 set", open to the owner's review. This changes which avoidance
  signals Learn emits (connectors on >30-word answers, reasons on >15-word answers) and therefore
  avoidance evidence. Tier grid and `TIER_COLORS` deleted. `levelLabel` + starting-point copy.
  `igcseExpectations.test.ts`, `levelLabel.test.ts`.
  **Simulation check (no engine change)**, `adaptiveSimulation.test.ts` scenario L: realistic A2
  learner, 12 sessions × 5 over 21 days, fully *reviewed* bank-shaped pool (describe 63%), L1
  unknown rate 0.3 filled by L2 → `overallConfidence` 0.180 / 0.208 / 0.192 (seeds 11–13), below
  the 0.25 gate; `abilityScore` 1.76 / 2.05 / 1.76. Reviewing the bank alone does not make
  "Around A2" reachable in 3 weeks; evidence for a §6.3 display-only proposal after Batch 3.
- **1f Examiner voice → L1 demand evidence only.** `buildDemandOnlyEvidence` +
  `recordDemandOnlyAttempt`, called once the examiner reply succeeds. **D4b decided: no XP** —
  `awardParticipationXP` writes the `xp_events` ledger behind `all_time_leaderboard` and mints
  gems, and the examiner path has no Tier 0/1 gate, so criterion (2) "can't be farmed" is not met.
  `demandOnlyEvidence.test.ts`; `scoredPipelineBoundary.test.ts` and `examinerFeedback.test.ts`
  still green.

Gate at commit: `npm run typecheck` clean · `npm run typecheck:server` clean · `npm run lint`
0 errors (22 pre-existing warnings) · `npm test` **302 files / 2998 tests passed** ·
`npm run learn:check -- --draft` 0 errors (63 warnings; without `--draft` the 420 inferred tags
are errors, unchanged) · `authoring:check` 0/0 · `authoring:parity` 10/10. Not run: backend
pytest (no backend change); Playwright end-to-end (Batch 1 has no UI flow the plan's §5 e2e list
can check until Batch 2's setup screen).

## 2026-10-07 — Learn overhaul Batch 2 (frontend): one-screen setup, learner filters

Scope: `src/` only; no backend change, no demands/content change (corpus hash untouched, so no
L2-off window). Failing tests were written before each slice and the filter tests were
mutation-checked (stubbing out the review predicate / the pool filter fails 1 and 5 tests).

- **Filters through one pool** (`domain/learn/selection/filters.ts`, docs §8.5). `topicPool` feeds
  slotting, the review slot (`getEligibleReviewQuestion`'s new `accept`) and `midSessionAdjust`;
  follow-ups off under a grammar filter; fewer-than-requested never padded; an empty build never
  starts. `filters.test.ts`, `sessionBuilder.filters.test.ts`.
- **Setup screen** (`SessionStartScreen`, `features/learn/sessionSetup.ts`): Focus chips (only
  where ≥ 5 questions match), Questions 1/5/10/20 with disable + clamp + zero-match "Clear X
  filter", Difficulty Easier · Right for me · Harder + a read-only dry-run preview, Feedback
  style. Removed `ModelSelectorCard`, `EngineIndicatorPill`, `ReEvaluateBar`, `useEngineHealth`
  and the engine/re-evaluate state in `Learn.tsx` (the lint warning that state caused is gone).
  `SessionStartScreen.test.tsx`, `sessionSetup.test.ts`.
- **Topic grid** hides the eight one-question topics; Random Question draws from visible topics.
  `TopicGrid.test.tsx` now fixes its own topic list (the real advanced topics are all hidden).
- **Browser smoke test** (throwaway Playwright script against `vite dev`, dark theme only; light mode is Batch 5 —
  16 topics shown; Holidays → Past → Harder → 5 showed "6 questions match", 10/20
  disabled, "Pitched at Stretch (B1).", and the session started; no page errors (only the
  expected refused backend calls).
- **Observation, not a regression:** a session is routinely shorter than the length tapped
  (5 → 3, 10 → 7, 20 → 14 with no review item due) because unfilled review slots are not
  backfilled (§8.3). Identical before and after this batch. Left for the owner (docs amendment).
- **Deviations from the plan:** no sub-topic chips (`Question.subTopic` doesn't exist until
  Batch 3); the in-question Coach/Examiner toggle was removed in favour of the setup choice; the
  plan's e2e example "School → Past" can't show a *Past* chip (school tags only 2 past
  questions; use Holidays, Hobbies or Food).

Gate at commit: `npm run typecheck` clean · `typecheck:server` clean · `npm run lint` 0 errors
(21 warnings, all pre-existing) · `npm test` **306 files / 3042 tests passed** (with `backend/`
linked, as CI does) · `learn:check -- --draft` 0 errors (63 warnings) · `authoring:check` 0/0 ·
`authoring:parity` 10/10. Not run: backend pytest (no backend change).

## 2026-10-07 — Learn overhaul Batch 3a: guardrails (parity tests, `subTopic`, `coachHint`, bank lint)

**Changed:** no demands file, manifest or backend byte changed, so there is no L2-off window. Added
`scripts/authoring/learnCorpusHash.ts` (the corpus hash, extracted so tests can import it:
`buildDemandsManifest.ts` runs `main()` on import, which meant `learn:check` rewrote the manifest
as a side effect), `src/data/learn/__tests__/demandsParity.test.ts`, `Question.subTopic` /
`Question.coachHint` (types only, nothing assigned yet), `src/data/learnSubTopics.ts` (closed lists
for the 16 core topics, 3–5 each), `src/data/learnBankLint.ts` wired into `learn:check`, and the
`coachHint` display in `QuestionCard` with a fallback to `hint`. `hint` is untouched.

**Verified:** each parity test fails when one byte is appended to a demands file (reproduced, then
restored), and passes on the real corpus with `backend/` symlinked to the sibling clone. `npm test`
2984 passed, `typecheck`, `typecheck:server` and `lint` (0 errors) clean, `authoring:check` and
`authoring:parity` clean, `learn:check` has 0 errors other than the existing 420 `not-approved`.
`typecheck:scripts` reports 3 errors in `scripts/scoring` and `scripts/stt` tests, identical with
these changes stashed.

**Deviation from the plan text:** the plan estimated 182 bare yes/no questions. Reusing
`patternLint.ts`'s `opensAsYesNo`/`isOpenQuestion` as specified flags 236 of 668 (warnings, listed
by `learn:check`); Batch 3b should work from that list. Lint severities: shape and closed-list
rules are errors, the heuristic text rules are warnings, so the current bank stays green.

**Not verified:** the tense-cue regexes for French phrase frames are narrow heuristics and have only
synthetic test cases, no real `coachHint` yet. The plan's Batch 1 and 2 are not present in this
repository's history, so nothing here was exercised against them.

## 2026-10-07 — Learn overhaul Batch 3b: the bank re-read (tags, sub-topics, hints, wording)

**Changed.** All 660 core-topic questions were re-read against their wording and their demands
corrected (`src/data/learn/demands/*.json`, manifest regenerated); the 240 questions in clothes,
animals, transport, jobs, sports, emotions, arts and shopping got demands for the first time, so
all 668 questions carry them (`questions.demands.test` 428 → 668). `subTopic` is set on every core
question, `coachHint` on every question of the eight priority topics (D7), a second part was added
to every bare yes/no question (D8), and five beyond-level questions (`emo_18`, `emo_29`, `arv_25`,
`sho_19`, `foo_47`) were replaced by everyday ones (text, hint, follow-ups, model answer, vocab and
`difficulty` together, re-tagged in the same commit). `hint` was otherwise left untouched.
Mechanics: a throwaway patch pipeline (outside the repo) applied each topic's spec to
`questions.ts` and the JSON, then pruned structure tags the question text does not cue
(`hasStructureCue`); every entry it wrote carries `review.notes` and `learn:infer` now refuses to
overwrite such entries (`scripts/authoring/inferLearnDemands.ts`).

**Not done, on purpose.** No entry was flipped to `reviewed`/`approved`: `provenance: 'reviewed'`
with `reviewedBy` is a human attestation (`docs/guides/learn-demands.md` §1 rule 7, §4), and the plan
puts the owner's per-topic review between this batch and merge. The tags are `inferred`, confidence
0.8, `review.status: 'draft'`, `review.notes` set; the promotion procedure is `learn-demands.md`
§2c. The eight already-`reviewed` entries (`sch_10 fam_09 hol_15 hom_10 fut_19 foo_64 env_18 hob_43`)
were not touched, so `hob_43` and `foo_64` keep their bare yes/no wording for the owner. The eight
one-question advanced topics were not touched (hidden, out of scope). Without `--draft`,
`learn:check` still reports one `not-approved` error per unreviewed entry — expected until review.

**Judgement calls the owner should confirm.**
1. `responseLoad`: `extended` went from 106 of 428 to 7 of 668 questions (the rest `developed`).
   `responseLoad` sets the L1 "met" word floor (~15 / ~40 / ~70 words, `satisfaction.ts`), so ~100
   questions now need ~40 words rather than ~70 — and everyday preference questions no longer score
   as B2 (compare 6.5 + extended 0.75 + comparison 0.25 = 7.5).
2. Confidence 0.8 on the re-read tags (the old inferrer used 0.4–0.9). Shipped state: only 11–14 of
   ~60 answers stay above `MIN_RELIABLE_WEIGHT` over 3 weeks (below).
3. Sub-topic lists changed where a key would hold fewer than the 5 questions a Focus chip needs:
   home → My home & room / Town & region / Things to do; future "Further study" → "Study & skills";
   jobs → "Jobs around me" + "Work experience" merged into "Jobs & experience".
4. Questions replaced rather than edited (the five above) also had `difficulty` 3 → 2.
5. Wording fixes beyond the plan: `env_40` ("Savais-tu qu'est-ce que c'est la 'fast fashion' ?" →
   "Sais-tu ce qu'est la 'fast fashion' ?"), `sho_21` (no subjunctive), `sch_36` typo, `foo_29` "j'adorer" → "j'adorais",
   `hob_37` stray English "and", `clo_10` model answer's date to match its new cue.
6. Left as they are: duplicate or near-duplicate questions (`fut_03`=`job_01` is word-for-word;
   `sch_18`/`sch_31`, `hom_07`/`hom_23`, `hob_25`/`hob_48`, `hob_33`/`hob_49`, `hob_40`/`hob_58` are
   close) — IDs carry SM-2 history, so removing one is a separate decision.

**Simulation (the Batch 1e hand-off).** `adaptiveSimulation.test.ts` scenario M, same method as L
on the new mix (describe 35% · explain 30% · justify 25% · compare 8% · hypothesize 2.4%), seeds
11–13: shipped (`inferred` 0.8) `overallConfidence` 0.098 / 0.122 / 0.090; after owner review
0.222 / 0.256 / 0.262 (it was 0.18–0.21 on the old mix) against the 0.25 gate, so "Around A2" is
borderline even after review. **Proposal, not implemented:** a §6.3 display-only gate of 0.20
(`docs/systems/learn-adaptive-difficulty.md`, Batch 3b amendment). No gate, weight or engine change.

**Tests.** New `learnBank.coverage.test.ts` (sub-topic on every core question, every list key ≥ 5
questions, `coachHint` on the eight priority topics, no bare yes/no outside `reviewed` entries,
no lint error). `sessionBuilder.filters.test.ts` assumed hobbies had ≤ 6 past questions (it has 9 now;
a 'standard' session returns at most 7 with no review due), so its two "fewer matches" cases now
pick their focus from the bank. Backend `tests/test_learn_demands.py` read `fam_01` live as a
"known TS fixture"; re-tagging it broke the derive-score and prompt-hash tests with no template
change, so the original entry is pinned in the test (the original hash passes, so
`LEARN_PROMPT_VERSION` is *not* bumped) and the corpus-size pin is 668.

**L2-off window.** Nothing is deployed: both repos are on `claude/magical-hamilton-xi116g`
(`demandsVersion` changed with every slice; frontend commit and backend byte copy are separate
commits, backend pushed first each time). When merged to `main`, deploy the two back to back;
either order leaves a short window where the backend reports `demandsResolved: false` and L2
evidence is off.

**Process note.** Batches 1, 2 and 3a were not on this branch when the session started: they lived
on `claude/happy-shannon-9yukm5` (1–2) and `claude/hopeful-volta-pl0fm3` (3a, forked from the
pre-Learn commit and without 1–2). The first was fast-forwarded onto this branch, the second merged
(one conflict, `verification-log.md`: both sides appended; both kept).

Gate at commit: `npm run typecheck` clean · `typecheck:server` clean · `npm run lint` 0 errors (21
pre-existing warnings) · `npm test` **311 files / 3079 tests passed** (with `backend/` linked, as CI
does) · `learn:check -- --draft` 0 errors (71 warnings: 56 `time-frame-not-cued` — 45 `present`
tags, 9 `past` and 2 `conditional` where the natural wording uses a construction the cue list does
not know; 8 `topic-demand-monotony` and 2 `level-not-carried-by-vocabulary` on the hidden
advanced topics; 2 `structure-not-elicited` on the `reviewed` `fam_09` and `foo_64`; 1
`bare-yes-no-question` listing the `reviewed` `hob_43` and `foo_64` plus the hidden `slang_01`)
· `authoring:check` 0/0 · `authoring:parity` 10/10 · backend `pytest tests` 449 passed.
`typecheck:scripts` reports 3 errors in `scripts/scoring/__tests__/supabaseEnvelopeStore.test.ts` and
`scripts/stt/__tests__/supabaseTranscriptStore.test.ts` — files this batch did not touch; none in
`scripts/authoring/`. Not run: Playwright end-to-end (no UI code changed in 3b); a browser check of
the new `coachHint` text in light mode (Batch 5 owns visual polish).

## 2026-10-07 — Learn overhaul Batch 4: coach feedback (prompt v5, filters at normalisation, fewer cards)

**Evidence step (before choosing filter rules).** The only recorded coach responses in either repo
are the 4 `feedback-contract` fixtures (`src/services/api/__fixtures__/feedback-contract/`, byte
copies in the backend): 4 corrections, 0 grammar items, 4 `best_moment`s (3 with a « » quote). They
were written to test span resolution, so the sample is small and synthetic; the backend test files
hold no further quote → correction pairs. Drop counts per shared rule:
grounding 0/4 · identical correction 0/4 · sound-alike (speech) 0/4 · `meetsErrorQuoteMinimum`
**4/4** (every one a real one-word fix: « Paris », « allé » → « je suis allé ») · strength overlaps a
fix 0/3 · `meetsClaimQuoteMinimum` **2/3** (« beaucoup », « ma soeur »). Decision, as the plan
expected: keep grounding, identical-correction, sound-alike on speech and strength-overlaps-fix;
skip both quote minimums for the coach voice. The three kept rules dropped nothing here, so their
real drop rate is unmeasured until there are recorded production replies.

**Backend (`french-coach-backend` d350c27, deploy first).** `learn-prompt-v5`: at most 2 fixes in
total (grammar critical + polish together; `corrections[]` restates them), each quote → full
corrected French phrase → one-sentence why, pitched at A2 with elements of B1 (TN p.11, or the
lower `TARGET LEVEL`, never above B1); one quoted strength that never praises a reported error;
`improved_answer` ("say it better") at the same level; `advanced_answer` no longer requested (both
system prompts) but still shipped as "" by `enrich_feedback`; depth ranges no longer ask for
2-3 / 5-8 grammar items or mark bands; `_GENERIC_PHRASES` + "great job", "good job", "keep it up",
"keep practising/practicing", "great answer", "nice answer" ("good answer" and "be more specific"
left out: a match drops the whole card and both can open a specific comment). `cefrLevel` and every
key unchanged; `FEEDBACK_CONTRACT_VERSION` stays 2. User-prompt hash updated in
`tests/test_learn_demands.py`; new `tests/test_learn_prompt_v5.py` also pins the `SYSTEM_PROMPT`
hash (it was unpinned). pytest 461 passed.

**Frontend.**
- **Filters at normalisation** (`src/domain/learn/feedback/filterCoachFeedback.ts`, called inside
  `apiClient.ts`'s `normalizeBackendFeedback`, i.e. both `/v3` and the stream's `complete`). Applied
  to `issues[]` and `grammar.critical/polish`; dropped issues' transcript spans and a dropped
  `topPriorityIssueId` go too; `best_moment` is dropped if a phrase it quotes is ungrounded or
  overlaps a kept error. Grounded against the transcript the backend echoes (what it graded), else
  the one sent. Sound-alike only when the caller says `speech`: Learn does (`LEARN_INPUT_MODE`,
  same call as the examiner voice); Story, Roleplay, Scenario Architect, Daily News and the
  placement diagnostic pass nothing, so their spelling-only errors are kept. **This is a
  belief-input change:** a dropped error no longer reaches `buildEvidence`'s language event
  (`issueIds`, `issueCount`). Tests: `filterCoachFeedback.test.ts` (each rule; one-word
  corrections survive), `coachFilterNormalisation.test.ts` (real `getAIFeedback` path → evidence),
  mutation-checked (stubbing out the filter fails 2 tests; grounding on the sent transcript instead
  of the graded one fails 1).
- **Fewer cards** (`FeedbackExperience.tsx`): score line (`SnapshotCard variant="line"`) → What
  worked → Fix these (≤ 2, `coachPoints.ts`) → Say it better (`BeforeAfterDiff`, replacing
  `ImprovedAnswerCard` + the coach-view diff + `MarkedUpScript`) → pronunciation block (same JSX,
  same props) → Try again / Next question. The one-focus line, every correction with its lesson,
  vocabulary and expansion ideas are in Full report. `FeedbackPointList` is extracted from
  `ExaminerFeedbackCard` and used by both voices (examiner markup unchanged, its 20 tests green).
  `cefrLevelLabel` clamps the model's `cefrLevel` at display (B2/C1/C2 → "Stretch (B1+)") in
  `SnapshotCard`, `FeedbackPanel` (Daily News) and the importer-less `SessionComplete`; the band
  pill is gone (D3). `FeedbackExperience.test.tsx`, `coachPoints.test.ts`, `levelLabel.test.ts`.

**Deviations and judgement calls.**
1. "At most 2" is enforced by the prompt and by the coach view, not by truncating the reply: the
   server's depth caps are unchanged and every valid error the model returns still reaches
   evidence (a display limit is not a filter).
2. The prompt is shared by every coach-endpoint caller, so Story, Roleplay, Scenario Architect,
   Daily News and placement also get ≤ 2 fixes and no advanced answer. Daily News sends audio and
   uses `MULTIMODAL_SYSTEM_PROMPT`, which only lost the `advanced_answer` line (no 2-fix rule).
   Fewer reported errors per answer is also fewer error ids in evidence for all of them.
3. `biggest_opportunity` is not in the plan's coach-view list, so it moved to Full report.
4. Removed with no importer left: `ImprovedAnswerCard.tsx`, `AdvancedAnswerCard.tsx`, the card
   plan's `showAdvancedAnswer`, and the footer's disabled "Coming soon" bookmark button.
5. Not filtered: the streaming partial sections (transient; the `complete` result replaces them).
   The older `applyQualityGate` still drops an issue whose quote is not a substring of the
   *client* transcript — unchanged.
6. Observation for the owner, pre-existing: backend corrections map to `category: 'grammar'`
   (deliberately unmapped in `nodeMap.ts`) and backend grammar items carry `themeLabel`, not
   `theme`, so LLM coach errors produce no per-node failure observation — they reach beliefs only
   as counts on the language event.

**Deploy and rollback.** Backend first, then frontend; the contract does not move, so each side
works with the other's previous version (an old frontend gets `advanced_answer: ""` and hides that
card; a new frontend with the v4 backend shows ≤ 2 of however many fixes arrive). Either commit can
be reverted alone. Not deployed from this session.

Gate at commit: `npm run typecheck` clean · `typecheck:server` clean · `npm run lint` 0 errors (21
pre-existing warnings) · `npm test` **315 files / 3107 tests passed** (with `backend/` linked) ·
`learn:check -- --draft` 0 errors (71 warnings, unchanged) · `authoring:check` 0/0 ·
`authoring:parity` 10/10 · `examiner:parity` matches · backend `pytest tests` 461 passed. Not run:
Playwright end-to-end (a Learn answer needs speech input; the feedback screen is covered by the
jsdom render test, light-mode visuals are Batch 5).

## 2026-10-07 — Learn overhaul Batch 5: light mode and visual polish

**What changed (UI only; no scoring, evidence, selection or contract change).**

1. **Tokens.** `--info-text` / `--info-soft` added in both themes (the cyan "review" chips stayed, so
   the pair was needed); light `--progress-text` darkened `#047857` → `#065F46` because it measured
   4.41:1 on its own soft fill over `surface-recessed` (< AA). `tailwind.config.js` gains `info`.
2. **Sweep.** Every raw 100–500 Tailwind text/decoration colour in Learn and feedback was mapped by
   role (text/icon/decoration → `-text` token; slate 100–200 → `ink`, 300–500 → `ink-muted`;
   soft tinted pairs → `bg-*-soft border-hairline`; dark `bg-slate-*` panels → `surface-recessed`,
   tracks/skeletons → `bg-track`). Violet-button text and the two mic icons use `text-action-ink`.
   `severity.ts` is token-based (hex removed; wavy underlines use `decoration-correction` etc.);
   `domain/scoring.ts` gains `scoreTone` (same 8/6 thresholds) for Learn text — `scoreColor` is
   unchanged because `PronunciationCard` (out of bounds) uses it as an SVG stroke.
3. **Deleted** (no importers): `PersonalizedContextBanner`, `AvoidanceCard`, `TopPriorityCard`,
   `StyleStructureCard`, `ExaminerNotebookCard`, `DeepAnalysisToggle`, `DeepAnalysisCard`, plus
   `selectShowExaminerNotebook` and the hook's `showExaminerNotebook`.
4. **Clutter cuts.** ADV badge removed from the topic grid; "Active Session" subtitle → the topic's
   English name; 49 nine/ten-px uppercase eyebrows → `text-eyebrow`; the summary's demand-mastery
   "+n%" bars → "You practised giving reasons 3×" (`features/learn/sessionRecap.ts`, tested);
   confetti only for a session average ≥ 7.
5. **Carry-over fix from Batch 1/4.** The question chip still printed the raw derived band
   ("B2") — now `levelLabel(...)` ("Stretch (B1+)"); test `QuestionCard.chip.test.tsx`.

**Guards (written first, failing, then green).** `lightContrast.test.ts` (7 rules, named
pronunciation allowlist, fenced block in `FeedbackExperience.tsx`) and `tokenContrast.test.ts`
(32 cases, both themes, AA 4.5:1 text / 3:1 strokes).

**Deviations from the plan, for the owner.**
- *Personal-best confetti:* no per-topic best-session score is persisted, and adding one is a new
  store (out of scope); confetti is average ≥ 7 only.
- *Locked topics:* the lock itself is live, tested gating (CLAUDE.md), so only the ADV badge was cut.
- *Emoji tier icons:* already gone with Batch 2's tier grid; nothing left to remove.
- *Pronunciation block:* `FeedbackExperience.tsx`'s inline pronunciation status block keeps its raw
  cyan classes untouched (fenced), as do the three pronunciation cards.
- *Playwright screenshots* were taken ad hoc (setup and question screens, light and dark,
  430px); the feedback screen needs a live speech/LLM round trip and was not captured — it is covered
  by the jsdom `FeedbackExperience` test and the lint guards. Not committed as an e2e spec.
- *Branch base:* this branch lacked Batches 1–4 (they sat on `claude/peaceful-euler-6mk3y1`); both
  repos were fast-forwarded to it before starting, no history rewritten.

**Rollback.** Pure presentation: reverting the Batch 5 commit restores the previous classes; the two
new tokens are additive.

Gate at commit: `typecheck` clean · `typecheck:server` clean · `lint` 0 errors (21 pre-existing
warnings) · `npm test` **319 files / 3152 tests passed** (with `backend/` linked at the Batch 4
backend head) · `learn:check -- --draft` unchanged. Not run: Playwright e2e, backend pytest (no
backend change).
