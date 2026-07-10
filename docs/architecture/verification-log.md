# Verification log

Record of what was built, independently verified, and deliberately deferred at
each roadmap subphase. Append-only; each entry is written at the end of the
subphase that produced it.

---

## S1 — Layer-2 scorer (retroactive entry)

Built the three-layer scorer's Layer 2: `scoreSpeaking.ts` (provenance guard →
prompt → judge → parse → validate), `schema.ts` (zod validation + normalized
quote-grounding), `prompt.ts` (judgement prompt construction), and the
`SpeakingTranscript` / `Judge` port contracts in `judgement/types.ts`.

This entry is written retroactively as part of S3's entry-gate work, since S2's
own exit criteria required a verification-log entry for S1 that was never
created. No new verification was performed here beyond confirming the existing
S1 test suite (`prompt.test.ts`, `schema.test.ts`, `scoreSpeaking.test.ts`) was
green at the start of S3, which it was.

---

## S2 — S1 verification gate + Layer 1 evidence signals (retroactive entry)

Independently verified S1 per the S2 entry gate: ran the full test suite,
inspected the L2 scorer files, ran the golden transcript end-to-end. Built
Layer 1: `buildEvidenceSubset` and its four detectors (time-frame alignment,
response/word counts, filler density, two-part-task `parts_addressed`) in
`src/domain/igcse/evidence/`, with unit tests and a golden-transcript
regression test (`buildEvidence.golden.test.ts`).

This entry is written retroactively alongside the S1 entry above, for the same
reason: S2's own exit criteria required this file to exist, and it did not.
All S2 tests were green at the start of S3.

---

## S3 — STT ingest layer

### What was built

A pure domain layer at `src/domain/igcse/stt/` that turns a teacher-conducted
recording into a structured, audited `SessionTranscript`, plus a lossy
deterministic projection down to S1's existing `SpeakingTranscript` so S1/S2
keep working unmodified:

- **Step 0 (blocking prerequisite):** widened `SpeakingTranscript.contentProvenance`
  to `'original-practice' | 'confidential-internal'`; `assertProvenance` now
  accepts both (confidentiality gates redistribution, not scoring); added
  `assertRedistributable()` as a new, separate guard called only by the
  Supabase sync adapter. Existing fixtures kept `'original-practice'`, so
  `buildEvidence.golden.test.ts` and `scoreSpeaking.test.ts` were unaffected.
- **Normaliser extraction:** `normalizeForMatch` / `canonicalizeForMatch` moved
  to `src/domain/igcse/text/normalize.ts`, re-exported from `judgement/schema.ts`
  for backward compatibility. S3's question matching and L3's quote-verification
  guardrail now share one normaliser.
- **Types + schema:** `SessionTranscript`, `Utterance`, `Word`, `ExaminerEvent`,
  `SessionQuestionSet`, `RawAsrResult`, `SttMetadata` in `stt/types.ts`; zod
  validation with schema-version read-dispatch in `stt/schema.ts`.
- **Ports:** `TranscriptionProvider`, `TranscriptStore` in `stt/ports.ts` —
  the only two places this subphase touches the outside world.
- **Pure assemblers:** `matchQuestion` (normalized token-set/Jaccard similarity),
  `segmentUtterances` (word-stream → utterances by speaker-cluster change and
  silence gap, with running `part`/`questionId` attribution), `labelSpeakers`
  (two-cluster → examiner/candidate via question-match scoring, with a
  `roleLabelConfidence` that surfaces ties instead of guessing), `annotateExaminer`
  (examiner utterances → raw `ExaminerEvent[]`, never aggregated — that's an L1
  detector, a later subphase), and `assembleSession` (pure orchestration).
- **Projection + quality:** `toSpeakingTranscript(session, questionSet)` and
  `summariseQuality(session)`.
  **Deviation from the original plan:** `toSpeakingTranscript` takes the
  `SessionQuestionSet` as a second argument, not the plan's 1-arg signature.
  `SessionTranscript` only stores `questionSetId`/`questionSetHash`, not the
  full question set, so `expectedTimeFrame` / `partsExpected` / `topicArea`
  cannot be carried across without it. Confirmed with the user before
  implementing; documented in `stt/project/toSpeakingTranscript.ts`.
- **Fixtures + stores:** `createFixtureProvider`, `createFixtureTranscriptStore`
  (pure, in `src/`); `createFileTranscriptStore`, `createSupabaseTranscriptStore`
  (impure, in `scripts/stt/`).
- **CLI + sidecar:** `scripts/stt/ingestSession.ts` (parses args, wires
  provider + store, runs the assembler, warns on low `roleLabelConfidence`),
  `scripts/stt/whisperXProvider.ts` (spawns the Python sidecar, normalises
  stdout into `RawAsrResult`), `scripts/stt/sidecar/transcribe.py` (whisperX:
  forced `fr`, word-level alignment scores, pyannote diarization).
- **Public surface:** `src/domain/igcse/stt/index.ts` — the four symbols S4
  needs (`TranscriptStore`, `toSpeakingTranscript`, `summariseQuality`,
  `session.stt`), plus supporting types.
- **Supabase leg:** migration `20260710103213_add_session_transcripts.sql`
  (owner-scoped RLS + a `content_provenance = 'original-practice'` CHECK
  constraint as defense-in-depth alongside the application-level guard);
  `scripts/stt/supabaseTranscriptStore.ts` calls `assertRedistributable()`
  before any Supabase client call.

### Doc drift found, recorded for S4

`02-scoring-pipeline-architecture.md` §3.8's `ScoringEnvelope.stt` declares only
four fields (`model`, `modelVersion`, `languageCode`, `promptBiasedRetries`).
`SttMetadata` (this subphase) is a strict superset — it also carries
`alignmentModel`, `diarizationModel`, and `decodeParamsHash`, without which a
score is not reproducible (whisperX's word confidences come from a separate
forced-alignment model, not from Whisper itself). **Recommendation for S4:**
embed `SttMetadata` wholesale into `ScoringEnvelope.stt` rather than lossily
projecting down to the four documented fields.

### Independently verified

- `npm test` (335 tests, 41 files) — all green, including
  `buildEvidence.golden.test.ts` and `scoreSpeaking.test.ts` unchanged from
  before S3 started (the proof that S1/S2 were not disturbed).
- `npm run typecheck` — same pre-existing failures as before S3 (unrelated
  screens/`WeaknessAnalysis.tsx`/`StoryMode.tsx`/etc.); zero new errors from
  any `src/domain/igcse/stt/` file.
- `npm run typecheck:scripts` (new) — zero errors from any `scripts/stt/`
  file. **Caveat:** the command's overall exit code is non-zero because
  `include: ["scripts"]` also typechecks the pre-existing `scripts/seed-content.ts`,
  which transitively imports `src/data/scenarios/offlineScenarios.ts` and
  `src/data/questions.ts` — both of which already fail under the main
  `npm run typecheck` today (`OfflineScenarioState` missing a `memory` property;
  an unused `DAILY_CHALLENGES` export). Pre-existing, not introduced by S3;
  left as-is per scope (S3 does not own `src/data/`).
- `npm run lint` — zero new errors from any `stt/` or `scripts/stt/` file
  (fixed two on first pass: an unused destructured binding in `schema.test.ts`,
  an unused provider-input parameter in `fixtureProvider.ts`). Same ~106
  pre-existing errors elsewhere in the repo, unrelated to S3.
- Seam test (`seam.test.ts`): fixture `SessionTranscript` →
  `createFixtureTranscriptStore` → `toSpeakingTranscript` →
  `buildEvidenceSubset` produces a well-formed `EvidenceProfileSubset`. Proves
  S4's batch harness can run end-to-end with zero audio.
- Independence test (`independence.test.ts`): nothing under `stt/` imports
  `rubric.ts`, `judgement/schema.ts`, or `judgement/prompt.ts`; the one import
  from `judgement/types` (`SpeakingTranscript`, for the projection's return
  type) is `import type`-only.
- Every committed fixture JSON parses under the current schema — clean session
  (golden), adversarial (overlapping speech, echoing candidate, sub-0.3-confidence
  span, unmatched examiner back-channel), structurally complete (5 role-play +
  5+5 topic questions), short-duration (candidate speaking time well under 4
  minutes across topic1+topic2), and app-conducted (`annotationSource:
  'session-engine-log'`, `diarizationModel: null`, `matchScore: 1` — the S10
  generalisation check).
- Per-part candidate speaking time is derivable directly from `utterances`
  without consulting `examinerEvents` (S5 guardrail precondition) — asserted in
  `assembleSession.fixtures.test.ts`.
- Confidentiality check: `SupabaseTranscriptStore.save()` throws before any
  network call for `'confidential-internal'` transcripts
  (`scripts/stt/__tests__/supabaseTranscriptStore.test.ts`, Supabase client
  mocked). `git status` shows no `data/` files staged.

### Explicitly deferred (per the original scope)

WER measurement, hand-corrected reference transcripts, accuracy benchmarking,
production validation, anything requiring real teacher recordings, and the
two-pass biased-decoding retry for low-confidence spans (`promptBiasedRetries`
is always `0` in S3 core). The manual smoke test against a self-recorded clip
(`npm run stt:ingest -- --session smoke --provider whisperx`) was **not**
run in this session — it requires a Hugging Face token, model downloads, and a
real microphone recording, none of which were available in this environment.
This is the one exit-criterion item from the original plan that remains
outstanding and should be run before S3 is considered fully closed.

---

## S4 — ScoringEnvelope end-to-end + Phase A batch harness

### What was built

The orchestrated pipeline that turns already-computed S1/S2/S3 outputs into a
versioned, immutable `ScoringEnvelope`, persists it, and a batch CLI that
scores a directory of transcripts and diffs against teacher marks — zero new
scoring logic, per the roadmap's S4 scope.

- **Version constants + pinned-hash tests:** `RUBRIC_VERSION` (`rubric.ts`),
  `EVIDENCE_DETECTOR_VERSION` (`evidence/version.ts`, new file),
  `SCORING_PROMPT_VERSION` (`judgement/version.ts`, new file),
  `ENVELOPE_SCHEMA_VERSION` (`envelope/types.ts`). Each is paired with a
  version-pin test that hashes *rendered output* against a committed fixture
  transcript (`src/domain/igcse/__tests__/version-pin.test.ts`,
  `evidence/__tests__/version-pin.test.ts`,
  `judgement/__tests__/version-pin.test.ts`) — these fail loudly with an
  explicit "bump the version and update the hash together" message the
  moment rubric/evidence/prompt output changes, without firing on comments,
  formatting, or refactors that don't change behavior.
- **`envelope/` domain layer** (`src/domain/igcse/envelope/`): `types.ts`
  (`ScoringEnvelope`, `VersionStack`, `LlmProvenance`, per-criterion output
  shapes), `schema.ts` (zod validation, `parseScoringEnvelope` dispatching on
  `versions.envelopeSchemaVersion` first — same read-dispatch discipline as
  `stt/schema.ts`), `ports.ts` (`EnvelopeStore`), `buildEnvelope.ts` (pure
  assembly — zero scoring logic, only fills the S4 sentinels), `index.ts`
  (public surface), `providers/fixtureEnvelopeStore.ts` (in-memory, mirrors
  `fixtureTranscriptStore.ts`).
- **Golden + sentinel + wholesale-embedding tests**
  (`envelope/__tests__/buildEnvelope.golden.test.ts`,
  `sentinels.test.ts`, `sttEmbedding.test.ts`): exact-shape regression against
  the existing `PRACTICE_TRANSCRIPT`/`buildValidJudgeOutput` S1 fixtures;
  explicit assertions that `calibrationVersion`/`guardrailsVersion`/
  `gradeBoundarySeries` are always the literal `'none'`,
  `anchorsUsedByCriterion`/`guardrailTriggers` are always `[]`,
  `selfConsistencyOutcomes.agreement` is always `'single_run'`,
  every criterion's `confidence` is always `'unassessed'`, `llm.selfConsistencyRuns`
  is always literal `1`, and `predictedGrade` is absent from the type (not
  merely falsy); `envelope.stt` deep-equals the full 10-field `SttMetadata`
  wholesale, never a lossy 4-field projection.
- **`scripts/scoring/engineVersion.ts`:** `package.json` version + short git
  SHA if available, wrapped in try/catch so it never crashes in an
  environment without git.
- **`scripts/scoring/anthropicJudge.ts`:** the first-ever concrete `Judge`
  implementation, wrapping `@anthropic-ai/sdk` (newly added to
  `package.json`). Model `claude-opus-4-8`, `thinking: {type: 'adaptive'}`,
  `output_config: {effort}` (default `'high'`) — **no** `temperature`/`top_p`/
  `top_k` (current models reject them outright with a 400) and **no** `seed`
  (no such parameter has ever existed in the Messages API — see "Doc drift"
  below). Implemented as a **fresh-per-attempt factory**
  (`createAnthropicJudge()` returning `{judge, getLastCallMetadata}`), never
  memoized or shared across attempts, per the post-review correction in the
  plan — proven by `judgeFactoryIsolation.test.ts` (sequential and
  `Promise.all`-concurrent instances never bleed `llm` metadata across
  attempts). Request-shape unit tests
  (`anthropicJudge.test.ts`) assert the exact request shape via an injected
  fake client — no real network in the suite.
- **`scripts/scoring/fileEnvelopeStore.ts`** (mirrors `fileTranscriptStore.ts`
  exactly: `data/envelopes/<attemptId>/envelope.json`) and
  **`scripts/scoring/supabaseEnvelopeStore.ts`** (mirrors
  `supabaseTranscriptStore.ts`: `assertRedistributable()` as the first
  statement in `save()`, before any client call). New Supabase migration
  `20260710055745_add_scoring_envelopes.sql`: `scoring_envelopes` table keyed
  by `attempt_id`, `session_id` column + index for `listBySession`-style
  lookups, owner-scoped RLS, and a `content_provenance = 'original-practice'`
  CHECK constraint as defense-in-depth — stays empty through Phase A, same as
  `session_transcripts`.
- **`src/domain/igcse/comparison/`:** `teacherMark.ts` (`TeacherMark`,
  `TeacherMarkSet`, zod-validated `parseTeacherMarkSet`) kept fully separate
  from `ScoringEnvelope`, never embedded in the same store, persisted as a
  sibling `teacher-marks.json`; `diff.ts` (`buildDiffRows`, pure) — one row
  per role-play task plus one each for communication/QoL, `null` teacher
  fields when absent (never fabricated), role-play `taskId` matched
  precisely (a mark for a nonexistent taskId never leaks onto a real task).
- **`scripts/scoring/csv.ts`:** hand-rolled ~20-line RFC4180-ish writer (no
  CSV library in `package.json`) — every field is unconditionally quoted and
  `"`-doubled, not just when a special character is detected, since
  justification/comment text routinely contains commas/quotes/newlines in
  practice. Dedicated escaping tests (`csv.test.ts`) cover commas, quotes,
  newlines, and all three together in realistic multi-sentence text.
- **`scripts/scoring/scoreAttempt.ts`:** the orchestration function —
  `transcriptStore.load` → `toSpeakingTranscript` → `buildEvidenceSubset` →
  `scoreSpeaking` → `buildScoringEnvelope`. Takes `createJudge` as a factory
  dependency, called fresh once per attempt. Errors (`ProvenanceError`,
  `JudgementValidationError`) propagate unchanged — the batch harness decides
  how to handle a failed attempt, not this function (proven by a dedicated
  test). `replayEnvelope(deps, prior, questionSet)` uses only
  `prior.sessionId` to reload the transcript fresh via
  `deps.transcriptStore.load` and re-runs the full pipeline under whatever
  version constants are current at replay time — it **never** reads
  `prior.transcriptSnapshot`/`prior.evidenceProfileSnapshot` as inputs. Proven
  by two tests: one injects a different `evidenceDetectorVersion` between the
  original scoring call and the replay call (via a new, test-only
  `ScoreAttemptDeps.versions` override) and asserts the replayed envelope's
  version reflects the new value; another corrupts
  `prior.evidenceProfileSnapshot`/`transcriptSnapshot` and asserts the
  replayed envelope's own snapshots are unaffected, with a `vi.spyOn` on
  `transcriptStore.load` confirming it's called again rather than short-circuiting.
- **`scripts/scoring/batchScore.ts`:** the CLI — hand-rolled arg parsing
  (`--transcript-store file|fixture`, `--sessions-root`, `--judge
  anthropic|fixture`, `--out-dir`, repeatable `--session`), `main().catch()`
  pattern guarded by an `import.meta.url` entrypoint check (so
  `runBatchScore` stays importable and unit-testable without invoking the
  CLI on import — a deviation from `ingestSession.ts`'s unguarded pattern,
  needed here because this file is imported directly by
  `batchScore.test.ts`). Per-session: load transcript + question set →
  `scoreAttempt` (try/catch — `ProvenanceError`/`JudgementValidationError`
  logged as a `scoringFailed` row, batch continues) → `envelopeStore.save` →
  load `teacher-marks.json` if present (never assumed to exist) →
  `buildDiffRows` → append. Outputs `diff.csv` and `report.md` (per-session
  sections + a `scoringFailed` summary). `runBatchScore` accepts optional
  store/judge overrides so tests can inject fixtures without touching the
  filesystem or network. `package.json` gained the `score:batch` script.
- **New `package.json` script + dependency:** `"score:batch": "tsx
  scripts/scoring/batchScore.ts"`; `@anthropic-ai/sdk` added as a new
  dependency (not previously installed).

### Doc drift found, recorded per the plan

Two corrections to `02-scoring-pipeline-architecture.md` §3.8, both
confirmed during S4 research and implemented as described in the S4 plan
document (`i-am-implementing-s4-groovy-lighthouse.md`):

1. **`llm.temperature`/`llm.seed` are dead.** Current-generation Claude
   models (`claude-opus-4-8` and newer) reject `temperature`/`top_p`/`top_k`
   outright with an HTTP 400, and no `seed` parameter has ever existed in the
   Messages API. `ScoringEnvelope.llm` in this codebase carries `model`,
   `effort`, `thinking: {type: 'adaptive'}`, `selfConsistencyRuns` (literal
   `1` in S4), and an optional `responseId` audit pointer — no
   `temperature`/`seed` fields exist anywhere in the type.
2. **`evidencePromptVersion` doesn't correspond to any real code.** L1
   evidence extraction (`buildEvidenceSubset`) is 100% deterministic
   regex/counting code with zero LLM calls — there is no "evidence-pass
   prompt" to version. `VersionStack` omits this field entirely rather than
   fabricating a version string for code that doesn't exist; the only
   real LLM pass is scoring, versioned as `scoringPromptVersion`.

Both are the same doc-drift class S3 flagged for `ScoringEnvelope.stt` (a
4-field sketch vs. the 10-field `SttMetadata` actually needed) — this
codebase embeds `SttMetadata` wholesale, as S3 recommended.

### Independently verified

- `npm test` (387 tests, 57 files) — all green, including every pre-existing
  S1/S2/S3 test file unchanged from before S4 started.
- `npm run typecheck` — one new error appeared during development
  (`envelope/schema.ts`'s `result.data as ScoringEnvelope` cast failed
  because the loosely-validated `stt`/`evidenceProfileSnapshot`/
  `transcriptSnapshot` fields are typed `Record<string, unknown>` in the zod
  schema) — fixed by casting through `unknown` first
  (`result.data as unknown as ScoringEnvelope`), consistent with the schema's
  deliberate choice to validate those fields loosely (they are audit
  snapshots / an external stt block, not re-derived contracts) while trusting
  TypeScript's own types as the shape's source of truth. Confirmed zero new
  errors from any `envelope/`, `comparison/`, or `scripts/scoring/` file
  after the fix; the same pre-existing failures as before S4 remain
  (`src/data/questions.ts`, `src/data/scenarios/offlineScenarios.ts`,
  various `src/screens/*.tsx` — all predate S4, none touch scoring code).
- `npm run typecheck:scripts` — one new error appeared in
  `anthropicJudge.test.ts` (a `vi.fn(async () => ...)` mock inferred a
  zero-arg tuple, so `.mock.calls[0][0]` failed under this config's
  `noUnusedParameters`/strict settings) — fixed by giving the mock's
  implementation an explicit `FakeCreateParams` parameter type. Confirmed
  zero new errors from any `scripts/scoring/*` file afterward; the command's
  overall exit code is still non-zero for the same pre-existing
  `scripts/seed-content.ts` transitive-import reasons S3 already documented.
- `npm run lint` was not re-run in this session as a separate step (no
  lint-only issues surfaced during `npm test`/`typecheck` iteration); revisit
  before merge if the project's CI gates on it.
- The zero-network end-to-end fixture test
  (`scripts/scoring/__tests__/endToEnd.fixture.test.ts`) is the direct proof
  of the S4 exit criterion: recording → transcript → L1 → L2 → envelope →
  diff row, zero manual steps, run and shown green — with a `fetch` spy
  asserting zero network calls across the whole pipeline.
- Judge-factory isolation (`judgeFactoryIsolation.test.ts`): two fresh
  `createAnthropicJudge()` instances, exercised both sequentially and via
  `Promise.all`, never bleed `llm` call metadata across attempts.
- Replay source-of-truth (`scoreAttempt.test.ts`): `replayEnvelope` reloads
  via `TranscriptStore.load` (spied, confirmed called again with
  `prior.sessionId`) and never reads `prior.transcriptSnapshot`/
  `evidenceProfileSnapshot` — proven both by an injected differing
  `evidenceDetectorVersion` and by corrupting the prior snapshots and
  confirming the replayed envelope is unaffected.
- Batch harness (`batchScore.test.ts`): fixture stores throughout; asserts
  `diff.csv`/`report.md` shape, missing-teacher-marks handling (`null`
  fields, never fabricated), present-teacher-marks delta computation, and
  that a `JudgementValidationError` in one session's judge is isolated to a
  `scoringFailed` row while the rest of the batch continues and still
  produces diff rows for the surviving session.
- CSV escaping (`csv.test.ts`): commas, quotes, newlines, and all three
  together in realistic multi-sentence justification text with an embedded
  apostrophe and em-dash.

### Explicitly deferred (per the original scope)

**One real manual smoke test against the live Anthropic API was NOT run in
this session** — it requires a live `ANTHROPIC_API_KEY` and network access,
neither available in this environment. This is the one outstanding item from
the plan's exit-criterion checklist (`npm run score:batch -- --judge
anthropic` against a single fixture/session with a live API key, inspected
manually) and should be run before S4 is considered fully closed. Everything
else in the plan's "Recommended implementation order" (steps 1–12, 14) was
completed in this session; step 13 (the live smoke test) remains outstanding.

Also deferred, per explicit S4 scope (not gaps, but future subphases):
guardrails (S5), self-consistency's second L2 call (S9), calibration anchors
(S8), grade boundaries (S12), prompt caching in `buildJudgementPrompt` (S6 —
the transcript is placed before the marking-instructions/output-format
sections, so a `cache_control` breakpoint today would cache the wrong,
volatile-preceding-stable content), and structured outputs / `output_config.format`
on the judge request (deferred to keep the existing zod-validation safety net
as the sole guard for this first cut).
