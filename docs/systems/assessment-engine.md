# Assessment Engine

The Cambridge IGCSE French (0520) scoring pipeline under `src/domain/igcse/`, plus the situation
around the legacy Python scorer it superseded. See `docs/decisions/0001-cambridge-0520-only.md`,
`0002-three-layer-scoring-pipeline.md`, and `0003-node-engine-is-the-authoritative-scorer.md` for
the decisions this doc assumes.

## The three layers

Never collapsed (ADR-0002): deterministic evidence extraction → constrained LLM judgement →
deterministic guardrails → persisted `ScoringEnvelope`.

- **`evidence/`** — `buildEvidence.ts` runs a registry of detectors (legacy bookkeeping-only ones
  plus a newer set) over a session transcript, tier-DAG ordered so a new detector can declare
  `dependsOn` without colliding with a legacy id. `registeredDetectors()` is exposed read-only so
  Layer 3 and a CI guard can enumerate every detector's declared mark-influence.
- **`judgement/`** — `scoreSpeaking.ts` is the Layer-2 orchestration: provenance guard → prompt →
  judge → parse → validate. This is the only layer that calls an LLM. As of `scoring-prompt-v0.6`,
  L2 is **two concurrent judge calls** (`Promise.all`, each with its own fresh judge instance and
  own retry), not one:
  - `scoreRolePlayAndCommunication` — Table A (role play) + Table B (Communication), the full
    transcript with examiner support and the L1 counts allow-list.
  - `scoreQualityOfLanguage` — Table C only, **topic conversations only** (no role play, no
    examiner support, no L1 counts). It is **error-list-first**: the contract puts `errors` before
    the band, so the judge lists every QoL error with a per-turn verbatim quote and states the
    booklet frequency wording (`errorFrequency`, recorded for audit, never mapped to a mark by
    formula) before best-fitting the Table C band holistically — the error list is evidence the
    judge reasons from, not an input to a scoring formula. Each error's quote is grounded in that
    one turn's own candidate response (`buildTopicTurnCorpora`) — never the examiner's question,
    never a different turn, never role play.
  - **The sound-alike step (stage 6, ADR 0011 item 7).** After both calls,
    `judgement/homophoneErrors.ts` sorts the QoL error list: `inaudible` (Category A — the quote and
    its correction sound the same where they stand, on a spoken answer), `ambiguousNear` (Category
    B — the difference is an un/en, ont/sont… pair at a word the recognisers could not confirm),
    `recognisersDisagree` (the recognisers heard clearly different words there and the correction is
    the other one's reading — owner rule until the STT benchmark, `DIFFERENT_WORDS_ARE_UNCERTAIN`) or
    counted. Excused errors leave `qualityOfLanguage.errors`; if any were excused the QoL call runs
    **once** more with them listed as "Not errors" and the re-run's mark is kept. A re-ask that
    still fails keeps the first mark (excused errors removed) and is flagged, never fails the
    attempt. This adds one sequential QoL call, only on attempts that need it.
  - `combineAssessment` merges the two calls' results into one `SpeakingAssessment` before
    guardrails run. The persisted `ScoringEnvelope` is `ENVELOPE_SCHEMA_VERSION = 'envelope-v0.5'`:
    v0.5 adds `excusedErrors` (each with its reason and pair ids — the source the report's "this
    might have been *X*; make sure you say it" note is to copy), `transcription` (answers marked
    from the batch reading vs the live captions, fallback reasons, model, context-prompt version)
    and `versions.homophoneTableVersion`.
  - `npm run judge:check` (`scripts/scoring/judgeCheck.ts`, see `docs/guides/development.md`) is
    the permanent real-judge harness for this stage — see `verification-log.md`'s Batch 2/Batch 3
    entries for what it found and measured.
- **`guardrails/`** — `runGuardrails.ts` is a pure, deterministic composition entry point (no I/O)
  that returns combined triggers — including, since `guardrails-v0.7`, `homophone_error_excused`
  and `homophone_penalty_unresolved` (the kept QoL mark may still carry a sound-alike penalty:
  re-ask failed, re-run relisted one, or an excusable error is still counted), both advisory —
  and an evidence-ceiling hook — the only path by which a
  Layer-1 signal may cap a Layer-2 mark. The ceiling is applied in `envelope/`, not by mutating
  the Layer-2 assessment, so the judge's original proposed mark stays in the audit trail as a
  `criterionAdjustment` rather than being overwritten.
- **`envelope/`** — `buildEnvelope.ts` does zero scoring judgement; it assembles the
  already-computed assessment, evidence, versions, transcript quality, and guardrail triggers into
  the immutable `ScoringEnvelope`. `envelope/index.ts` is the only import surface
  `scripts/scoring` is meant to use.

## After marking: the exam report (not part of the pipeline)

`src/domain/examFeedback/` writes examiner-style feedback — what the candidate did well, their
mistakes by category, and one next step per criterion aimed at the next band's descriptor — **after**
an envelope is persisted, in a separate model call served by `server/feedbackRoute.ts` and stored
in `exam_feedback_reports`. It is deliberately outside `src/domain/igcse/`: the scorer's import
graph never reaches it (`scoredPipelineBoundary.test.ts`), the judge prompts are untouched, and it
carries its own `EXAM_FEEDBACK_VERSION` rather than bumping any stage pin below. The QoL errors it
shows are the envelope's own (quote and correction copied; only the category is the model's).
`npm run judge:check -- --feedback` measures its recall against `auditErrors` separately from the
judge's. See ADR 0009 and its Batch A amendment.

## Per-stage version pins

Four of the five pipeline stages carry a `version.ts` with a version-string constant, each paired
with a fixture hash in that stage's own `__tests__/version-pin.test.ts` so the two can't drift
apart silently:

| Stage | File | Constant |
|---|---|---|
| Evidence | `evidence/version.ts` | `EVIDENCE_DETECTOR_VERSION` |
| Judgement | `judgement/version.ts` | `SCORING_PROMPT_VERSION` |
| Guardrails | `guardrails/version.ts` | `GUARDRAILS_VERSION` |
| STT | `stt/version.ts` | `STT_SCHEMA_VERSION`, `STT_ASSEMBLER_VERSION` |
| Session | `session/version.ts` | `SESSION_ENGINE_VERSION` |

`STT_SCHEMA_VERSION` is `session-transcript-v2` (ADR 0011): a candidate `Utterance` may carry
`turnKey` and a `recognition` record (the batch reading, the live captions, which one was selected,
and the fallback reason). `Utterance.text` is exactly the selected reading, enforced by the schema.
`parseSessionTranscript` still reads v1 and upcasts it. `session-engine-v5` is the first version that
emits v2; `STT_ASSEMBLER_VERSION` moved to `stt-assembler-v2` with it and is pinned by
`stt/__tests__/assembler.version-pin.test.ts`. That stage (5) changed only *which text* is scored.

Stage 6 changed how it is marked, and bumped `EVIDENCE_DETECTOR_VERSION` (`detectors-v0.7`),
`SCORING_PROMPT_VERSION` (`scoring-prompt-v0.7`), `GUARDRAILS_VERSION` (`guardrails-v0.7`) and
`ENVELOPE_SCHEMA_VERSION` (`envelope-v0.5`). The sound-alike tables and respeller
(`stt/homophones/`) carry their own `HOMOPHONE_TABLE_VERSION`, hash-pinned and recorded in each
envelope's `versions`: any change to a list or rule there changes marks.

**`envelope/` has no standalone `version.ts`** — its `ENVELOPE_SCHEMA_VERSION` lives directly in
`envelope/types.ts`. Don't assume the pattern is uniform across all five stages when adding a new
one.

Bump the relevant constant whenever a change to that stage's code changes its output shape or
values — even a change that leaves a narrower function byte-identical can still require a bump if
a wider wrapper around it changed (the evidence stage's Phase-3 note is the clearest example: the
narrow detector output was untouched, but the profile-building wrapper around it wasn't, so the
version pin covering the wrapper still needed bumping).

## What actually reaches the judge prompt

Layer 1 (`evidence/`) computes more signals than Layer 2 is allowed to see. `judgement/prompt.ts`'s
`PROMPT_EVIDENCE_ALLOW_LIST` is the only gate: as of `scoring-prompt-v0.6.1` it admits
`responseCountsByQuestion` and `topicConversationDurationByConversation` only — both factual counts,
never a heuristic judgement. Since `v0.6` this allow-list only reaches the
`rolePlayCommunication` call — the `qualityOfLanguage` call renders topic conversations alone and
receives no L1 evidence at all. `timeFrameAlignmentByQuestion`, `fillerDensityByQuestion`, and
`rolePlayPartsByTask` are still computed and snapshotted in the envelope for audit (and still render
in the results page's evidence groups where applicable), but none of the three has been validated
against real graded transcripts, so none reaches the prompt. A new Layer-1 detector joins this
allow-list only once it's been validated — an uncalibrated signal never gets to influence a mark by
being added to the prompt, whatever its apparent usefulness.

The transcript rendered into the prompt (`judgement/prompt.ts`'s `formatTranscript`) also carries
per-turn projected fields beyond the five authored questions: `further1`/`further2` turns (Cambridge's
"≤3½ min → up to 2 further questions" padding, previously conducted but never marked), and each
turn's recorded examiner support — repetitions, whether the alternative question was used, whether a
role-play task's second part was asked, extension-prompt count. These are derived from the
transcript alone in `stt/project/toSpeakingTranscript.ts` (no engine or log format change), and exist
so the judge can apply the first Communication-band bullet ("may occasionally need repetition" /
"occasional use of the alternative question(s)") from the actual recorded support instead of
guessing from the response text.

Since stage 6 (`scoring-prompt-v0.7`) a **spoken** answer also reaches the judge in its Category A
context spelling (`stt/project/spokenText.ts`: "J'ai un frère. Il mange…" even when both
recognisers wrote "ils mangent"; the respeller only swaps within one sound class and never changes a
word count), and may be followed by an **"Uncertain words:"** line naming its Category B words the
recognisers could not confirm — where they disagreed (`"un" — also heard as "en"`), or every such
word when only one recogniser read the answer (`"le" — could also be "les"`). Both prompts then add
a benefit-of-the-doubt rule. The line and the rule render only when such a word exists, so other
transcripts render as before. Words the two recognisers heard clearly differently (`different`
spans) are rendered the same way while `DIFFERENT_WORDS_ARE_UNCERTAIN` is on (until the STT
benchmark); the batch reading is still the marked text. The spans themselves are snapshotted as
`EvidenceProfile.ambiguousSpansByTurn` for audit; that field is **not** on the allow-list. Typed
answers are never respelled and carry no spans.

## Golden tests

`npm run score:golden` runs `scripts/scoring/goldenRegression.ts` over
`scripts/scoring/syntheticManifest.ts`. For every manifest entry it recomputes evidence and
guardrail triggers, and — where the entry pairs a static assessment — a full `ScoringEnvelope`,
built directly through `buildEvidenceSubset → runGuardrails → buildScoringEnvelope`. No LLM, no
judge stub, no network call: deterministic and CI-safe. The version-string constants the runner
uses are literal and owned by the runner, not real `scoreAttempt` provenance, so a real version
bump goes stale across all goldens at once — `--update-goldens` is the intended way to refresh
them, never a silent edit.

Golden coverage also exists at `src/domain/igcse/evidence/__tests__/buildEvidence.golden.test.ts`,
`buildEvidenceProfile.golden.test.ts`, `src/domain/igcse/envelope/__tests__/buildEnvelope.golden.test.ts`,
and `src/domain/igcse/stt/__tests__/assembleSession.golden.test.ts`.

Since stage 6 the runner also applies the QoL sound-alike step (`settleQolHomophones`), with a
manifest entry's static `qolReAsk` reply (or `'failed'`) standing in for the re-ask, and five
`sound-alike-*` entries cover: an inaudible error excused, a Category B disagreement excused, a
Category B agreement counted, a different word counted, and a live-captions fallback whose re-ask
fails. `goldenRegression.test.ts` also pins every assessed entry's triggers to its
`expectedGuardrails`.

If a golden test's output changes *shape* (not just a value inside the same shape), treat that as
a signal you changed scoring behavior — investigate before updating the fixture, don't reflexively
regenerate it.

## The `UNVALIDATED` convention

A threshold or heuristic with no traceable source is marked `UNVALIDATED` at its definition site
rather than given a plausible-looking number. Real examples: `guardrails/config.ts`'s
`DEFAULT_DURATION_CONFIG` ("UNVALIDATED starting values"), `guardrails/types.ts` (twice, on
threshold fields), and `envelope/envelopeView.ts`'s `bracketResponseLength()` ("UNVALIDATED —
toolkit-only display bucketing, not a scoring threshold"). Several of these cite a roadmap
document that no longer exists — see `docs/README.md`'s citation decoder; the `UNVALIDATED` marker
itself is still accurate and load-bearing regardless of the dead citation next to it.

## The three-scorer situation

Three distinct scoring code paths exist across the two repos. Only one is reachable from the
product and authoritative.

**1. Authoritative — the Node engine.** `src/domain/igcse/` + `scripts/scoring/scoreAttempt.ts` +
`server/index.ts` (the `french-scoring` Render service). `ExamMode.tsx` reaches it exclusively via
`scoringApiClient.submitForScoring`, which calls `${VITE_SCORING_API_URL}/score`. There is no
fallback: if the env var is unset, the client throws (see `topology.md`). Every mark shown to a
user (`/40` in `ExamResults.tsx`) comes from here.

**2. Legacy and unreached — `backend/evaluator_service.py`.** Its `evaluate_full_exam` is still
live at `POST /api/exam/finish` and `POST /api/exam/evaluate` in `backend/exam_controller.py`,
mounted in `backend/main.py`. No caller exists anywhere in `src/`. Its own Communication and
Quality of Language bands diverge materially from `rubric.ts`'s: 3 unsourced bands each (with an
invented "AI Heuristic" description and an invented A\*–U grade-boundary table), versus `rubric.ts`'s
6 bands per criterion, each carrying an `exactSource(page)` citation into `0520/03/TN/M/J/24`. This
is not an intentional dual rubric — the Python bands predate the audited engine and violate this
project's own sourcing rule (ADR-0001). Do not "fix" `evaluator_service.py`'s rubric to match; it
is out of scope and the module is unreached.

**3. ~~Dead HTTP surface — `POST /api/feedback/igcse`~~ — removed 2026-10 (Phase 3 Batch C).** It had
zero callers in `src/` and zero requests in 30 days of Render logs; the route, its request model,
prompt, provider callers and offline evaluator are deleted. A request now returns 404.
`evaluator_service.py` (scorer 2) remains, unreached and out of scope.

### A known-stale claim in `CLAUDE.md`

`CLAUDE.md`'s "Three Runtime Surfaces" section states "there is no Python rubric or scoring
prompt anywhere." Read narrowly (scoped to `server/`, which is Python-free) it's true; read as a
repo-wide claim it is not — `backend/evaluator_service.py` embeds a full scoring prompt with its
own bands and grade table, as described above. This sentence was not touched by the 2026-08-31
commit that added the "no design docs" disclaimer elsewhere in the same file. Flagged here rather
than silently corrected — per this project's conflict procedure (`docs/README.md`), a doc
contradicting the code on current behavior should be fixed in the same session it's found, but
this file is explicitly out of this migration's stage scope; raise it separately.
