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
  judge → parse → validate. This is the only layer that calls an LLM.
- **`guardrails/`** — `runGuardrails.ts` is a pure, deterministic composition entry point (no I/O)
  that returns combined triggers, including an evidence-ceiling hook — the only path by which a
  Layer-1 signal may cap a Layer-2 mark. The ceiling is applied in `envelope/`, not by mutating
  the Layer-2 assessment, so the judge's original proposed mark stays in the audit trail as a
  `criterionAdjustment` rather than being overwritten.
- **`envelope/`** — `buildEnvelope.ts` does zero scoring judgement; it assembles the
  already-computed assessment, evidence, versions, transcript quality, and guardrail triggers into
  the immutable `ScoringEnvelope`. `envelope/index.ts` is the only import surface
  `scripts/scoring` is meant to use.

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
`PROMPT_EVIDENCE_ALLOW_LIST` is the only gate: as of `scoring-prompt-v0.5` it admits
`responseCountsByQuestion` and `topicConversationDurationByConversation` only — both factual counts,
never a heuristic judgement. `timeFrameAlignmentByQuestion`, `fillerDensityByQuestion`, and
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

**3. Dead HTTP surface — `POST /api/feedback/igcse`** in `backend/main.py`. Zero callers in `src/`.
`src/services/api/apiClient.ts` calls this "the legacy invented scorer" in a nearby comment — that
description is accurate.

### A known-stale claim in `CLAUDE.md`

`CLAUDE.md`'s "Three Runtime Surfaces" section states "there is no Python rubric or scoring
prompt anywhere." Read narrowly (scoped to `server/`, which is Python-free) it's true; read as a
repo-wide claim it is not — `backend/evaluator_service.py` embeds a full scoring prompt with its
own bands and grade table, as described above. This sentence was not touched by the 2026-08-31
commit that added the "no design docs" disclaimer elsewhere in the same file. Flagged here rather
than silently corrected — per this project's conflict procedure (`docs/README.md`), a doc
contradicting the code on current behavior should be fixed in the same session it's found, but
this file is explicitly out of this migration's stage scope; raise it separately.
