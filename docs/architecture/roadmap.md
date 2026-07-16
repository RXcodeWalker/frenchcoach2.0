S2 — S1 verification gate + Layer 1 evidence signals
Entry gate (blocking): independently verify S1 — run the full test suite locally, inspect the L2 scorer files, run one golden transcript end-to-end and diff output against expected shape. Record results in verification-log.md. Build: time-frame alignment detector (question tag → response tense classification); word/response counts per question; filler density; two-part-task parts_addressed; unit tests with fixture transcripts including examiner-report failure cases. Exit: all detectors unit-tested; golden-transcript regression green; verification-log entry for S1 and S2.

S3 — STT ingest path for the teacher recordings (time-critical: recordings arrive within days)
Build: Whisper large-v3 (or hosted equivalent) with language forced to fr; word-level confidence persisted; diarization or two-pass separation of examiner vs candidate speech; alternative-question/repetition annotation against the session's question set; hand-correct 3 transcripts to measure WER. Exit: WER measured and recorded; examiner-event annotation spot-checked correct on every processed recording; transcripts stored with confidences.

S4 — ScoringEnvelope end-to-end + Phase A batch harness
Build: envelope persistence (rubric/prompt/model/STT/calibration/boundary versions per attempt); CLI batch scorer over N transcripts producing a per-criterion diff report vs teacher marks (scorer mark, teacher mark, delta, justification, quoted evidence). Exit: one recording flows recording → transcript → L1 signals → L2 score → envelope → diff row with zero manual steps.

S5 — Guardrails v1 + synthetic trip set
Build: quote-verification guardrail (existing normalization rules); insufficient-evidence-duration guardrail; synthetic transcripts constructed to trip each guardrail, seeded from the examiner-report failure taxonomy. Exit: every guardrail demonstrably fires on its synthetic trigger and stays silent on clean transcripts.

S6 — Phase A execution (10–15 teacher-graded)
Run the batch harness; iterate evidence-prompt and scoring-prompt versions; collect the teacher's pronunciation-moved-QoL flags; apply Phase A exit criteria from 03-validation-strategy.md verbatim (zero fabricated evidence; no polar failures; L1 spot-checks; justification traceability). Exit: all Phase A criteria met; failure-mode list written; system labelled v0.x-dev; UI copy remains "practice feedback, not a grade prediction."

S7 — QoL pronunciation strategy decision (evidence-gated)
Input: Phase A pronunciation-variance measurement. Decide: (a) defer audio pipeline, ship QoL with scoped justification + wider uncertainty, or (b) schedule Azure Speech Pronunciation Assessment as a parallel pipeline before Phase C. Record the decision and the number that drove it in the doc. Do not build the pipeline in this phase either way. Exit: written decision with threshold rationale; 02/03 docs updated accordingly.

S8 — Calibration anchor subsystem
Build: anchor selection/storage, prompt-injection mechanism, calibration-vX-Nxx versioning, and a hard code-level check that no held-out transcript ID can ever appear in the anchor set (fail loudly, not silently). Exit: injection works with a dummy anchor; overlap check has a failing test proving it fires.

S9 — Phase B (25–35 graded): calibration + first honest accuracy numbers
Corpus per 03 doc (≥3 per band per criterion, boundary oversampling, topic coverage); allocate 15–20 anchors / 10–15 held-out (permanent); run Phase B exit criteria (within-2 ≥80%, |bias| <1.5, self-consistency ≥85%, teacher review of anchors). Exit: criteria met; UI may show calibrated-estimate framing per 03 doc; no letter grades.

S10 — Examiner-simulation session engine (app-conducted practice)
Build the conduct-rule engine from 04 §6.5 with full event logging into EvidenceProfile; timing enforcement per topic; role-play flow per TN sequence. Exit: a full simulated test produces a session log whose events reconstruct examiner behaviour exactly; scored end-to-end.

S11 — Original question bank v1
Author original role-play scenarios (5 transactional tasks, TN instruction style) and topic-conversation sets (5 questions, alternatives for Q3–5, tagged expected time frames — required by the S2 detector) across topic areas A–E; teacher review of every item; honest "modelled on 0520 format, original questions" framing in UI. Exit: every item teacher-approved and tagged; zero content derived from confidential TN booklets.

S12 — Phase C (60–100) + v1.0 promotion
Corpus and criteria per 03 doc, including the challenging-audio subset and STT WER gates; QoL targets applied per the S7 decision. Exit: all Phase C criteria met → rubric-v1.0, engine-v1.0, calibration-v1.0-N40+; UI shows /40, letter with uncertainty and boundary-series reference; continuous-validation loop (one-click teacher-mark submission, weekly metric re-runs) switched on.
Dependency notes: S3 before S6 (recordings need ingest). S10 and S11 were originally placed after Phase B — teacher-conducted recordings, not app sessions, feed Phases A/B, so the scoring pipeline outranks the practice-session engine until calibration exists.

**Reorder (user-approved, 2026-07-12):** S10 is pulled forward to run before Phase A execution (S6). Rationale: S10 is additive-only (new `src/domain/igcse/session/` folder; does not touch `evidence/judgement/guardrails/envelope/rubric` or existing `stt/**`/`scoreAttempt.ts`), is independent of teacher-validation data, and unblocks beta testers earlier. S10's own exit proof ("scored end-to-end") uses a stub judge via the unchanged `scoreAttempt` harness — it does not require calibration to exist. S11 (original question bank) remains after Phase B as originally ordered; S10 uses a small original fixture question set of its own for the engine's own tests, not the full S11 bank.

**Partial reorder (user-approved, 2026-07-16):** S11's **architecture only** (question-bank data model, runtime validator, deterministic lint, content hash, engine adapter — no question authoring) is pulled forward to run now, ahead of Phase B. Content authoring (the actual role-play scenarios and topic-conversation sets) remains gated behind Phase B and a separately-approved S11 content session, unchanged from the original ordering. Rationale: identical shape to the S10 exception — the schema/validator/hash/adapter work is additive-only against `src/data/exam/bank/` and `src/domain/igcse/content/`, does not touch `evidence/judgement/guardrails/rubric` or change any scoring behavior (`hashQuestionSet` replaces the `'0'.repeat(64)` stub with a real hash of the same already-hard-imported fixture; no new content enters the system), and is independent of teacher-validation/calibration data. Hardening the contract before any content is authored also avoids re-authoring hundreds of items against a shape that later migrates. The S11 *exit criteria* ("every item teacher-approved and tagged; zero content derived from confidential TN booklets") are unaffected and still require the content session, which still waits for Phase B.
