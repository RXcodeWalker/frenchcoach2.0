# IGCSE Scorer — 02: Scoring Pipeline Architecture

> Part of the Cambridge IGCSE French 0520 Speaking Scorer architecture
> (split from `rubric-architecture-v3.md`). This is the core engineering
> design: the three-layer scorer (deterministic evidence extraction →
> constrained LLM judgement → deterministic guardrails), the calibration
> anchor subsystem, and the full-stack `ScoringEnvelope` versioning model.
> Primary reference for **S1, S7, S8, S9, S11, S12**.
>
> See also: `01-cambridge-rubric-source.md` for the descriptors this layer
> consumes, `03-validation-strategy.md` for how this architecture gets
> validated.

## 3. Target architecture

One module owns the rubric. A three-layer scorer sits on top of it. A calibration subsystem feeds the middle layer. Every produced score is wrapped in a `ScoringEnvelope` that captures the full pipeline state.

```
src/domain/igcse/
  rubric.ts            # The audited Cambridge 0520 rubric (verbatim descriptors, bands, principles)
  evidence.ts          # Layer 1: deterministic evidence extraction
  judgement.ts         # Layer 2: constrained LLM judgement (uses calibration anchors)
  guardrails.ts        # Layer 3: deterministic post-judgement checks and clamps
  calibration/
    anchors.ts         # Versioned set of examiner-marked reference transcripts
    select.ts          # Anchor-selection logic (which anchors enter which scoring prompt)
  grader.ts            # Raw /40 → predicted A*–U band with explicit uncertainty
  envelope.ts          # ScoringEnvelope construction and persistence
  validation/          # Held-out corpus, parity tests, phase-A/B/C harnesses
```

No `RubricConfig` generic schema, no `registry`, no `ExamBoard` type. If a second board ever arrives, copy this folder and only then extract what is genuinely shared.

### 3.1 `rubric.ts` — the audited rubric

A typed, documented module where every constant is annotated with its Cambridge source (document, page, year) and every descriptor is a verbatim quote from the mark scheme. Example shape:

```ts
export const ROLE_PLAY = {
  tasksPerScenario: 5,
  marksPerTask: 2,            // src: 0520 syllabus 2025-27, Paper 3 §"Speaking assessment criteria grids"
  totalMarks: 10,
  descriptors: {
    2: 'The information is fully communicated.',
    1: 'Partial communication.',
    0: 'Nothing of worth communicated.',
  },
  principle: 'positive marking; reward achievement',
} as const;

export const COMMUNICATION = {
  totalMarks: 15,
  bands: [
    { range: [13, 15], label: 'Very good',    descriptors: [/* verbatim */] },
    { range: [10, 12], label: 'Good',         descriptors: [/* verbatim */] },
    { range: [7,  9],  label: 'Satisfactory', descriptors: [/* verbatim */] },
    { range: [4,  6],  label: 'Weak',         descriptors: [/* verbatim */] },
    { range: [1,  3],  label: 'Poor',         descriptors: [/* verbatim */] },
    { range: [0,  0],  label: 'None',         descriptors: [] },
  ],
  bestFit: { fullyMeets: 'top', mostlyMeets: 'middle', justMeets: 'bottom' },
} as const;
```

`tasksPerScenario`, `marksPerTask`, totals, band ranges and descriptors are **inherited from Cambridge documents directly**, with the document and page annotated. Anything not directly quotable is labelled `// UNVALIDATED` and may not influence the final mark until Phase C signs off.

The rubric module is data; it computes nothing. All computation lives in the three layers below.

### 3.2 The three-layer scorer — overview

The single architectural decision in this plan is that **scoring is a pipeline of three layers with distinct responsibilities and distinct trust models**:

| Layer | What it does | What it must never do | Trust property |
|---|---|---|---|
| **L1: Evidence extraction** | Produce an `EvidenceProfile` of objectively measurable features of the transcript | Decide a mark, decide a band, judge quality | Fully deterministic, fully auditable |
| **L2: LLM judgement** | Map evidence + transcript + Cambridge descriptors + calibration anchors to a band and mark | Invent evidence not present in the transcript; ignore the rubric; mark outside the descriptor it cites | Non-deterministic, but constrained: every judgement must cite a transcript span and an evidence field |
| **L3: Guardrails** | Clamp the L2 output against impossible-given-evidence ceilings; detect L2 self-inconsistency; assign final confidence | Override L2 within the range that the evidence supports; second-guess descriptor matching | Fully deterministic; produces a *ceiling* and a *confidence*, not a replacement judgement |

The flow is `transcript → L1 → (L1 + transcript + rubric + anchors) → L2 → L3 → ScoringEnvelope`. The three layers compose; none of them is the scorer on its own.

### 3.3 Layer 1 — deterministic evidence extraction (`evidence.ts`)

This layer turns the transcript into an `EvidenceProfile`: a structured record of features the system can measure objectively. It is *not* a score. It does *not* know what a "band" is. It is the input the next layer reasons over.

What L1 measures (each field has a clear, testable definition):

- **Volume & timing:** total word count, speaking duration in seconds, words per minute, longest unbroken utterance.
- **STT quality:** mean word confidence, ratio of words below confidence threshold, count of low-confidence spans, per-span confidences attached to every utterance.
- **Tense usage:** counts of verbs detected in present, past (passé composé, imparfait, plus-que-parfait), future (futur simple, futur proche, conditional as a soft future), subjunctive. Each detection cites the verb and span. Failure-to-detect is reported, not inferred.
- **Structural complexity:** counts of simple vs. complex sentences (defined by presence of subordinating conjunctions / relative pronouns / multiple clauses), linker counts (parce que, mais, donc, cependant, etc.), mean sentence length.
- **Vocabulary range:** type-token ratio, count of distinct lexemes outside a defined A1/A2 base vocabulary (a proxy for B1 reach, not a quality judgement).
- **Disfluency:** filler count (euh, ben, alors, hmm), repetition count, self-correction count (a self-correction is *not* penalised — see Cambridge "reward achievement" principle).
- **Role-play task completion (heuristic):** for each of the 5 prompted tasks, a coarse `attempted / partially_attempted / not_attempted` flag based on alignment with the task instruction text. This is a heuristic input to L2, not a mark.
- **Role-play task structure (per task):** `parts_expected` (1 or 2 — some role-play cards require two distinct communicative acts, e.g. state a preference *and* ask a question) and `parts_addressed` (which parts the candidate covered). Sourced from session conduct logs (app) or examiner-speech annotation (external recordings; see `04-frontend-pipeline.md` §6.1).
- **Conversation interaction signals (per question):** for each of the 5 main questions in a topic conversation (Q1–Q5), a record of conduct events:
  - `repetitions_used` — how many times the examiner repeated the main question before moving on;
  - `alternative_triggered` — whether the alternative question was used;
  - `extension_questions_asked` — count of examiner extension prompts after the candidate's initial answer;
  - `response_duration_s` — candidate speaking time for that question.
  Aggregates across questions (e.g. total alternative triggers) are derived fields for L2/L3. These map directly to Cambridge band language: "frequently requires use of the alternative question(s) provided" is the 7–9 Communication band marker.
  **Provenance:** for app-conducted practice sessions, values come from the session engine conduct log (`04-frontend-pipeline.md` §6.5). For externally recorded teacher-conducted tests, values come from diarized examiner-speech transcription plus annotation against the question bank's alternative variants (`04-frontend-pipeline.md` §6.1).
- **Time-frame alignment (per question):** each question in the question bank carries an `expected_time_frame` tag (`past` | `present` | `future` | `conditional`) derived from its cue words (e.g. *récemment*, *la semaine dernière*, *d'habitude*, *à l'avenir*, *aimerais-tu*). The detector classifies the dominant verb time frame of the candidate's response for that question and emits `aligned` | `misaligned` | `no_verb`. **Rationale (Principal Examiner Report):** a verb in the wrong time frame after cue words tends to render the response ambiguous — examiners often award partial rather than full marks when meaning is unclear. This is a signal for L2 judgement (§3.4.1), not a Layer 3 cap. **`no_verb` is not a penalty** — brief verbless answers can score full marks; the detector reports absence of a classifiable verb, it does not infer failure.
- **Grammar issue list:** an enumerated list of detected issues — each carries `{span, type, severity, detector_confidence}`. Detectors mark surface errors they are confident about (gender agreement on common nouns, verb-subject agreement, missing accents on common forms). Anything ambiguous is *not* surfaced as an issue.

Critical property: **L1 reports observation, not judgement.** "Past tense not detected" is a Layer 1 fact. "Therefore Quality of Language cannot exceed 6" is a Layer 3 decision. Keeping them separate is what makes the whole system auditable.

L1 runs identically online and offline. Its output is deterministic given the same transcript and the same detector versions (which are part of the `ScoringEnvelope`).

### 3.4 Layer 2 — constrained LLM judgement (`judgement.ts`)

L2 maps `(transcript + EvidenceProfile + rubric descriptors + calibration anchors)` to `(band, mark, justification)` for each criterion (Role play tasks, Communication, Quality of Language).

The LLM is constrained by four hard contracts:

1. **Schema-locked output.** L2 returns a structured object per criterion: chosen band range, chosen mark within band, the verbatim descriptor phrases that justify the choice, and for each phrase the span(s) from the transcript and the `EvidenceProfile` field(s) supporting it. No free-text marks. No bands invented outside the rubric.
2. **No evidence fabrication.** Every justification must cite either (a) a quoted span from the transcript, or (b) a field from the `EvidenceProfile`. Justifications that cite nothing are rejected and the call is retried; persistent failure marks the attempt as `unscored: justification_failed`.
3. **Best-fit and bottom-up.** The prompt instructs the model to work upwards from the lowest band, find the band that best fits, then check the band above — mirroring Cambridge's instruction to examiners. Temperature is 0; seed is recorded.
4. **Self-consistency.** Two independent L2 calls per criterion. If their chosen bands differ by more than one band, the attempt is marked `review_needed` rather than silently averaged. If they differ by one band, the lower mark is awarded (Cambridge's "err on side of generosity" applies to the candidate, not to the system claiming a higher band than evidence supports). Disagreement is logged into the envelope as a confidence signal.

L2 is given, in its prompt:

- The verbatim rubric descriptors for the criterion under judgement.
- The Cambridge marking principles in §1.3 as hard rules.
- The full `EvidenceProfile` with quoted spans.
- A small set of calibration anchors selected by §3.6.
- The scoring-prompt contract additions in §3.4.1 (versioned as `scoring-prompt-vX`).

L2 has access to qualitative information the regex cannot reach. It is responsible for judging things like:

- whether the candidate "developed ideas and opinions" vs. "sometimes developed" vs. "did not develop";
- whether opinions were "justified and explained" or merely stated;
- whether vocabulary was "wide" or "appropriate" or "narrow with repetition";
- whether sentence structures were genuinely complex or strings of simple clauses joined by `et`;
- whether replies were "consistently relevant" or contained drift;
- naturalness, register, and idiomatic phrasing.

L2 has no access to: the previous attempt's score, the candidate's history, any "encouraging" framing. Its job is the mark, not the coaching. Coaching text is generated by a separate downstream call that consumes L2's output.

#### 3.4.1 Scoring prompt contract (`scoring-prompt-vX`)

The scoring pass prompt is versioned independently (`scoringPromptVersion` in the `ScoringEnvelope`). Each bump to the prompt template increments the version (e.g. `scoring-prompt-v0.4`). The following rules are hard instructions in every scoring prompt from the next version onward:

1. **Within-band placement.** After selecting a band, place the mark at top, middle, or bottom of that band using Cambridge's best-fit language: fully meets → top of band; mostly meets → middle; just meets → bottom. Do not default to the band midpoint.
2. **A2 / elements-of-B1 calibration line.** Quality of Language descriptors must be read against the 0520 expectation that candidates at this tier demonstrate A2 with elements of B1 — not full B1 fluency. Anchor selection and band placement must reflect this ceiling unless transcript evidence clearly exceeds it.
3. **Role-play anti-verbosity rule.** Role-play tasks are transactional: full marks require the requested information to be communicated, not elaborated. Do not penalise brevity when the task is complete; do not reward padding when the task is incomplete.
4. **Two-part-task completeness rule.** When `EvidenceProfile` shows `parts_expected: 2` and `parts_addressed < 2`, the role-play task mark cannot exceed 1 (partial communication). L2 must cite which part was missing.
5. **Communication and alternative-question usage.** Communication banding must explicitly consider the per-question `alternative_triggered` and `repetitions_used` counts supplied in the `EvidenceProfile`. Frequent alternative-question use is evidence for the 7–9 band descriptor, not an afterthought.
6. **Time-frame alignment (advisory).** When `EvidenceProfile` reports `time_frame_alignment: misaligned` for a question or role-play task, the Principal Examiner Report describes this as a tendency toward ambiguity in examiner judgement — not a mechanical mark deduction. Instruct the judge to weigh a misaligned time frame toward the lower mark **where the response is genuinely ambiguous**; where the candidate's meaning is clear despite the tense mismatch, do not penalise. The detector supplies the signal; the judge decides. **This instruction remains advisory until validated in Phase A** — do not encode it as a Layer 3 ceiling.

#### 3.4.2 Quality of Language — known limitation (transcript-only pipeline)

The current transcript pipeline can evidence only the **structures** and **vocabulary** bullets of each QoL band descriptor. The **pronunciation / fluency / intonation** bullet is invisible to it — Whisper and comparable ASR models normalise away pronunciation errors and do not preserve prosody.

Until the audio-evidence pipeline exists (roadmap **S7**):

- **(a) Judge instruction:** L2 is instructed to score QoL on structures + vocabulary evidence only, and to state this scope explicitly in its justification (e.g. "Pronunciation/fluency not assessed from transcript — mark based on structures and vocabulary only").
- **(b) UI framing:** QoL marks carry a wider uncertainty note in the UI than Communication or Role play, reflecting the missing modality.
- **(c) Validation gate:** Phase A measures how much teacher QoL variance pronunciation explains (see `03-validation-strategy.md` §5.1 and roadmap **S6/S7**). QoL agreement targets in Phases B/C are conditional on that finding (see `03-validation-strategy.md` §5.2–5.3).

Any claim of transcript-only QoL parity with examiner marks before that measurement exists is a regression — see `05-deprecated-v1-removals.md`.

### 3.5 Layer 3 — deterministic guardrails (`guardrails.ts`)

L3 takes L2's proposed mark and applies deterministic rules that no LLM should be allowed to override. Each guardrail is named, sourced, and tested.

**Capped-by-evidence ceilings.** Cambridge-derived:

- `quality_of_language ≤ 6` if `EvidenceProfile` shows zero attempted past-tense AND zero attempted future-tense forms across the whole conversation (mirrors the historic "tenses required for 7+" rule). Implemented as a ceiling, not a cliff — L2's mark stands if it falls under the ceiling.
- `communication ≤ 9` if `EvidenceProfile` shows alternative questions triggered on a majority of prompts (matches the verbatim "frequently requires use of the alternative question(s) provided" descriptor of the 7–9 band).
- `role_play_task_mark ≤ 1` for any task L1 marks as `not_attempted`; ceiling 2 only if `attempted` AND L2 finds the information was communicated.

**Sanity-by-volume:**

- `communication ≤ 6` if speaking time across both conversations is below a low threshold (very short responses cannot demonstrate "develops ideas").
- Floor of 0; cap of the criterion's documented maximum (15 / 15 / 10).

**Insufficient-evidence duration (topic conversations):**

- If combined topic-conversation candidate material falls below a configured threshold, L3 widens uncertainty on Communication and QoL marks or refuses with `unscored: insufficient_evidence_for_reliable_mark`. Starting thresholds (tuned in Phase A): **< 4 minutes total candidate speaking time** across both topic conversations, **or** **< N candidate words** (N to be set from Phase A corpus — expect roughly 200–300 as a starting range). Short role-play-only attempts are scored normally; this guardrail applies to the combined conversation criteria only.
- Rationale: Cambridge examiners need enough sustained output to apply band descriptors; a 90-second topic conversation cannot support a confident 13–15 Communication mark regardless of L2 opinion.

**Quote-verification guardrail (unchanged):**

- Every span quoted in an L2 justification must be verified as a substring of the stored transcript (normalised for whitespace and disfluency stripping). Justifications failing verification are rejected and retried; persistent failure → `unscored: justification_failed`. This guardrail is not modified by the insufficient-evidence rule above.

**Transcript-quality guardrails:**

- If `EvidenceProfile.stt.meanWordConfidence` falls below a configured threshold, or if the low-confidence span ratio exceeds another, the attempt is short-circuited to `unscored: transcript_quality_insufficient`. No mark is produced. The UI surfaces "we could not transcribe your response reliably — please re-record or correct the transcript".

**Consistency checks:**

- The two L2 self-consistency calls (§3.4) are compared here. >1-band disagreement → `review_needed`. 1-band disagreement → record `lowConfidence` on the criterion mark.
- Cross-criterion sanity: a 14/15 Communication paired with a 2/15 Quality of Language across the same conversation is implausible (you cannot consistently develop ideas in a language you barely structure); flag for review.

**Confidence assignment:**

- Each criterion mark exits L3 with a confidence band: `high` (no guardrails triggered, no self-consistency disagreement, mean STT confidence high), `medium`, `low`. The UI displays the appropriate uncertainty band — never a single confident number when L3 says confidence is low.

L3 produces a *clamped* mark and a *confidence*. It does not generate justifications; those come from L2. It does not invent evidence; it reads what L1 already produced.

### 3.6 Calibration subsystem (`calibration/`)

Cambridge examiners are trained on exemplar scripts before they mark. The descriptors alone are insufficient because the descriptors themselves are interpretive ("develops ideas" is a judgement, not a measurement). Calibration anchors close that gap.

**What an anchor is.** A single anchor is a record of:

```ts
interface CalibrationAnchor {
  anchorId: string;
  criterion: 'role_play_task' | 'communication' | 'quality_of_language';
  transcriptExcerpt: string;      // a focused excerpt, not the whole transcript
  mark: number;                   // examiner-awarded mark
  band: BandRange;                // resolved from mark + rubric
  examinerReasoning: string;      // structured: which descriptor phrases applied and why
  topicArea: 'A' | 'B' | 'C' | 'D' | 'E';   // 0520 topic areas
  responseLength: 'short' | 'medium' | 'long';
  sourceProvenance: string;       // who marked it, when, under what guidance
  addedAt: string;
  retiredAt?: string;
}
```

**How anchors are used at scoring time.** When L2 scores a criterion for a learner's response, `calibration/select.ts` picks a small set of anchors (target: 3–5 per criterion, token-budget bound) that are *most relevant* to the response under judgement. Relevance is computed from:

- topic area match (prefer same area, fall back to any area);
- response length bracket match (a short response should be calibrated against short anchors);
- band coverage (always include at least one anchor from a band higher and one from a band lower than the L1 evidence loosely suggests, so the model is forced to position the response, not anchor onto a single nearby mark).

Selected anchors are inserted into the L2 prompt with a fixed framing: "An experienced 0520 teacher awarded the following response X/15 for Communication, reasoning: ‹reasoning›. Use this as a calibration reference — your job is to judge a *different* response below using the same descriptors."

**What anchors must not do.** Anchors are reference points, not lookups. The L2 prompt forbids the LLM from saying "this response is worth X because anchor Y got X" — every justification must still cite the response's own transcript and evidence. Anchors calibrate the band thresholds; they do not transfer marks.

**Anchor-corpus and validation-corpus separation.** A transcript used as a calibration anchor can never be used to measure scorer accuracy — it would be measuring memorisation. Every graded transcript collected during Phases A/B/C is allocated *either* to the anchor set *or* to the held-out validation set, never both. Once allocated, transcripts do not move between sets within a version. The split is deliberate, not random: anchors are chosen to maximise band coverage and topic spread; validation transcripts are chosen to maximise statistical representativeness.

**Versioning the calibration set.** The anchor collection is its own versioned artefact:

- `calibration-v0.1-N15` — Phase A output: a small starter anchor set assembled from the 10–15 graded transcripts collected in Phase A.
- `calibration-v0.5-N28` — Phase B: expanded with new anchors, refined selection rules.
- `calibration-v1.0-N40+` — Phase C: production set.

The calibration version is stamped into every `ScoringEnvelope`. Adding, retiring or re-categorising an anchor bumps the calibration version. Retiring is preferred to deleting — a retired anchor is preserved in history so old scores can be explained.

**Maintenance.** When Cambridge releases a new Principal Examiner Report (typically twice a year), the report is read for shifts in band interpretation or new commentary, and the anchor set is reviewed. When the syllabus cycle changes (e.g. 2028–2030 succeeds 2025–2027), the entire calibration set is re-validated against the new mark scheme before being re-promoted.

### 3.7 Grade boundary mapping (`grader.ts`)

- Sum to `total ∈ [0, 40]`.
- Apply the most recent published session's grade boundaries (sourced from Cambridge's Component Grade Threshold documents for 0520), with the series and date annotated.
- Display `total/40` first, letter band second, with an uncertainty band: e.g. `26/40 — most likely Grade C (Jun 2024 boundaries: C ≥ 24, B ≥ 28), possibly B or D`. Never show a single confident letter for raw marks within ±2 of a boundary.
- The boundary series used is part of the `ScoringEnvelope`. When new boundaries publish, old scores are not silently re-graded; the UI offers "regrade against latest boundaries" as an explicit action.

### 3.8 Pipeline versioning and the `ScoringEnvelope`

v1 versioned the rubric. That is necessary and far from sufficient. A score's meaning depends on the LLM model that judged it, the prompt that constrained the LLM, the STT model that produced the transcript, the calibration anchors that anchored the judgement, the deterministic detectors that built the evidence, and the boundary series that mapped raw → letter. **All of these are versioned, and every persisted attempt records its full stack.**

```ts
interface ScoringEnvelope {
  attemptId: string;
  scoredAt: string;

  // Rubric and code versions
  rubricVersion: string;             // 'igcse-0520-rubric-v0.3'
  scoringEngineVersion: string;      // 'engine-v0.5.2' — git SHA of the orchestrator
  evidenceDetectorVersion: string;   // 'detectors-v0.4' — the L1 detector code
  guardrailsVersion: string;         // 'guardrails-v0.3'
  evidencePromptVersion: string;     // 'evidence-prompt-v0.4'
  scoringPromptVersion: string;      // 'scoring-prompt-v0.3'

  // LLM stack
  llm: {
    model: string;                   // e.g. 'claude-opus-4-7'
    modelSnapshot?: string;          // vendor-specific snapshot id where available
    temperature: number;             // 0 for scoring; recorded regardless
    seed?: number;
    selfConsistencyRuns: number;     // typically 2
  };

  // STT stack
  stt: {
    model: string;                   // e.g. 'whisper-large-v3' or 'deepgram-nova-fr'
    modelVersion: string;
    languageCode: 'fr';
    promptBiasedRetries: number;     // for low-confidence spans
  };

  // Per-attempt observed quality
  transcriptConfidence: {
    meanWordConfidence: number;
    lowConfidenceSpanRatio: number;
    userCorrected: boolean;          // did the candidate edit the transcript before scoring?
  };

  // Calibration
  calibrationVersion: string;        // 'calibration-v0.5-N28'
  anchorsUsedByCriterion: Record<Criterion, string[]>;  // anchorIds actually injected

  // Grade boundary provenance
  gradeBoundarySeries: string;       // 'jun-2024'

  // Outputs (denormalised for fast retrieval)
  rolePlayTasks: Array<{ taskId: string; mark: 0|1|2; confidence: Confidence; justification: Justification }>;
  communication: { mark: number; band: BandRange; confidence: Confidence; justification: Justification };
  qualityOfLanguage: { mark: number; band: BandRange; confidence: Confidence; justification: Justification };
  total: number;
  predictedGrade: { mostLikely: Grade; possible: Grade[]; series: string };

  // Held-back inputs for regrade
  evidenceProfileSnapshot: EvidenceProfile;
  transcriptSnapshot: string;
  guardrailTriggers: string[];       // which guardrails fired
  selfConsistencyOutcomes: { agreement: 'exact'|'one_band'|'wider'; rerunsRequested: number };
}
```

**Regrade semantics.** A regrade re-runs the scorer over a stored `EvidenceProfile` and `transcript` with a new version stack. The UI never silently overwrites the old envelope — the regrade produces a new envelope; both are shown side-by-side. The user sees: "Originally scored 11/15 (engine-v0.4, calibration-v0.3). Re-scored 12/15 (engine-v0.6, calibration-v0.5). Marks moved up by 1 because: the v0.5 calibration set includes more boundary-case anchors for the 10–12 / 13–15 range."

**Limits of reproducibility, honestly stated.** When a model snapshot is deprecated by the vendor (this *will* happen), exact regrade becomes impossible. The envelope records this: `regradable: false, deprecated_at: ...`. The system falls back to "best available equivalent model" with the substitution recorded in the new envelope. We never pretend a regrade is exact when it is not.

**Bumping versions.** Any change to a rubric descriptor, a prompt template, a detector implementation, a guardrail threshold, an anchor's mark or reasoning, or the boundary-series mapping bumps the relevant component version. Code changes that do not affect output (logging, performance) do not. CI enforces version bumps on diffs to scoring-relevant files.

---

## 4. The hybrid resolved, not declared

§3.3–3.5 *are* the resolution of the deterministic-vs-accurate tradeoff that v1 ducked. The summary:

- **Reproducibility lives in Layers 1 and 3** — both fully deterministic, both versioned, both auditable. Two attempts on the same transcript with the same stack will produce the same evidence and the same guardrail decisions every time.
- **Correctness lives in Layer 2** — because the band-differentiating descriptors ("develops ideas and opinions", "justifies and explains") are qualitative judgements that no regex can make. Calibrating Layer 2 against examiner anchors is how we close the gap between "a language model has an opinion about this response" and "an examiner-trained model has the right opinion".
- **The two are bridged by contracts**, not by demoting one to comment status: L2 must cite L1's evidence; L3 can cap L2 but cannot override its descriptor matching within the cap; the envelope records both layers' contributions to every mark.

The cost is honest. Identical inputs may produce *slightly* different L2 outputs across runs even at temperature 0, due to vendor-side non-determinism. We surface this as confidence, never as false precision. We measure it during validation (§5) and report it. If self-consistency disagreement exceeds a threshold, the attempt is flagged for human review rather than scored with confidence the system does not have.

---

