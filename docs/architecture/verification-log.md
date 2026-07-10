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
