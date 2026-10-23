# Learn marking: test protocol

The gate that must pass before the frontend flag `learnMarkingLevels` goes live. It tests the ladder
scheme specified in `docs/systems/learn-marking-levels.md` (cited there as `learn-marking §N`); the
decision is `docs/decisions/0013-learn-marking-level-ladder.md`. Production Learn stays on
`learn-prompt-v6` until every gate below passes. All thresholds are `UNVALIDATED` choices made before
the run; changing one after seeing results needs a commit that says why.

## Test set: 22 answers, pre-registered

The set lives in the **backend** repo at `tests/fixtures/learn_marking_eval_v1/answers.json` and is
**signed off by the owner before any tokens are spent**. This repo holds the rules for it. The
readings of the criteria that the expected verdicts rely on are listed in that file's
`interpretations`, and its `README.md` explains sign-off.

- **Questions:** fam_01, hol_01, sch_03, env_05, fut_19.
- **Four answers per question:**

  | Answer | Length | Profile |
  |---|---|---|
  | Simple-but-correct A1 | 25–40 words | No errors |
  | Typical A2 | 40–60 words | 1–2 basic errors, *mais/parce que*, an opinion where invited |
  | Strong B1 | 60–90 words | B1 on every applicable ladder, at most 1 slip |
  | Weak | 30–50 words | 3–4 seeded errors, listed |

  Two of the weak answers also contain one sound-alike spelling slip, which must not cost an Accuracy
  rung.
- **Two controls:** an off-topic answer (env_05 answered about family) and a B2 answer (fut_19).
- **Expected verdicts** for every rung, the expected reached rung, and the seeded errors are committed
  before the run. The run log records the commit SHA. An expectation may change only by a commit
  explaining why the criteria document says otherwise.

## Stages and budget

Using the production key is approved by the owner (no live users). The estimate is about 5,000 tokens
per call; the daily limit is 200k tokens.

| Stage | What | Calls |
|---|---|---|
| 0 | Unit/property tests; ladder prompt free of level text; prompt-size check | 0 |
| 0b | Dry run: compute every score gate (G1–G7, G12) from the *expected* verdicts. If the expectations themselves fail a gate, fix the formula or the gate first | 0 |
| 1 | Smoke test: 3 answers (fam_01 A1/B1/weak). **Stop** on invalid JSON, any truncation, or more than 8,000 tokens per call (was 6,000; see "Cost limits changed") | 3 |
| 2 | All 22 once | 22 |
| 3 | Stability: 8 answers (one of each type, spread across questions) × 2 more runs | 16 |
| 4 (optional, not a gate) | The same 22 on `GEMINI_MODEL` (Gemini quota): the "other model" comparison | 0 Groq |

- **Groq total:** 41 calls, about 205k tokens. Day 1 is Stages 1–2 and Day 2 is Stage 3. The harness
  resumes after a daily-limit stop.
- **On a test day, the owner's own use of the app may hit the limit.**

### Harness

`scripts/learn_marking_eval.py` (backend repo, committed):

- sends `marking: ladder-v1` with `questionId` + `demandsVersion`, and asserts that demands resolve;
- uses the depth the client would compute (and the client's DETERMINISTIC SIGNALS), read from the test
  set's `client_inputs.json`, which `npm run learn:marking-inputs` builds from the real client code
  (`src/services/api/feedbackRequestHints.ts`) — never a port;
- one call at a time, with `AI_PROVIDER_TIMEOUT_SEC=120`;
- honours `retry-after`, and stops cleanly at the daily limit;
- writes resumable JSONL (raw output, usage, `finish_reason`, latency, model, versions, fixture SHA);
- `--report` prints the gate table below (G13 is printed for the owner to judge, never scored), the
  run-1 scores per level and the five "needs for B1" lists.

How to run each stage and resume: the test set's `README.md`.

### Cost limits changed (owner, 2026-10-19)

Changed after the smoke runs, before Stage 2, by the owner's decision; both runs are kept in the
backend's `tests/fixtures/learn_marking_eval_v1/runs/`.

- **Smoke iteration 0** stopped at 6,455 tokens. The ladder prompt alone is about 4,100–4,250
  tokens, because v6's coaching rules and schema stay unchanged by design; the 5,000-per-call
  estimate above missed that. Limits → max 7,000, median 6,000. The same run showed the model
  rewriting the student's words inside its quotes, so the prompt's quote rule was tightened
  (copy one short span exactly, mistakes included).
- **Smoke iteration 1** stopped at 7,204 tokens on a 4-error answer. 53% of that reply is v6
  listing every error twice (`grammar` and `corrections`); the ladder's own keys were 9%. Max →
  8,000; the median stays 6,000, so ladder bloat on ordinary answers still fails G11.
- **Consequence:** about 6.2k tokens per AI-marked Learn answer, roughly 32 a day on the 200k tier
  (about 40 before), and more for error-heavy answers. Cutting the duplicate error list is a
  separate, cheaper option that changes what Learn receives.

## Pass gates (all must pass)

| # | Gate | Threshold |
|---|---|---|
| G1 | Order A1 ≥ A2 ≥ Exam ≥ B1 ≥ B2 | 100% of answer-runs (also unit-proven) |
| G2 | Big gap for simple answers | Every simple-A1 answer: A1 ≥ 8.0, A1 − B1 ≥ 3.0, A1 − B2 ≥ 4.5 |
| G3 | Top of scale used | Every strong-B1 answer: A2 ≥ 9.0, B1 ≥ 7.5 |
| G4 | Typical A2 sits at A2 | Every typical-A2 answer: A2 ≥ 7.5, B1 ≤ A2 − 2.0 |
| G5 | Exam really in between | A2 − Exam ≥ 0.5 for ≥ 4/5 typical-A2 answers; Exam − B1 ≥ 0.5 for ≥ 4/5 strong-B1 answers |
| G6 | Mistakes count at Exam | Every weak answer: Exam ≤ 6.5; seeded-error recall ≥ 80%; sound-alike slips never the sole reason an Accuracy rung fails |
| G7 | Off-topic | ≤ 2.0 at every level |
| G8 | Verdicts match expectations | ≥ 85% of all rung verdicts; ≥ 90% on deciding rungs (the answer's written level and the one above); every ladder ≥ 75% |
| G9 | Stability (3 runs) | Rung flip rate ≤ 10%; score spread (max − min) ≤ 1.0 per answer per level; mean spread ≤ 0.5 |
| G10 | Evidence is real | ≥ 95% of "y" quotes found in the transcript before the guardrail |
| G11 | Contract and cost | ≥ 97.5% valid with every applicable ladder; `demandCheck` 100%; zero truncations; median ≤ 6,000 tokens per call, max ≤ 8,000 (was 5,000 / 6,000; see "Cost limits changed") |
| G12 | Needs list | Simple-A1 answers: 0 items at A1, ≥ 2 at B1; never an item from a ladder that doesn't apply |
| G13 | Owner read-through | For the 5 simple-A1 answers at B1: "is this what a B1 answer needs that mine doesn't have?" — yes for ≥ 4/5 |
| G14 | Only what the question asks | No needs item, at any level, asks for a time frame, opinion or reason the question doesn't invite (unit-proven over all 668 questions, and checked live). The strong-B1 hol_01 answer, past tense only with feelings, reaches B1 on every applicable ladder |

"Mistakes identical across levels" needs no live calls: the level never reaches the model, and a unit
test pins that.

## If the gate fails

Up to two wording iterations, each re-running Stages 2–3 in full. After that, stop and return to the
owner with the data and one of two fallbacks:

- **Design D** — v6 unchanged plus a separate checklist call at temperature 0. Zero feedback
  regression risk, but it doubles calls on a 200k-tokens/day tier, adds a second latency, and lets the
  accuracy verdict and the error list disagree.
- **Design C** — a stronger model on the same prompt (an env switch, layered on the ladder later).
  It does not add the missing conversion and gives no ordering guarantee.

### Iterations run

| Iteration | Date | Prompt | Result | Record |
|---|---|---|---|---|
| 0 (first run) | 2026-10-19 | `learn-prompt-v8` | NOT PASSED: G4, G11, G12 | `verification-log.md`; backend `runs/run_log.jsonl` |
| 1 (wording) | 2026-10-23 | `learn-prompt-v9` | NOT PASSED: G3, G4, G11, G14; Stage 3 not run | `verification-log.md`; backend `runs/iter1_run_log.jsonl` |
| Design D | 2026-10-23 | `learn-prompt-v6` + `ladder-check-v2` | Stage 1 STOPPED (a v6 call truncated); Stage 2 not run | `verification-log.md`; backend `runs/designD_*.jsonl` |

Iteration 1 found that Groq's on_demand tier refuses any request whose prompt + `max_tokens` is over 8,000 (413),
which the one-call design exceeded on the six-ladder question. After it the owner chose the fallback, **Design D**
(v6 unchanged plus a separate checklist call; ADR 0013 amendment), rather than a second wording iteration.

### Design D: how the gate reads it

- **The same gates, thresholds and test set.** The harness makes both production calls for each answer and keeps
  them in one record.
- **Cost (G11).** The protocol words the token limits "per call", and the harness applies them per provider call;
  the per-answer total (both calls) is printed beside them. A Design D answer costs ~6,800–8,800 tokens, so a
  per-answer reading of "median ≤ 6,000" would fail. **Which reading the cost gate should hold is the owner's
  decision**, not made here.
- **Budget.** Stage 2 is ~22 × 7,500 ≈ 165k tokens, most of a day on the 200k tier; Stage 3 ~120k. The harness
  resumes after a daily-limit stop.

## Where this gate sits in the rollout

Each step is reversed by its own switch.

| Step | Action | Reverse with |
|---|---|---|
| 1 | Docs (spec, this protocol, ADR 0013) and the backend test set | revert |
| 2 | Backend `learn-prompt-v8` ladder scheme deployed, inert (no client sends `marking` yet) | `LEARN_LADDER_ENABLED=0`, or revert |
| 3 | **This gate** — no production effect; results go to `verification-log.md` | — |
| 4 | Question levels made accurate | revert |
| 5 | Frontend dials, wiring and copy, deployed with the flag `coming-soon` | flag `coming-soon` |
| 6 | Owner tries it on their own device with `?ff_learnMarkingLevels=live` | — |
| 7 | Flag default `live` | flag `coming-soon` |
| 8 | Demand-evidence fix (`LEARN_L2_DEMAND_VERDICTS`) | switch off |
| 9 | Premium UI | revert |
| 10 | CLAUDE.md Known Traps and spec amendments | revert |

Record results in `verification-log.md` (append-only) — a pass there is history, not proof the scheme
is currently live.
