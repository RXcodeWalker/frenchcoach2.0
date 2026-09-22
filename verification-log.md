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
