# IGCSE Scorer — 01: Cambridge Rubric Source of Truth

> Part of the Cambridge IGCSE French 0520 Speaking Scorer architecture
> (split from `rubric-architecture-v3.md`). This is the most important file
> for **S0 (rubric audit and encoding)** — every constant in `rubric.ts`
> must trace back to a source in this file or be marked `UNVALIDATED`.
> Also relevant whenever auditing existing rubric code for invented numbers.
>
> See also: `00-overview-and-rationale.md`, `02-scoring-pipeline-architecture.md`.

## 1. What Cambridge actually says (the source of truth)

All scoring decisions in this app must trace back to one of these documents. Anything not traceable is labelled `unvalidated`. Public sources:

- Cambridge IGCSE French 0520 Syllabus 2025–2027 (and 2028–2030, same speaking structure)
- Cambridge IGCSE French 0520/03 Teacher/Examiner Notes booklets (specimen and recent series, e.g. `0520_m24_tn_03`, `0520_s25_tn_03`)
- Cambridge IGCSE French Speaking Test Training Handbook
- Principal Examiner Reports for 0520 (recent series)

### 1.1 Paper structure (current syllabus)

- **Paper 3 Speaking** is 25% of the qualification, total 40 marks, approximately 10 minutes per candidate, plus 10 minutes preparation, plus a non-assessed 30-second greeting.
- Three assessed components:
  - **Role play** — 1 scenario, 5 transactional tasks, 2 marks each → 10 marks
  - **Topic conversation 1 and Topic conversation 2 together — Communication** → 15 marks (one combined mark across both conversations, not 7.5 each)
  - **Topic conversations 1 and 2 together — Quality of Language** → 15 marks
- Total: 10 + 15 + 15 = **40 raw marks**, then converted to A\*–U using grade boundaries set per series by Cambridge.

### 1.2 Mark schemes (verbatim band structure)

**Role play, Table A — per task, 0–2:**
- `2` — the information is fully communicated
- `1` — partial communication
- `0` — nothing of worth communicated

**Communication, Table B — bands across both topic conversations, 0–15:**
- `13–15` Very good — responds confidently; consistently relevant; frequently develops ideas and opinions; justifies/explains
- `10–12` Good — responds well; almost always relevant; sometimes develops ideas; gives reasons for some answers
- `7–9` Satisfactory — frequent need of alternative questions; communicates most required information; simple opinions
- `4–6` Weak — has difficulty with many questions, still attempts
- `1–3` Poor — minimal communication
- `0` — none

**Quality of Language, Table C — bands, 0–15:** full descriptors specify range of structures, accuracy, vocabulary, linkage. The historic mark scheme requires accurate use of past and future tenses for marks of 7 or above; the current syllabus preserves this through the descriptor "uses a range of structures … including complex structures".

### 1.3 Cambridge-mandated marking principles

Constraints on the scorer, not decorations:

- **Best-fit, not point-deduction.** Find the band that best describes the performance. Award the middle mark when most descriptors fit, top when the band above was almost reached, bottom when it just qualifies.
- **Work upwards from the bottom.** Start at the lowest band; only move up when the candidate's evidence justifies it.
- **Reward achievement, do not penalise errors.** The opposite of how a naive regex scorer behaves.
- **Native-speaker standard is not required for full marks.**
- **When in doubt, err on the side of generosity.**
- **Grade boundaries (raw 40 → A\*…U) are set per session and are not published as fixed thresholds.** Any UI labelled "predicted A\*" must either reference the most recent published series with a "based on Jun 20XX, may move ±N marks" caveat, or refuse to commit to a letter and show the raw /40 with a confidence range.

---

## 2. Assumptions in v1 that do not survive Cambridge documentation

Mark each as **Inherit / Replace / Drop / Validate**.

| v1 assumption | Source in v1 | Source in Cambridge | Verdict |
|---|---|---|---|
| Criteria are communication / language / fluency | `_computeScores`, `SYSTEM_PROMPT` | Cambridge: communication + quality of language only; fluency was a separate /10 Impression in pre-2025 syllabus, removed in 2025+ | **Replace** |
| Criteria weights 0.35 / 0.35 / 0.30 | `_computeScores` | Cambridge: raw additive sum out of 40, no normalised weighting | **Drop** |
| Bands "Foundation–Developing" → "Extended–High" | `scoreToBand` | Cambridge: 0 / 1–3 / 4–6 / 7–9 / 10–12 / 13–15 with verbatim labels Very good etc. | **Replace** |
| Per-question scoring of `{comm, know, acc, fluency}` 0–10 | `SYSTEM_PROMPT`, `/api/feedback/v3` | Cambridge: role play tasks are 0–2 each; conversations have one combined Communication mark and one combined Quality of Language mark, not per-question | **Replace** |
| Full exam = roleplay /10 + comm /15 + quality /15 = /40 | `_EVAL_SYSTEM_PROMPT` | Cambridge: matches exactly | **Inherit** |
| Grade boundaries hardcoded as fixed string | v1 schema | Cambridge: boundaries vary per session, never published as fixed | **Validate against most-recent-series, mark as moving target** |
| Past/future tenses required for higher Language band | Not in v1 | Cambridge: historically explicit; current descriptor expects "complex structures" | **Add as guardrail (Layer 3), not hard cliff** |
| Regex/rule-based scoring is "deterministic and therefore correct" | v1 §9 | Cambridge: best-fit, qualitative, examiner judgement | **Resolve via three-layer hybrid (§3.3–3.5)** |
| `coachingRubric`, `coachingTone`, A1→B2 difficulty config carry IGCSE rubric meaning | `difficultyContext` | Cambridge: CEFR A2 with elements of B1 is the syllabus target, not a per-learner setting | **Repurpose `difficultyContext` for learner level only; keep it out of the rubric** |

---

