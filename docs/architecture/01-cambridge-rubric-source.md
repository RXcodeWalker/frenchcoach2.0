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

Source for all descriptors below: `0520/03/TN/M/J/24` (May/June 2024 Teacher/Examiner Notes), mark schemes pp.10–12.

**Role play, Table A — per response, 0–2** (`0520/03/TN/M/J/24`, p.10):

| Marks | Descriptor |
|---|---|
| **2** | • The information is communicated.<br>• Language is appropriate to the situation and is accurate.<br>• Minor errors (adjective endings, use of prepositions, etc.) are allowed. |
| **1** | • The information is partly communicated and/or the meaning is ambiguous.<br>• Errors impede communication. |
| **0** | • No creditable response. |

**Communication, Table B — bands across both topic conversations, 0–15** (`0520/03/TN/M/J/24`, p.11):

Examiners are reminded that this is a language qualification aimed at certifying language proficiency at level A2 with elements of B1 of the *Common European Framework of Reference for Languages: Learning, Teaching, Assessment*. The descriptors below should be understood and applied with reference to those levels.

Award a mark out of 15 for the candidate's performance in both topic conversations.

| Marks | Label | Descriptor |
|---|---|---|
| **13–15** | Very good | • Responds confidently to questions; may occasionally need repetition of words or phrases.<br>• Communicates information which is consistently relevant to the questions.<br>• Frequently develops ideas and opinions.<br>• Justifies and explains some answers. |
| **10–12** | Good | • Responds well to questions; requires occasional use of the alternative question(s) provided.<br>• Communicates information which is almost always relevant to the questions.<br>• Sometimes develops ideas and opinions.<br>• Gives reasons or explanations for some answers. |
| **7–9** | Satisfactory | • Responds satisfactorily to questions; frequently requires use of the alternative question(s) provided.<br>• Communicates most of the required information; may occasionally give irrelevant information.<br>• Conveys simple, straightforward opinions. |
| **4–6** | Weak | • Has difficulty with many questions but still attempts an answer.<br>• Communicates some simple information relevant to the questions. |
| **1–3** | Poor | • Frequently has difficulty understanding the questions and has great difficulty in replying.<br>• Communicates one or two basic pieces of information relevant to the questions. |
| **0** | | • No creditable response. |

**Quality of Language, Table C — bands across both topic conversations, 0–15** (`0520/03/TN/M/J/24`, p.12):

Examiners are reminded that this is a language qualification aimed at certifying language proficiency at level A2 with elements of B1 of the *Common European Framework of Reference for Languages: Learning, Teaching, Assessment*. The descriptors below should be understood and applied with reference to those levels.

Award a mark out of 15 for the candidate's performance in both topic conversations.

Each band carries **three separate bullet types** — do not collapse them into a single summary phrase:

| Marks | Label | Structures | Vocabulary | Pronunciation / fluency / intonation / expression |
|---|---|---|---|---|
| **13–15** | Very good | Accurate use of a wide range of the structures listed in the syllabus with occasional errors in more complex language. | Accurate use of a wide range of vocabulary with occasional errors. | Very good pronunciation, fluency, intonation and expression; occasional mistakes or hesitation. |
| **10–12** | Good | Good use of a range of the structures listed in the syllabus, with some errors. | Good use of a range of vocabulary with some errors. | Good pronunciation and fluency despite some errors or hesitation; a good attempt at correct intonation and expression. |
| **7–9** | Satisfactory | Satisfactory use of some of the structures listed in the syllabus, with frequent errors. | Satisfactory use of vocabulary with frequent errors. | Satisfactory pronunciation and fluency despite frequent errors and hesitation; some attempt at intonation and expression. |
| **4–6** | Weak | Limited range of structures and vocabulary, rarely accurate and/or complete; frequent ambiguity. | *(combined with structures)* | Pronunciation can be understood with some effort; very noticeable hesitations and stilted delivery. |
| **1–3** | Poor | Very limited range of structures and vocabulary, almost always inaccurate. | *(combined with structures)* | Poor pronunciation, rarely comprehensible; many serious errors. |
| **0** | | No creditable response. | | |

The current transcript pipeline can evidence only the **structures** and **vocabulary** bullets; the **pronunciation / fluency / intonation / expression** bullet is not transcript-visible. See `02-scoring-pipeline-architecture.md` §3.4.2 (Quality of Language — known limitation).

> **Not TN-sourced:** A historic mark scheme required accurate use of past and future tenses for marks of 7 or above. That explicit requirement is **not present** in the M/J/24 TN; do not treat it as current Cambridge descriptor text. Any guardrail derived from it belongs in Layer 3 as an inferred constraint, not in the rubric source.

**Within-band mark selection (topic conversations only)** (`0520/03/TN/M/J/24`, p.11):

When you are awarding marks, start at the bottom band and work upwards. Find the band which best fits the candidate's performance. Then use the following guidance to decide on the mark to award, where applicable:

- If the candidate's work **convincingly meets** the level statement, award the **highest mark**.
- If the candidate's work **adequately meets** the level statement, award the **most appropriate mark in the middle** of the range (where middle marks are available).
- If the candidate's work **just meets** the level statement, award the **lowest mark**.

This rule applies to Communication and Quality of Language only (bands with ranges). Role play is 0/1/2 per response with no within-band placement. The scoring prompt must include this instruction explicitly (currently emitted by `src/domain/igcse/judgement/prompt.ts`).

**Re-audit result (M/J/24 TN PDF, this session):** `canonical.ts` and `rubric.ts` were compared directly against `0520/03/TN/M/J/24` mark-scheme tables (pp.10–12) and marking principles (pp.6, 10–11). All Role play, Communication, and Quality of Language descriptor strings and all encoded principles byte-match the PDF with **zero single-character differences** (including "creditable" not "credible"; U+2019 apostrophes in "candidate's"). **No descriptor was demoted to UNVALIDATED.** The sole mismatch was the previous §1.2 Role play paraphrase ("fully communicated / partial communication / nothing of worth"), now corrected above.

**Enforcement gap:** `src/domain/igcse/__tests__/rubric.test.ts` enforces **`rubric.ts` ↔ `canonical.ts`** equality only — it does not compare either file against the PDF. The **`canonical.ts` ↔ PDF** guarantee is a manual transcription diff (recorded in the `canonical.ts` docstring) re-verified directly against the PDF in this session.

### 1.3 Cambridge-mandated marking principles

Constraints on the scorer, not decorations:

- **Best-fit, not point-deduction.** Find the band that best describes the performance. Award the middle mark when most descriptors fit, top when the band above was almost reached, bottom when it just qualifies.
- **Work upwards from the bottom.** Start at the lowest band; only move up when the candidate's evidence justifies it.
- **Reward achievement, do not penalise errors.** Marking should be positive, rewarding achievement (`0520/03/TN/M/J/24`, p.10). The opposite of how a naive regex scorer behaves.
- **Role play — short response, full marks.** The purpose of the role play is to communicate an appropriate response to each task. A short response to a task, if it communicates fully and is correct, is worth 2 marks; length is not rewarded (`0520/03/TN/M/J/24`, p.6, item 8).
- **Role play — two-part (PAUSE) tasks.** Role play tasks with two parts (PAUSE structure) require **both parts communicated** for full marks. Verbatim conduct instruction (`0520/03/TN/M/J/24`, p.6, item 6): *"Ask the first role play question exactly as it is printed. If there are two parts to the question (e.g. 'When …? Why?'), you should pause and wait for the answer to the first part before asking the second part."* The same instruction is repeated for topic-conversation questions at **p.7, item 13** and **p.8, item 18**. (PAUSE markers appear inline in the scripts, pp.16–31.)
- **CEFR A2 with elements of B1.** Descriptors must be applied with reference to level A2 with elements of B1 (`0520/03/TN/M/J/24`, pp.11–12). This exact calibration instruction must appear in the scoring prompt. **Deferred requirement (S6 — do not implement in S0):** `prompt.ts` currently injects the CEFR reference string but lacks an explicit anti-harshness instruction (LLMs default to grading learner language against too high a standard). A **Phase A validation check for systematic harshness** is also required (see `03-validation-strategy.md`).
- **Native-speaker standard is not required for full marks.** `UNVALIDATED` — not traceable to M/J/24 TN; resolve via Cambridge Speaking Test Training Handbook.
- **When in doubt, err on the side of generosity.** `UNVALIDATED` — not traceable to M/J/24 TN; resolve via Cambridge Speaking Test Training Handbook.
- **Grade boundaries (raw 40 → A\*…U) are set per session and are not published as fixed thresholds.** Any UI labelled "predicted A\*" must either reference the most recent published series with a "based on Jun 20XX, may move ±N marks" caveat, or refuse to commit to a letter and show the raw /40 with a confidence range.

### 1.4 Session-conduct rules that affect scoring evidence

Source: `0520/03/TN/M/J/24`. These are not trivia — several directly supply evidence for Communication band placement.

**Questions read exactly as printed.** Conduct each test using the questions and prompts exactly as they are printed in the teacher/examiner scripts (`0520/03/TN/M/J/24`, p.3).

**Role play — repetition allowed, rephrasing forbidden** (`0520/03/TN/M/J/24`, p.6, item 6 Note):

> You can repeat any role play question if the candidate has not understood or did not hear but you must not rephrase any of the role play questions. If the candidate still cannot answer one of the questions after you have repeated it, move on to the next task.

**Topic conversation — repeat / alternative-question logic** (`0520/03/TN/M/J/24`, p.7 item 15 table for Topic conversation 1; p.8 item 20 table for Topic conversation 2; same table recurs per-topic on pp.25–31):

| Questions | If the candidate does not give a relevant answer | If the candidate still does not give a relevant answer | If the candidate still does not give a relevant answer |
|---|---|---|---|
| **1 and 2** | Repeat the question | Ask the next question | |
| **3, 4 and 5** | Repeat the question | Ask the alternative question(s) provided (and repeat it once if necessary) | Ask the next question |

Alternative questions exist **only for topic questions 3–5** and **only after a repeat fails**.

**Extension / further-questions rule** (`0520/03/TN/M/J/24`, pp.7–8; also p.3):

> If the topic conversation lasts 3½ minutes or less, even after asking extension questions, you must ask up to two further questions of your choice on the same topic as the other questions to make sure that the conversation lasts 4 minutes.

**Per-part timing** (`0520/03/TN/M/J/24`, p.3 structure table; reiterated p.6 item 3):

| Part | Duration |
|---|---|
| Role play | approximately 2 minutes |
| Topic conversation 1 | 4 minutes |
| Topic conversation 2 | 4 minutes |

**Scoring-evidence note:** The Communication band descriptors reference how often alternative questions were required — e.g. Good (10–12): *"requires occasional use of the alternative question(s) provided"*; Satisfactory (7–9): *"frequently requires use of the alternative question(s) provided"*. Alternative-question and repetition usage is therefore **scoring evidence**, not conduct trivia. The session engine must log these events and pass them to Layer 1 (`02-scoring-pipeline-architecture.md` §3.2).

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

