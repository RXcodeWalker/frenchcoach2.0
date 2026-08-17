# Pronunciation Practice vs. the IGCSE Speaking Scorer — Boundary

> Decision note for the boundary between Azure-backed pronunciation practice
> (Accent Analyzer / Shadowing Mode) and the audited Cambridge IGCSE French
> (0520) assessment engine described in `00-overview-and-rationale.md` and
> `02-scoring-pipeline-architecture.md`. Written as part of Phase 4
> ("Shadowing Mode"), which is the second feature (after Accent Analyzer's
> Drills) to sit on this boundary — this note exists so the line does not
> have to be re-derived from source every time a new practice feature is
> proposed.

## The boundary, stated plainly

**Accent Analyzer and Shadowing Mode are practice features. Neither writes
`scoring_envelopes`, and neither contributes to a Cambridge mark.**

They share the same backend pronunciation pipeline
(`routers/pronunciation.py`, Azure phoneme assessment with a
whisper-heuristic fallback) and the same frontend contract
(`src/domain/pronunciation/types.ts`), but that pipeline is not, and has
never been, part of the three-layer IGCSE scorer (deterministic evidence →
constrained LLM judgement → deterministic guardrails). It has no
`ScoringEnvelope`, no calibration anchors, no grade-boundary mapping, and no
relationship to a Cambridge mark scheme criterion. It measures *how
accurately a candidate reproduced a target sentence's sounds* — a
pronunciation-drill signal — not *communication* or *quality of language*,
the two dimensions Cambridge actually grades speaking on
(`01-cambridge-rubric-source.md`).

## Why this needs writing down at all

Nothing about the code makes this boundary obvious by inspection:

- Both systems live under `backend/` and both are reachable from the same
  FastAPI process.
- Both produce a numeric `score`.
- Shadowing Mode's coaching narrator (`generate_shadowing_coaching`) reuses
  the same anti-fabrication "grounding" pattern
  (`coach_narrator.py::_apply_gate`) that the IGCSE scorer's Layer 2 uses —
  same technique, different subject matter.
- A future contributor skimming `routers/pronunciation.py` next to
  `routers/exam.py` (or whatever the eventual scoring router is named) could
  reasonably wonder whether one feeds the other.

It does not. The two are architecturally disjoint by construction:

| | Pronunciation practice (Accent Analyzer / Shadowing) | IGCSE scorer |
|---|---|---|
| Storage | `pronunciation_attempts`, `shadowing_attempts` | `scoring_envelopes` |
| Contract | `src/domain/pronunciation/types.ts` (own version, `PRONUNCIATION_ASSESSOR_VERSION`) | The scorer's own envelope schema/version (`02-scoring-pipeline-architecture.md`) |
| Rubric | None — measures phoneme/word-level accuracy against a target string | Cambridge 0520 mark scheme (`01-cambridge-rubric-source.md`) |
| Grading dimensions | accuracy / fluency / completeness / (unavailable) prosody — Azure's own sub-scores | Communication (15) + Quality of Language (15) + Role play (10) = /40, per the syllabus |
| Consumed by | Local XP/mastery loop, coach evidence log (`pron:*` nodes, never merged into the 14 grammar categories — see `pronunciationEvidence.ts`'s header) | Grade boundary mapping, examiner-calibration reporting |
| LLM role | Optional per-claim-grounded coaching commentary (Shadowing only); never adjusts the score | Layer 2: constrained judgement that *is* part of the mark, inside deterministic guardrails |

## Why Shadowing Mode's coaching narrator does not violate constraint #3

CLAUDE.md's Assessment Engine constraint #3 requires the IGCSE scorer to
follow deterministic evidence → constrained LLM judgement → deterministic
guardrails, and forbids unrestricted LLM scoring. Shadowing Mode's detailed
coaching (`generate_shadowing_coaching`) looks superficially similar — it is
an LLM call gated by a grounding check — but it is not part of that scorer
and the constraint does not apply to it for a structural reason, not a
policy exemption: **the LLM output is never a score.** `PronunciationCoaching`
(`summary`, `topPriority`, `tips`, `grounded`) carries no numeric field. The
`score` a Shadowing attempt records is Azure's phoneme-accuracy output
(or the whisper-heuristic fallback), computed before the coaching call ever
runs and never revised by it. The grounding gate exists to stop the LLM from
inventing *commentary* about words it didn't actually mishear — the same
"don't fabricate" discipline as the scorer's Layer 3 guardrails, applied to
a different kind of output with no scoring authority at all.

## What would change this boundary (and hasn't happened)

- Routing pronunciation practice data into a candidate's Cambridge mark —
  not planned, not built, and would require its own architecture review
  under `02-scoring-pipeline-architecture.md`'s versioning rules.
- Reviving `assessment.coaching` for Drills, or extending
  `generate_coaching` (the `/api/repair` narrator) to share code with
  `generate_shadowing_coaching` — explicitly out of scope for Phase 4
  (see the Shadowing Mode implementation plan, §11).
- Any future practice feature built on the same pronunciation pipeline
  inherits this same boundary by default; it should not need a new decision
  note unless it proposes to cross into scored territory.
