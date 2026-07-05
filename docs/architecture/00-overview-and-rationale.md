# IGCSE Scorer — 00: Overview & Rationale

> Part of the Cambridge IGCSE French 0520 Speaking Scorer architecture, split
> from the original single `rubric-architecture-v3.md` for easier reference.
> **Read this file first** — it explains why this architecture exists and
> what "done" looks like. Read it whenever planning any subphase, alongside
> whichever of the more specific files below is relevant.
>
> Sibling files: `01-cambridge-rubric-source.md` (the official mark scheme),
> `02-scoring-pipeline-architecture.md` (the three-layer scorer design),
> `03-validation-strategy.md` (staged validation A/B/C),
> `04-frontend-pipeline.md` (STT, transcripts, question bank),
> `05-deprecated-v1-removals.md` (what was explicitly rejected and why).
> The implementation order and subphase breakdown live separately in
> `roadmap.md` — this file's old §8 "Phased rollout" is superseded by it
> and intentionally not duplicated here.

# Cambridge IGCSE French (0520) Speaking Scorer — Architecture & Plan (v3)

**Status:** Design document, pre-implementation
**Scope:** Cambridge IGCSE French as a Foreign Language, syllabus code 0520, Paper 3 Speaking, current syllabus cycle (2025–2027), forward-compatible with 2028–2030 which retains the same speaking structure
**Out of scope:** GCSE, A-Level, DELF, or any other board. Multi-board support is explicitly deferred until this scorer can predict a real examiner's mark within an acceptable error band.
**Changes from v2:** Validation gate is now staged (A → B → C). The scorer is now a three-layer hybrid with explicit boundaries between deterministic evidence, constrained LLM judgement, and deterministic guardrails. Examiner-calibration is a first-class subsystem with its own versioning. Reproducibility is no longer rubric-only — the full scoring pipeline (rubric, prompts, models, STT, calibration set, grade boundaries) is captured per attempt in a `ScoringEnvelope`.

---

## 0. Why this plan replaces v1

The v1 plan was an architecture for *supporting many exam boards*. This plan is an architecture for *grading one exam correctly*. These are different problems and the first is the wrong one to solve until the second is solved.

Concrete things the v1 plan got wrong, in declining order of importance:

1. **Most of its rubric numbers and labels were invented.** The criteria "communication / language / fluency" at weights 0.35/0.35/0.30, bands "Foundation–Developing … Extended–High", per-question scores `{comm, know, acc}` 0–10, "fluency" as a top-level score — none of this appears in the Cambridge 0520 mark scheme. The actual 2025–2027 paper is marked out of 40 across (a) Role play, 5 tasks × 2 marks, (b) Topic conversations 1 and 2 combined: 15 marks for Communication, (c) the same conversations: 15 marks for Quality of Language. The earlier 2017–2024 syllabus also had a separate /10 Impression mark for pronunciation/intonation/fluency, but the current syllabus does not. Carrying "fluency" as a standalone criterion is silently grading on the wrong rubric.
2. **It version-pinned weights and thresholds that were never validated against examiner judgement.** Reproducible nonsense is still nonsense; semver on a guess does not make it correct.
3. **It declared deterministic regex scoring the sole authority and treated that as obviously good.** That solves an LLM-drift problem by introducing a measurement-instrument problem. A regex cannot reliably detect whether the candidate "developed ideas and opinions" — which is literally how Cambridge separates the 10–12 band from the 13–15 band. Demoting the LLM to commentary while keeping a weaker instrument as the judge optimises for the wrong thing.
4. **It built abstractions for boards that may never exist.** `RubricConfig`, `registry.resolveRubric()`, `ExamBoard` union, `overall.method: 'strategy'`, board-agnostic backend prompt injection, board-native predicted-band type. All dead weight for v1.
5. **It barely addressed the front of the pipeline.** Speech-to-text accuracy on a teenage non-native French speaker is the single biggest source of error in this system, and v1 touched it in zero places.

What survives, in modified form: the diagnosis that the same rubric is encoded in four drifting places (fix by consolidation, not abstraction); reproducibility and versioning (extended to the whole pipeline, not just the rubric); separation of "what the LLM is allowed to do" from "what the engine guarantees" (preserved, but as a three-layer architecture rather than a regex monopoly).

---

## 9. What success looks like, concretely

- The scorer agrees with a teacher's mark within 1 mark on Communication and Quality of Language ≥ 85% of the time, and within 1 mark on role-play tasks ≥ 90% of the time, on a held-out set of at least 30 responses (Phase C exit).
- Every mark is shown to the user with a Cambridge-verbatim descriptor quotation and at least one quoted span from the transcript that justifies it.
- Predicted letter grades are shown with an uncertainty range and the boundary series they reference. Single confident letters are never shown for raw marks within ±2 of a boundary.
- The transcript shown to the user before scoring matches what the candidate actually said well enough that the candidate confirms it. This is a measured, reported metric.
- Every persisted score carries a complete `ScoringEnvelope`. Any score can be regraded under a newer version stack, with both old and new envelopes displayed side-by-side and the deltas explained.
- A teacher unfamiliar with the app can read a single scored attempt and a single page of documentation and reproduce, by hand, why the mark was awarded.

That last criterion is the one that proves you built a Cambridge IGCSE speaking examiner and not a chatbot that gives grades.
---

*Split from `rubric-architecture-v3.md`. See `roadmap.md` for implementation ordering.*
