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
