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

## Provider swap — Gemini primary Judge, Groq automatic fallback

Replaces the Anthropic Judge implementation from the S4 entry above.
**Gemini is now the primary Judge provider for production scoring; Groq is
the automatic fallback; Anthropic is no longer used for production scoring.**
This is a provider substitution only — the three-layer architecture, the
`Judge` port (`(req) => Promise<{raw: string}>`), `scoreSpeaking`,
`buildJudgementPrompt`, `buildScoringEnvelope`, `scoreAttempt`/`replayEnvelope`,
and all envelope types are unchanged except for the minimal, additive
`LlmProvenance` change described below.

### What was built

- `scripts/scoring/providers/geminiJudge.ts` — `createGeminiJudge()`, wraps
  `@google/genai`'s `GoogleGenAI.models.generateContent`. Model:
  `gemini-2.5-flash-lite`. No `effort`/`thinking` params sent — those are
  Anthropic-specific concepts with no Gemini equivalent. Captures
  `{model, responseId}` per call via the same fresh-per-attempt closure
  pattern as the removed `anthropicJudge.ts`.
- `scripts/scoring/providers/groqJudge.ts` — `createGroqJudge()`, wraps
  `groq-sdk`'s `chat.completions.create` (OpenAI-shaped). Default model
  `llama-3.3-70b-versatile`. Same metadata-capture pattern.
- `scripts/scoring/providers/judgeFactory.ts` — `createJudgeWithFallback()`,
  the single provider-selection seam. Tries Gemini first; only falls back to
  Groq when the Gemini **call itself throws** (network failure, timeout,
  provider unavailable, rate limit — i.e. the SDK call rejects). A
  successful-but-low-quality Gemini response (malformed JSON, ungrounded
  evidence) is never a fallback trigger, because `scoreSpeaking` parses/
  validates the judge's `raw` string *after* this factory's `judge()` call
  already resolved — this composite judge only ever sees provider-call
  exceptions, never downstream validation failures. Never runs both
  providers for one attempt; records whichever one actually answered.
- `src/domain/igcse/envelope/types.ts` — `LlmProvenance` gains
  `provider: 'gemini' | 'groq'` (new `LlmProviderName` type) and `effort`/
  `thinking` are now optional rather than required, since neither Gemini nor
  Groq exposes an equivalent knob and metadata must never be fabricated.
  `src/domain/igcse/envelope/schema.ts` updated to match (`provider` enum
  required, `effort`/`thinking` optional).
- `scripts/scoring/scoreAttempt.ts` — `CreateJudgeResult`'s metadata shape
  narrowed to `{provider, model, responseId?}`; the `llm` block assembled for
  `buildScoringEnvelope` now carries `provider` and omits `effort`/`thinking`
  entirely (no `{type: 'adaptive'}` literal survives from the Anthropic era).
- `scripts/scoring/batchScore.ts` — `--judge gemini` (replaces
  `--judge anthropic`) invokes `createJudgeWithFallback()`; `--judge fixture`
  unchanged for tests.
- Removed: `scripts/scoring/anthropicJudge.ts` and its test,
  `scripts/scoring/__tests__/judgeFactoryIsolation.test.ts` (superseded by
  `providers/__tests__/judgeFactory.test.ts`), the `@anthropic-ai/sdk`
  dependency.
- Added dependencies: `@google/genai` (Gemini SDK), `groq-sdk` (Groq SDK).
- Tests: `providers/__tests__/geminiJudge.test.ts`,
  `providers/__tests__/groqJudge.test.ts` (request shape, response mapping,
  metadata capture, custom-model override, no-content error path — mirrors
  the removed `anthropicJudge.test.ts` structure per provider),
  `providers/__tests__/judgeFactory.test.ts` (Gemini success never calls
  Groq; Gemini request failure triggers Groq fallback and records
  `provider: 'groq'`; exactly one provider is ever called per attempt, even
  under concurrent invocations; both-providers-fail throws a combined error;
  a successful-but-garbage Gemini response is *not* a fallback trigger).
  All envelope/comparison fixture blocks (`buildEnvelope.golden.test.ts`,
  `sentinels.test.ts`, `sttEmbedding.test.ts`, `diff.test.ts`,
  `fileEnvelopeStore.test.ts`, `supabaseEnvelopeStore.test.ts`,
  `scoreAttempt.test.ts`, `batchScore.test.ts`, `endToEnd.fixture.test.ts`)
  updated from the Anthropic-shaped `llm` block to
  `{provider: 'gemini', model: 'gemini-2.5-flash-lite', selfConsistencyRuns: 1}`.

### Independently verified

- `npm test`: 396/396 tests passing (58 files), including the 3 new provider
  test files.
- `npm run typecheck`: identical pre-existing error set to the prior S4
  baseline (`src/data/`, `src/screens/` — all unrelated to scoring code);
  zero errors in any `envelope/`, `comparison/`, `scripts/scoring/`, or
  `judgement/` path.
- `npm run typecheck:scripts`: same pre-existing baseline; zero new errors
  from any `scripts/scoring/*` file, including the new `providers/` directory.
- `npx eslint scripts/scoring/providers`: clean.

### Explicitly deferred

No live smoke test against the real Gemini/Groq APIs was run in this
session — same constraint as the original S4 entry (no API keys/network in
this environment). `npm run score:batch -- --judge gemini` against a real
session with live `GEMINI_API_KEY`/`GROQ_API_KEY` credentials, including a
deliberate Gemini-failure scenario to confirm the Groq fallback path fires
in practice, remains an outstanding manual verification step.

---

## S5 — Guardrails v1 + synthetic trip set

Built the first slice of Layer 3: `src/domain/igcse/guardrails/` with two
pure, deterministic, advisory-only guardrails, wired into the envelope.

- `quoteVerification.ts::verifyQuotes` — every evidence span quoted in a
  `SpeakingAssessment` must be a substring of the transcript (normalized).
  Reuses the existing `buildEvidenceCorpora` / `isQuoteGrounded` helpers from
  `judgement/schema.ts` rather than duplicating quote-matching logic. Silent
  by construction on real judge output (L2 parse already rejects ungrounded
  quotes); exists as defense-in-depth and an independently testable L3 unit.
- `insufficientEvidence.ts::checkInsufficientEvidence` — fires when combined
  topic-conversation candidate material is below threshold: `< 240s` total
  candidate speaking duration OR `< 200` combined words
  (`guardrails/config.ts::DEFAULT_DURATION_CONFIG`, labelled `UNVALIDATED`,
  tuned in Phase A/S6). The duration sub-check only applies when total
  duration `> 0`, since `candidateSpeakingDurationS` is `0` whenever no turn
  carries STT timing (hand-authored transcripts) and absence is not a penalty
  signal — a dedicated regression test asserts this does not false-positive.
- `runGuardrails.ts` composes both into a `GuardrailReport`; pure, no I/O.
- `guardrails/__tests__/synthetic.ts` — the trip-set fixtures: a clean,
  sufficiently long transcript/assessment pair (silent on both guardrails), a
  hand-built fabricated-quote assessment (fires quote verification), a
  low-word-count transcript (fires the word sub-check only), and a
  long-but-slow-timed transcript (fires the duration sub-check only).
  Structured/commented by guardrail origin so S6 can extend rather than
  rewrite it.
- Version-pin test hashes `{config, report}` together (not report alone), so
  a threshold edit in `config.ts` always changes the hash even when it
  doesn't flip a fixture's trigger — forcing a `GUARDRAILS_VERSION` bump in
  the same commit as any threshold change.

### Wired into the envelope (advisory only)

- `envelope/types.ts`: `VersionStack.guardrailsVersion` widened from the
  literal `'none'` to `string`. `guardrailTriggers` is no longer hardcoded
  empty. `calibrationVersion` / `gradeBoundarySeries` remain `'none'`
  (S8/S12) — only the S5 seam changed.
- `envelope/schema.ts`: `guardrailsVersion` relaxed from `z.literal('none')`
  to `z.string()` — backward-compatible (old `'none'` envelopes still parse),
  so no `ENVELOPE_SCHEMA_VERSION` bump or upcaster was needed.
- `envelope/buildEnvelope.ts`: `BuildScoringEnvelopeInput` gains
  `versions.guardrailsVersion` and top-level `guardrailTriggers`, both now
  required inputs (no more sentinel fill-in).
- `scripts/scoring/scoreAttempt.ts`: calls `runGuardrails(assessment,
  evidenceProfile, speakingTranscript)` after `scoreSpeaking`, threads
  trigger ids and `GUARDRAILS_VERSION` into `buildScoringEnvelope`.
  Guardrails remain advisory in v1 — no mark-clamping, no `unscored`
  short-circuit, no `CriterionConfidence` widening (all Phase-A-gated,
  S6/S7).
- Updated all envelope/comparison fixture blocks that construct
  `BuildScoringEnvelopeInput` or a raw `ScoringEnvelope` to supply
  `guardrailsVersion: 'guardrails-v0.1'` and `guardrailTriggers: []`:
  `buildEnvelope.golden.test.ts`, `sentinels.test.ts` (assertions updated
  from "always none/empty" to "real value passed through"),
  `sttEmbedding.test.ts`, `diff.test.ts`, `fileEnvelopeStore.test.ts`,
  `supabaseEnvelopeStore.test.ts` (also fixed a pre-existing gap: its
  `evidenceProfileSnapshot` fixture was missing
  `topicConversationDurationByConversation`, added in S4 but never
  backfilled into this fixture — surfaced now because TypeScript checks this
  file for the first time in this task's typecheck pass).

### Independently verified

- `npm test`: 421/421 tests passing (64 files), including 9 new guardrail
  tests across 5 new test files.
- `npm run typecheck` / `npm run typecheck:scripts`: zero errors in any
  `guardrails/`, `envelope/`, `judgement/`, `evidence/`, or `scripts/scoring/`
  path; identical pre-existing unrelated error set in `src/data/`,
  `src/screens/`.
- `npx eslint` (full run): zero errors/warnings in any guardrails/envelope/
  scoreAttempt file; identical pre-existing unrelated error set elsewhere.
- Manual confirmation of the roadmap exit criterion: each guardrail's
  fire/silent test pair directly demonstrates "every guardrail demonstrably
  fires on its synthetic trigger and stays silent on clean transcripts" — no
  app run needed (pure domain logic, no I/O).

### Explicitly deferred

- Mark-clamping / `unscored` short-circuit on guardrail trigger — advisory
  only in v1, per roadmap (Phase-A-gated, S6/S7).
- `CriterionConfidence` widening beyond the single `'unassessed'` literal —
  deferred to the same Phase-A gate.
- Threshold tuning (240s / 200 words) — labelled `UNVALIDATED`, tuned against
  real teacher-graded transcripts in S6 (Phase A), not synthetic fixtures.
- Extending the synthetic corpus to the full five-item examiner-report
  taxonomy (wrong time frame, misunderstood interrogatives, dropped two-part
  task, `c'est`/`c'était`, number without currency) — these map to L1/L2
  signals, not to S5's two guardrails; `guardrails/__tests__/synthetic.ts` is
  structured for S6 to extend.

---

## Validation & inspection toolkit (dev tooling, not a roadmap subphase)

Developer tooling built on top of S1–S5, prepared ahead of S6 (Phase A) so
scoring real teacher-graded recordings has inspection/regression/prioritization
tooling in place the moment recordings arrive. **Zero scoring-logic change** —
no file under `src/domain/igcse/{evidence,judgement,guardrails,envelope}/*.ts`
was modified; `synthetic.ts` and `diff.ts` were only imported from, never
edited.

### Built

- `src/domain/igcse/guardrails/__tests__/syntheticManifest.ts` — taxonomy tags
  (03 §5.1's five-item list) + `expectedGuardrails` over the existing S5
  `synthetic.ts` fixtures. Honestly records `expectedGuardrails: []` for the
  3 taxonomy items with no guardrail yet, plus a separate
  `UNCOVERED_TAXONOMY_ITEMS` export — no fabricated coverage.
- `scripts/scoring/goldenRegression.ts` (+ `npm run score:golden`) — recomputes
  L1 evidence + L3 guardrails (and a full envelope, with fixed literal
  provenance, for the two manifest entries that pair a static assessment) with
  no LLM/network call, diffs against checked-in
  `scripts/scoring/__tests__/goldenFixtures/*.golden.json`, `--update-goldens`
  to regenerate. Wrapped in `goldenRegression.test.ts` so `npm test` catches
  drift too.
- `scripts/scoring/reporting/envelopeView.ts` — pure view-model
  (`ScoringEnvelope` + optional `TeacherMarkSet` → render-ready shape), adding
  `topicArea`/`responseLength` per criterion (bracketed from existing
  `EvidenceProfileSubset` word counts, no new detector) since
  02 §3.6 confirms S8 calibration-anchor selection will key on the same two
  dimensions.
- `scripts/scoring/reporting/renderAttemptHtml.ts` /
  `renderAttemptTerminal.ts` + `scripts/scoring/inspectAttempt.ts`
  (`npm run score:inspect`) — self-contained HTML (inline CSS, zero deps) for
  a non-developer to open, plus a terminal pretty-printer for the fast
  developer loop.
- `src/domain/igcse/comparison/reviewStatus.ts` (+ zod `parseReviewStatus`)
  and `scripts/scoring/reviewStore.ts` / `reviewAttempt.ts`
  (`npm run score:review`) — new sibling artifact at
  `data/envelopes/<attemptId>/review.json`, mirroring `teacherMark.ts`'s
  "kept fully separate from `ScoringEnvelope`" pattern exactly. Never read by
  anything under `src/domain/igcse/{evidence,judgement,guardrails,envelope}/`.
- `scripts/scoring/reporting/priority.ts` — generic `rankSessions()` primitive
  over `DiffRow[]` + guardrail-trigger counts (`delta` / `guardrails` / `none`
  strategies). Deliberately generic, not calibration-specific — S8's
  `calibration/select.ts` is separate code, written later.
- `scripts/scoring/reporting/reviewArtifact.ts` — merges `buildDiffRows()`
  output with `ReviewStatus` (optional) into one row per criterion; field
  names (`topicArea`, `responseLength`, `mark`, `band`) chosen to align with
  02 §3.6's future `CalibrationAnchor` shape where they overlap — best-effort,
  not a contract, since S8 doesn't exist yet.
- `scripts/scoring/observability/logger.ts` — `logStage(traceId, stage, fn)`,
  true no-op unless `SCORING_DEBUG=1` or `--debug`; pure passthrough
  (`try { return await fn() } finally { log }`, no `catch`), preserving
  `scoreAttempt.ts`'s "errors propagate unchanged" contract.

### Modified (additive/backward-compatible only)

- `scripts/scoring/scoreAttempt.ts` — wraps the four pipeline stage calls
  (`transcriptStore.load`, `buildEvidenceSubset`, `scoreSpeaking`,
  `runGuardrails`) in `logStage`, keyed by `attemptId` (moved
  `crypto.randomUUID()` earlier, no other behavior change). Confirmed via
  `scoreAttempt.test.ts`'s existing "propagates errors unchanged" test, which
  still passes unmodified.
- `scripts/scoring/batchScore.ts` — captures `guardrailTriggers` per session,
  writes `evidence.json` (via `envelopeView.ts`) and
  `review-artifacts.json`/`.md` (via `reviewArtifact.ts`) alongside the
  existing `diff.csv`/`report.md`; appends an optional "Guardrail triggers"
  bullet to `report.md` only when non-empty; adds opt-in `--debug` and
  `--sort-by delta|guardrails|none` (default `none`) flags. `diff.csv`
  row order/content is byte-identical regardless of `--sort-by` — only
  `report.md`'s session grouping is reordered; verified by a new test that
  diffs two runs (normalizing the per-run-random `attemptId` UUID, which
  legitimately differs between independent `scoreAttempt()` calls).
- `scripts/scoring/batchScore.ts` / `goldenRegression.ts` / `inspectAttempt.ts`
  / `reviewAttempt.ts` — fixed (or, for the three new files, wrote correctly
  from the start) the `main()`-guard idiom
  (`import.meta.url === \`file://${process.argv[1]}\``) to use
  `pathToFileURL(process.argv[1]).href` instead. On Windows,
  `process.argv[1]` is a backslash path while `import.meta.url` is a
  `file:///C:/...` URL, so the naive string comparison never matched and the
  CLI silently no-op'd when run via `npx tsx`/`npm run`. Discovered while
  manually verifying `score:golden`; the same latent bug pre-existed in
  `ingestSession.ts`'s identical idiom and was left alone there — out of this
  toolkit's scope to fix a file it doesn't otherwise touch.
- `.gitignore` — added `data/reports/` (toolkit-generated `inspectAttempt`/
  `batchScore` output, regenerable, not source).

### Independently verified

- `npm test`: 71/71 files, 446/446 tests passing, including all new toolkit
  test files (`goldenRegression.test.ts`, `envelopeView.test.ts`,
  `reviewStore.test.ts`, `reviewAttempt.test.ts`, `priority.test.ts`,
  `reviewArtifact.test.ts`, `logger.test.ts`) and the pre-existing
  `batchScore.test.ts`/`scoreAttempt.test.ts`/`endToEnd.fixture.test.ts` all
  green with zero assertion changes needed beyond adding the two new required
  `CliArgs` fields (`debug`, `sortBy`) to existing call sites.
- `npm run typecheck:scripts`: zero errors in any new or modified file;
  identical pre-existing unrelated error set in `src/data/`, `src/screens/`.
- `npx eslint scripts/scoring src/domain/igcse/comparison
  src/domain/igcse/guardrails/__tests__/syntheticManifest.ts`: zero errors in
  any new/modified file; the 3 reported errors are pre-existing and in files
  this toolkit did not touch (`__tests__/fixtures.ts`,
  pre-existing lines in `scoreAttempt.test.ts`).
- Manually ran `score:golden` (clean pass, 5/5 cases match) and
  `score:inspect` against a golden fixture envelope in both `--format html`
  and `--format terminal`, confirming the HTML file opens with transcript,
  every criterion's mark/band/justification/quoted evidence, guardrail list,
  and full version/provenance metadata.
- Confirmed no diff appears under any
  `src/domain/igcse/{evidence,judgement,guardrails,envelope,comparison}/*.ts`
  file that isn't a new, additive file
  (`comparison/reviewStatus.ts` is new; `comparison/diff.ts`/`teacherMark.ts`
  are unmodified).

### Explicitly deferred

- Aggregate accuracy stats (agreement %, bias, band-consistency) — stays
  S6/S8/S9 territory, per the existing hard-scope redline comments in
  `diff.ts`/`batchScore.ts`, which this toolkit does not relax.
- Calibration anchor storage/selection/injection logic — `priority.ts` and
  `reviewArtifact.ts` are reusable primitives only; S8 owns the real
  subsystem.
- Fixing the same `main()`-guard Windows bug in `scripts/stt/ingestSession.ts`
  — out of scope for a toolkit that doesn't otherwise touch that file.

---

## S10 — Examiner-simulation session engine

The pure conduct-rule engine (`src/domain/igcse/session/`) that drives an
app-conducted 0520 mock oral: `conductEngine.ts` (a no-I/O reducer over
04 §6.5 conduct rules), `simulationSession.ts` (the sole impure driver),
`buildSessionTranscript.ts` (ConductLog → provenance-agnostic
`SessionTranscript`, `annotationSource: 'session-engine-log'`), and the
`version.ts` engine-version pin. Consumed by `ExamMode.tsx`.

This is the retroactive S10 entry (none existed) plus the behavioural-compliance
change train that follows it. That train is landing incrementally; each
sub-phase below is verified as it lands.

### Behavioural-compliance train (`session-engine-v2`)

- **C1 — authorized, original extension prompts.** Replaced the old
  content-aware extension machinery with two original, `tu`-register app-authored
  probes (`AUTHORIZED_EXTENSION_PROMPTS`), alternated deterministically by index.
  Original content per 04 §6.5 (never TN-verbatim, not on the rubric-only
  `UNSOURCED_ALLOWLIST`). `MAX_EXTENSIONS_PER_TOPIC` re-labelled as an app
  heuristic (Cambridge caps *further questions*, not extension prompts).
- **C8 — extension suppression past the 4-minute target.** `TOPIC_TARGET_S`
  (240s); once accumulated topic speaking reaches it, extension *probing* stops
  while scripted Q1–Q5, alternatives, and further-questions are still delivered.
  Value is Cambridge; the suppression behaviour and the "accumulated
  candidate-speaking seconds" proxy metric are app policy (commented as such).
- **C3 — two-part question delivery.** Two-part questions (role-play PAUSE
  tasks; topic Q4 whose prompt embeds a follow-up) are now delivered as two
  **separate** examiner utterances: the main part, then a **distinct**
  `secondPartText` (a new additive `SessionQuestion` field), never a re-read of
  the main text. In topics: a new `'secondPart'` `TopicSubState` entered **only**
  from a successful main answer (an answer given via the *alternative* skips its
  second part — the alternative replaces the two-part main question); a failed
  second part gets **one** verbatim repeat (gated by a dedicated
  `secondPartRepeatUsed` flag so the sub-state can never loop), then advances
  (no extension probe on a failure, no alternative for a second part).
  `originalQuestionSets.ts`: `rp3` gained a distinct `secondPartText`; `t1q4`/
  `t2q4` split their embedded `"…? Pourquoi ?"` into `mainText` + `secondPartText`.
  `SESSION_ENGINE_VERSION` bumped `v1 → v2` (behavioural change), and
  `scoreEndToEnd.test.ts`'s `assemblerVersion` literal updated in the same change.

### Independently verified (through C3)

- `npx vitest run` (full suite): **473/473 tests passing (75 files)**, including
  the golden-regression / scoring fixtures — the `session-engine-v2` bump touches
  no `detectors-v*`/`scoring-prompt-v*` pin, so no golden regeneration was needed.
- Session-engine suite (`conductEngine.test.ts`, `buildSessionTranscript.test.ts`,
  `scoreEndToEnd.test.ts`): 26/26 green, including new C3 cases —
  distinct-second-part delivery (main → part2 → answer → advance), one-repeat
  failure-then-advance, alternative-never-triggers-a-second-part, and
  single-part questions never entering `'secondPart'`.
- Cross-check integrity: `buildSessionTranscript.test.ts`'s `annotateExaminer`
  agreement test still passes; its comment updated to record that a two-part
  question's distinct part-2 text is now classified `unmatched` (it Jaccard-matches
  no question above `MATCH_THRESHOLD`) rather than `repetition`, and `rp3` remains
  excluded from the single-part agreement assertion.
- `npm run typecheck`: zero new errors in any `src/domain/igcse/session/` or
  `src/data/exam/` file; the additive `secondPartText?` / `secondPartRepeatUsed`
  fields make an under-supplied fixture a compile error, not a runtime one. Same
  pre-existing unrelated `src/screens/*` errors as prior subphases.
- Serialization/replay compatibility: `secondPartText` is additive and **not**
  part of the validated `session-transcript-v1` schema; old stored ConductLogs
  remain readable. No `stt/schema.ts` change.

### Docs

- `04-frontend-pipeline.md §6.5`: added the two-part-question conduct rule
  (separate utterances, distinct second-part prompt, one repeat then advance,
  no alternative on a second part).

### C2, C4, C5 — landed since the entry above (not individually logged at the time)

`git log` shows further sub-phases committed after the "through C3" verification
above: **C2** (authored on-topic further/padding questions —
`SessionQuestionSet.furtherQuestions`, a fixed two-question tuple per topic,
emitted in place of the old synthesized placeholder string), **C4** (whole-utterance
intent classification — `session/utteranceIntents.ts` — routing `dont_know` /
`repeat_request` / `non_french` distinctly, with `repeat_request`/`non_french`
text blanked in the scored transcript while the raw ConductLog keeps it verbatim
for replay), and **C5** (a non-assessed French greeting, UI-only, entirely outside
the ConductLog — `ExamMode.tsx`'s `'greeting'` state, `ExamGreeting.tsx`). No
retroactive re-verification of C2/C4/C5 was performed as part of the C6 work below
beyond confirming the full suite is green with them in place (see below); revisit
if a dedicated audit of those three is later wanted.

### C6 — neutral transition markers

Two original, app-authored acknowledgements (`TRANSITION_MARKERS`: `"D'accord."`
/ `"Merci."`) spoken between a successfully-answered topic question and the next,
so consecutive prompts don't read as a bare back-to-back list. Purely a realism
addition — UNVALIDATED application heuristic, not a Cambridge conduct rule.

- **`types.ts`:** new `'TRANSITION'` `ExaminerActionKind`; new
  `ConductEngineState.transitionCount` field (a dedicated deterministic counter
  for alternating wording — deliberately **not** `nextSeq` parity, since `nextSeq`
  is a per-*action* counter and a step can now emit more than one action).
- **`conductEngine.ts`:** `decideTransition(transitionCount)` (pure, alternates by
  index) and `advanceWithTransition()`, a thin wrapper around `advanceTopicQuestion`
  that prepends a `TRANSITION` action and bumps `transitionCount`. Wired in at
  **exactly the two `advanceTopicQuestion`-calling sites inside
  `moveToExtensionOrAdvance`** — the single success funnel every answered-question
  path (main, second-part, or alternative) routes through — and nowhere else.
  Deliberately **not** wired into `advanceTopicQuestion`/`checkFloorOrAdvancePart`/
  `advancePart`/`afterFailedMain` directly, since those are also reached from
  failure paths (failed repeat, failed alternative, failed second-part repeat);
  a transition emitted there would leak onto a failure. The topic1→topic2 handoff
  gets a transition "for free" (it's just another successful-answer advance); the
  final topic2 exhaustion is detected (`advanced.actions === [END]`) and the
  transition is suppressed so the closing "Merci." isn't doubled.
- **`buildSessionTranscript.ts`:** `ACTION_TO_EVENT_KIND.TRANSITION = null` — a
  transition becomes an examiner `Utterance` (spoken, logged) but never an
  `ExaminerEvent`; the `toSpeakingTranscript` projection drops all examiner speech
  regardless, so this has zero scoring impact by construction.
- **`simulationSession.ts`:** no change needed — `emitActions()` already loops
  over `actions[]` and speaks/logs each one in order; `submitTurn()`'s return
  value (what `ExamMode.tsx` treats as "current") is already the *last* action
  of the batch, which is exactly the desired UI behaviour for a
  `[TRANSITION, READ_MAIN]` pair.
- **Test harness generalised first (F2), per the plan:** `conductEngine.test.ts`'s
  `driveOne` (asserted `actions.length === 1`) is kept for genuinely single-action
  call sites, alongside a new `driveStep` that returns the full `actions[]` array
  (plus a `.action` alias for the last one). Every topic-conversation test whose
  call site crosses a success→advance boundary was switched to `driveStep`.
- **No `SESSION_ENGINE_VERSION` bump was needed:** the version was already at
  `session-engine-v2` from the C1–C3/C8 train (the plan's "one v2 bump covers
  PR-1+PR-2" strategy), and `scoreEndToEnd.test.ts`'s `assemblerVersion` literal
  already read `'session-engine-v2'` — nothing to update in this sub-phase.

### New tests

- `conductEngine.test.ts`, new `'conductEngine: TRANSITION markers (C6)'` block
  (8 tests): never emitted during role play; exactly `[TRANSITION, READ_MAIN]`
  after a successful developed answer; wording alternates across successive
  successful answers; **never** emitted after a failed repeat with no
  alternative; **never** emitted after a failed alternative; **never** doubled
  onto the final `END` action; exactly `[TRANSITION, FURTHER_QUESTION]` when a
  further question follows a success; an `EXTENSION_PROMPT` itself is never
  preceded by a transition (extension is not an advance).
- `buildSessionTranscript.test.ts`, new case: drives a real topic success through
  the full engine, confirms the resulting `TRANSITION` log entries become
  examiner `Utterance`s in the transcript, and confirms **zero** `ExaminerEvent`s
  reference those utterance ids.

### Independently verified

- `npx vitest run` (full suite): **510/510 tests passing (76 files)** — up from
  473 at the "through C3" checkpoint (37 new tests: 8 C6-specific in
  `conductEngine.test.ts` above, 1 C6-specific in `buildSessionTranscript.test.ts`,
  the rest accounted for by the C2/C4/C5 sub-phases that landed in between).
  `scoreEndToEnd.test.ts` still asserts `assemblerVersion === 'session-engine-v2'`
  and passes unmodified.
- Session-engine suite alone: 63/63 green across `conductEngine.test.ts` (31),
  `buildSessionTranscript.test.ts` (5), `scoreEndToEnd.test.ts` (1),
  `utteranceIntents.test.ts` (26).
- `npm run typecheck`: zero new errors in any `src/domain/igcse/session/` or
  `src/services/exam/` file (confirmed by diffing against a `git stash` baseline
  of the same command — identical pre-existing unrelated `src/screens/*`/
  `src/data/scenarios/offlineScenarios.ts` error set before and after).
- `npx eslint src/domain/igcse/session/ src/services/exam/simulationSession.ts`:
  clean (two `prefer-const` errors introduced while drafting the new C6 tests
  were caught and fixed in the same pass).
- Leak-proofing (the plan's single biggest identified risk, F2): directly
  asserted by the four negative tests above (no transition on failed repeat,
  failed alternative, or the final `END`) plus the positive tests (transition
  present and correctly alternating on every successful-answer advance,
  including the further-question path).
- Cross-layer boundary: no diff under `evidence/`, `judgement/`, `guardrails/`,
  `envelope/`, `rubric.ts`, `stt/schema.ts`, or `scoreAttempt.ts` — confirmed by
  `git status`/`git diff` scoped to this sub-phase.

### Explicitly deferred / not yet landed

- The remaining UI/voice polish sub-phases (C10 examiner voice quality, C11
  optional 45s pacing hint) have not landed.
- **C7 (cross-layer conduct-evidence into Layer 1 + the scoring prompt) is
  deferred pending greenlight** — it is the only change that mutates the frozen
  scoring pipeline and forces `EVIDENCE_DETECTOR_VERSION` / `SCORING_PROMPT_VERSION`
  bumps + golden regeneration. Completing it is what closes S10's roadmap
  "full event logging into `EvidenceProfile`" exit criterion.

## S10 — C9: Silence nudge (manual submit retained)

Passive, non-blocking UI cue that fires while recording if `NUDGE_QUIET_S = 5`
seconds pass with no new Web Speech recognition activity — never auto-submits,
never writes to the ConductLog or `SessionTranscript`.

### Built

- `useRecording.ts`: new `lastActivityAt: number | null` in `RecordingState`,
  set on `start()` and on every `onresult` callback (interim or final).
- `ExamRunner.tsx`: a 1s interval (only while `recording.isRecording`) compares
  `Date.now() - lastActivityAt` against `NUDGE_QUIET_S`; renders a small
  `glass-subtle` banner ("Fini ? Soumets ta réponse — ou continue à parler.")
  below the timer when quiet, clears immediately on the next recognition event
  or when recording stops. No new state is added to `conductEngine.ts`,
  `simulationSession.ts`, or the ConductLog — this is UI-only wall-clock state,
  consistent with the plan's C9/C11 categorization ("UI heuristics ... never
  logged/scored").

### Independently verified

- `npm run typecheck`: no new errors in `useRecording.ts`, `ExamRunner.tsx`,
  `ExamMode.tsx`, `ExamGreeting.tsx`, or `ExamIntro.tsx` (all pre-existing
  errors are in unrelated `src/screens/*` files, confirmed unchanged before/after).
- `npx vitest run`: full suite still 510/510 passing (76 files) — C9 is UI-only
  and touches no tested pure module, so the count is unchanged from the C6
  checkpoint.
- Cross-layer boundary: no diff under `evidence/`, `judgement/`, `guardrails/`,
  `envelope/`, `rubric.ts`, `stt/schema.ts`, `scoreAttempt.ts`, or the
  ConductLog/`SessionTranscript` builder (`buildSessionTranscript.ts`) — the
  nudge never leaves the two UI files it's implemented in.
- No `SESSION_ENGINE_VERSION` bump needed — no engine or transcript behaviour
  changed.

## S10 — C10: Examiner voice quality

Adopts the fr-FR voice-selection cascade already proven in `services/tts/ttsService.ts`
(a separate, unrelated TTS caller elsewhere in the app) and sets a slower
speech rate for exam-conduct clarity. Pure voice-quality/UI polish — no engine,
ConductLog, or transcript involvement.

### Built

- `examinerVoice.ts`:
  - New `selectVoice()`: prefers an `fr-FR` voice with `localService: true`,
    then falls back through `fr-FR` (any service) → any `fr-*` lang → any
    `fr`-prefixed lang → `null`, mirroring `ttsService.ts`'s cascade exactly.
  - New `initVoice()`, called once at module load (guarded by `isTtsAvailable()`):
    caches the selected voice in module state; if no voice is available yet
    (voices often load async), subscribes `window.speechSynthesis.onvoiceschanged`
    to re-select once the browser's voice list populates.
  - `speakExaminerText()`: now sets `utterance.rate = 0.9` (named constant
    `EXAMINER_VOICE_RATE`) and applies the cached `selectedVoice` when present.
    Falls back to the browser's default `fr-FR` voice (via `utterance.lang`
    alone) when no matching voice was found — unchanged degrade behaviour.
  - Mute/cancel/never-reject semantics from `setExaminerVoiceMuted`,
    `isExaminerVoiceMuted`, and `stopExaminerVoice` are untouched.

### New tests

- **NEW** `services/exam/__tests__/examinerVoice.test.ts` (5 tests, smoke-import
  style per the plan): exercises the module under the suite's default `node`
  test environment (no `window`/`speechSynthesis`), which is also the real
  degrade path unsupported/headless browsers hit — confirms
  `isTtsAvailable()` reports `false`, mute-state toggling doesn't throw,
  `speakExaminerText` resolves (never rejects) for both a normal string and
  empty text, and `stopExaminerVoice` never throws. Module-load-time
  `initVoice()` call is exercised implicitly by the import itself completing
  without error under a DOM-less environment.

### Independently verified

- `npx vitest run src/services/exam/__tests__/examinerVoice.test.ts`: 5/5 passing.
- `npx vitest run` (full suite): 515/515 passing (77 files) — up from 510 at
  the C9 checkpoint (5 new C10 tests).
- `npm run typecheck`: zero new errors attributable to `examinerVoice.ts` or
  its new test file (grepped typecheck output for the file name — no hits;
  full error set is the same pre-existing unrelated `src/screens/*` failures
  present before this change).
- `npx eslint src/services/exam/examinerVoice.ts src/services/exam/__tests__/examinerVoice.test.ts`:
  clean.
- Cross-layer boundary: no diff under `evidence/`, `judgement/`, `guardrails/`,
  `envelope/`, `rubric.ts`, `stt/schema.ts`, `scoreAttempt.ts`,
  `conductEngine.ts`, `simulationSession.ts`, or `buildSessionTranscript.ts` —
  the change is fully contained to `examinerVoice.ts` and its new test.
- No `SESSION_ENGINE_VERSION` bump needed — voice selection/rate is UI/audio
  polish, never logged to the ConductLog or scored.

### Explicitly deferred / not yet landed

- C11 (optional 45s pacing hint) has not landed.
- C7 remains deferred pending greenlight (see C6 entry above for detail).
