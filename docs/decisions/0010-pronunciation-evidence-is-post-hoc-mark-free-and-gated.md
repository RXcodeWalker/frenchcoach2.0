# 0010 — Pronunciation evidence is post-hoc, mark-free, and gated on calibration

Date: 2026-10-06
Status: Accepted (amends 0009's boundary list)

## Decision

Exam-mode pronunciation analysis is opt-in, feedback-only, and structurally unable to change a mark.
The behavior is specified in `docs/systems/exam-pronunciation.md`; this record holds the rules that
must not drift.

1. **It is unreachable from the scored pipeline, with no exemptions.** Everything lives in
   `src/domain/examPronunciation/`, `src/services/exam/pronunciation/` and
   `src/features/exam/pronunciation/`, outside `src/domain/igcse/`. Unlike the exam report (0009,
   which needs `server/feedbackRoute.ts` and a store inside `server/` and `scripts/scoring/`), the
   route is FastAPI, so **no file under `src/domain/igcse/`, `scripts/scoring/` or `server/` may
   import, name or query it** — not even a named feedback-surface file. Enforced by
   `scoredPipelineBoundary.test.ts` (extended, no exemptions), `dataIsolation.test.ts` (no
   non-test file there contains `exam_pronunciation` or `examPronunciation`) and two ESLint
   blocks.
2. **The evidence is a sidecar, never the envelope.** The envelope is the immutable record of a
   scoring attempt, its schema strips unknown keys, and Coached analysis happens before any envelope
   exists. Rows live in `exam_pronunciation_evidence`, keyed
   `(user_id, session_id, turn_key, assessor_version)`. The scorer cannot query it, so it does not
   matter that Coached evidence may exist before scoring.
3. **Display types carry no score.** Azure's per-word accuracy exists only in stored evidence; no
   overall pronunciation score is ever shown, and a type test fails if a mark, band or number field
   is added to a display shape. Display strings pass the shared mark/band filter in
   `src/domain/examFeedback/shared/`.
4. **Versions stay frozen.** `versionsUnchanged.test.ts` asserts the scoring, guardrails, rubric,
   envelope-schema, evidence-detector, session-engine and exam-feedback versions and both judge
   prompt hashes are unchanged, and `marksUnchanged.test.ts` asserts `scoreAttempt` produces
   deep-equal mark fields with and without pronunciation evidence present, and that the `/score`
   body has no pronunciation key. Pronunciation has its own versions
   (`EXAM_PRONUNCIATION_VERSION`, `EXAM_PRONUNCIATION_ASSESSOR_VERSION`).
5. **The axis is comprehensibility, never nativeness.** Teacher's Notes p.12 makes pronunciation one
   strand of Quality of Language, scaled down to "understood with some effort"; no band mentions
   accent. So an accent is never an error: French R, stress, rhythm and vowel colour are never
   reported, and a word is reported only if it is meaning-carrying, below a low accuracy floor,
   agreed by both recognisers, and cleanly recorded (`fairness.ts`). Intonation cannot be measured
   for fr-FR, so nothing claims to assess it. The judge prompt keeps saying pronunciation was not
   assessed.
6. **Release is gated on calibration, and the gate is closed.** Every number in `FAIRNESS_CONFIG` is
   `UNVALIDATED` (they are app policy, not Cambridge figures). The backend's
   `EXAM_PRONUNCIATION_ACCESS` (`off` | `admin` | `all`, default `off`) is authoritative; the client
   UI additionally shows only for an admin or `VITE_EXAM_PRONUNCIATION_PUBLIC=1`. Moving to `all`
   requires **both** (a) the calibration in `docs/systems/exam-pronunciation.md` passing and being
   logged in `verification-log.md`, and (b) migration `20261003113100_revoke_guardian_consent_by_token.sql`
   applied to production — without it guardian revocation, and therefore erasure of this child data,
   does not work. A threshold change after calibration is a version bump (6 above) and a re-run.
7. **Audio is never kept.** Recordings stay in browser memory and are never written to storage, the
   snapshot or IndexedDB; the backend uploads nothing durable (Azure is called with no `storeAudio`,
   asserted by a test). Only word-level results are stored, cascading on profile deletion and
   included in `export_my_data`.

## Why

A pronunciation signal is the easiest feedback to get wrong in an unfair direction: speech
recognisers score accent as error, and a "pronunciation score" sitting next to a /40 mark reads as
part of it. Making the dependency one-way (0009) and the display number-free removes both failure
modes structurally, rather than by prompt or by care. The calibration gate exists because the
fairness thresholds were set without graded audio, and shipping them to learners — some of them
children — on faith would be shipping a guess as a finding.

## Consequences

- A change that lets any file under `src/domain/igcse/`, `scripts/scoring/` or `server/` import,
  name or query pronunciation evidence, adds a score/band/number to a display type, or stores audio,
  contradicts this decision.
- Changing any `FAIRNESS_CONFIG` value is an `EXAM_PRONUNCIATION_VERSION` bump (the hash test fails
  until both change); changing the backend assessor's chunking, alignment or suppression logic is an
  `EXAM_PRONUNCIATION_ASSESSOR_VERSION` bump, which re-analyses on the next request.
- Switching `EXAM_PRONUNCIATION_ACCESS` to `all` is not a routine config change: it needs the two
  preconditions in rule 6, recorded in `verification-log.md`.
- Amends 0009: its list of modules the scorer must never reach now also includes
  `src/domain/examPronunciation/`, `src/services/exam/pronunciation/`,
  `src/features/exam/pronunciation/` and the `exam_pronunciation_evidence` table, with no
  feedback-surface exemption.
