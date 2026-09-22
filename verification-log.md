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
