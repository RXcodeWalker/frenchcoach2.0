# IGCSE Scorer — 03: Validation Strategy (Staged A/B/C)

> Part of the Cambridge IGCSE French 0520 Speaking Scorer architecture
> (split from `rubric-architecture-v3.md`). Defines the three validation
> phases — Phase A (10-15 graded responses), Phase B (25-35), Phase C
> (60-100) — with exit criteria for each. Primary reference for
> **S2, S5, S6, S10, S11, S15, S16**, and for any subphase that touches
> corpus collection or accuracy measurement.
>
> See also: `02-scoring-pipeline-architecture.md` for what's being validated.

## 5. Staged validation — A, B, C

Validation is not a single gate. It is three phases, each with its own corpus size, success criteria, and version-promotion semantics. Skipping forward is forbidden — Phase B does not start until Phase A's exit criteria are met.

### 5.1 Phase A — Architecture validation (10–15 graded responses)

**Goal:** confirm the architecture works end-to-end. Make zero quantitative accuracy claims. Find catastrophic failures cheaply, before investing in a 60+ corpus.

**Coverage target.** A small spread — roughly 2 per major band tier (top / middle / bottom) per criterion, plus 3–5 role-play attempts spanning task completion levels. Coverage matters more than balance here; you want to surface failure modes, not measure rates.

**Examiner ask (kept light).** Mark + 1–3 sentences per criterion describing what drove the band choice. **Additionally, for each transcript:** note whether pronunciation/fluency materially moved the QoL mark (yes/no + one phrase). This is the cheapest possible measurement of the QoL blind spot and gates the pronunciation-pipeline decision (roadmap **S7**). A teacher giving up a weekend evening can produce 10 of these; demanding a full examiner-report-style essay for each will kill the corpus before it starts.

**Allocation:** all 10–15 transcripts go to a Phase A pool. None become permanent anchors yet — Phase A's transcripts are diagnostic. Some may be promoted to anchors in Phase B after review.

**Success criteria (all must hold to exit):**

- Every transcript produces a non-empty `EvidenceProfile` with the expected fields populated.
- Manual review of every L2 justification: **0 fabricated evidence** (zero, not low rate — fabrication at Phase A means the prompt is broken).
- Every guardrail that should have fired did fire on at least one transcript that should have triggered it (synthetic transcripts may be added to exercise guardrails that no real transcript triggers). **Synthetic guardrail/test transcripts** should be seeded from the Principal Examiner Report's documented failure taxonomy, including at minimum:
  - wrong time frame after cue words (e.g. present-tense response to *la semaine dernière*);
  - misunderstood interrogatives — *Où* / *Quand* / *Combien* / *Comment* answered with the wrong information type;
  - second part of a two-part role-play task dropped;
  - *c'est* vs *c'était* in past-tense opinion questions;
  - number given without currency (note: **any** currency unit is acceptable — the failure mode is omitting currency entirely when the task requires a price).
- No "polar" failures: a transcript graded ≥ 10 by the examiner should not receive ≤ 4 from the scorer, and vice versa.
- L1 detector outputs spot-check as correct on every transcript (tense detection, filler counts, word counts, **time-frame alignment**, **alternative-question usage extraction** — these are deterministic and must be right).
- A teacher reading any single scored attempt can follow the justification trail from mark → descriptor → evidence span without confusion.

**Expected outcomes — what Phase A is for:**

- Prompt refinements (the evidence-pass prompt and scoring-pass prompt typically need several iterations).
- Guardrail threshold tuning (where do the cliffs really sit?).
- L1 detector bug fixes — false positives in grammar-error detection are usually obvious only when you see them on real transcripts.
- Discovery of failure modes not anticipated in the design (e.g. STT consistently mishearing one common word).

**Output artefacts:** `igcse-0520-rubric-v0.1`, `engine-v0.1-dev`, calibration set deferred. **The system remains labelled `v0.x-dev` and is not shown to users as a "predicted IGCSE grade" — it is shown, if at all, as "practice feedback, not a grade prediction".**

### 5.2 Phase B — Calibration refinement (25–35 graded responses)

**Goal:** seed the calibration anchor set, tune the scorer to converge on examiner judgement, and produce the first quantitative accuracy estimates (with honest confidence intervals).

**Coverage target.** At least 3 per band per criterion, deliberately oversample boundary cases (a 9/10 vs 10/11 Communication response is where the scorer will fail first). At least one transcript per topic area (A–E) per length bracket.

**Examiner ask (deeper).** Mark + structured reasoning per criterion: which descriptor phrases applied, what specific transcript content supported them, what the candidate would need to do to reach the next band. This is heavier than Phase A; budget for it.

**Allocation:**

- **15–20 transcripts → calibration anchor pool**, selected to maximise band coverage and topic diversity. These become `calibration-v0.5-Nxx`.
- **10–15 transcripts → held-out validation set**, never used for calibration. These become the Phase B accuracy measurement set. Once allocated, they stay held-out for the lifetime of the system.

**Success criteria (all must hold to exit):**

- Within-2 agreement ≥ 80% on the held-out set, per criterion. (Within-2 is a deliberately wide bar — Phase B is about convergence direction, not production accuracy.) **QoL within-2 agreement is provisionally subject to the pronunciation-variance finding from Phase A** (see §5.3 note).
- Systematic bias |mean(scorer − examiner)| < 1.5 marks per criterion.
- No band is consistently misclassified by ≥ 2 bands (e.g. all 13–15 responses come out as 7–9 → fundamental issue, not a Phase B exit).
- Self-consistency agreement (between L2 runs 1 and 2) ≥ 85% same-band.
- All Phase A guardrails still pass.
- Calibration anchor set passes review by an experienced 0520 teacher: anchors are representative, reasoning is high-quality enough to calibrate against, no anchor's mark is itself disputed.

**Expected outcomes:**

- A working calibration set the scorer genuinely uses.
- Identified bias direction (typically: early scorers are consistently generous on Communication, harsh on Quality of Language; the data will tell you the truth in your case).
- Refined anchor selection logic — which anchors actually help which responses.
- A list of the failure modes still present at exit — explicit, written down, prioritised for Phase C.

**Output artefacts:** `rubric-v0.3`, `engine-v0.5-beta`, `calibration-v0.5-Nxx`, full set of versioned prompts. **UI may now show "estimated mark, currently in calibration — agrees with teacher marks within 2 in roughly 80% of cases" with honest framing. No A\*–U letters yet.**

### 5.3 Phase C — Production validation (60–100 graded responses)

**Goal:** certify the scorer as `v1.0`. This is the gate v2 used to demand up-front; staging makes it achievable rather than blocking.

**Coverage target.** Statistical representativeness, not just spread. At least 5 per band per criterion, deliberately oversample boundary cases. Cover all 5 topic areas. Include at least 10 responses with deliberately challenging audio (heavier accent, faster pace, background noise) to stress the STT side.

**Allocation:**

- **Anchor set grows to `calibration-v1.0-N40+`** — Phase C may promote new high-quality transcripts to anchors.
- **Held-out validation set grows to 30+** — by Phase C exit, you have 30+ transcripts that have never touched the calibration prompt.

**Success criteria (all must hold to promote to `v1.0`):**

- Within-1 agreement ≥ 85% for Communication and Quality of Language on the held-out set. **QoL agreement targets are provisionally subject to the pronunciation-variance finding from Phase A:** if pronunciation explains ≥ 1 mark of QoL variance in ≥ 30% of Phase A transcripts, Phase C QoL targets are only claimable after the audio pipeline ships — **or** targets are re-scoped to "QoL excluding pronunciation" with honest UI framing (see `02-scoring-pipeline-architecture.md` §3.4.2).
- Within-band agreement ≥ 90% on the held-out set.
- Mean absolute error ≤ 1.5 marks per criterion.
- Role-play per-task agreement ≥ 90% (these are 0/1/2 — easier target).
- Systematic bias |mean(scorer − examiner)| < 0.7 marks per criterion.
- Self-consistency same-band ≥ 90% on the held-out set.
- Justifications graded `usable` by a teacher reviewer in ≥ 80% of cases.
- All guardrails fire correctly on stress-test cases (responses constructed to trip each guardrail).
- STT WER targets (§6.1) met on the held-out audio.

**Expected outcomes:** an honest, defensible scorer. The first version we are willing to call a Cambridge IGCSE speaking grader.

**Output artefacts:** `rubric-v1.0`, `engine-v1.0`, `calibration-v1.0-N40+`. **UI now shows raw `/40`, predicted letter with uncertainty, full justification trail.**

### 5.4 Continuous validation after v1.0

Every learner-recorded attempt is one potential corpus entry. Build a one-click "I had this graded by my teacher — here is the real mark" submission, persist it, and re-run validation metrics weekly. The corpus is the product moat; the scorer is just the function over it.

When the held-out set grows beyond a threshold, recalculate accuracy on a rolling window. When the systematic bias drifts, bump a minor version of the scorer with an explanatory changelog.

---

