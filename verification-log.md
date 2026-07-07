# Verification Log

## S1 Verification Gate

Date: 2026-07-07

- Full suite run: `npm test` -> **250/250 tests passed** (24 test files) at gate time.
- L2 scorer inspection completed for:
  - `src/domain/igcse/rubric.ts`
  - `src/domain/igcse/canonical.ts`
  - `src/domain/igcse/judgement/types.ts`
  - `src/domain/igcse/judgement/prompt.ts`
  - `src/domain/igcse/judgement/schema.ts`
  - `src/domain/igcse/judgement/scoreSpeaking.ts`
- Golden transcript end-to-end verification:
  - Source test: `src/domain/igcse/judgement/__tests__/scoreSpeaking.test.ts` (`happy path`).
  - Expected shape/value check matched:
    - `rolePlay.total = 9`
    - `communication.mark = 8`
    - `qualityOfLanguage.mark = 8`
    - `total = 25`
- Typecheck run: `npm run typecheck` -> repo-wide failures remain in legacy UI files; no S2 scoring scope changes attempted there.

Status: **S1 gate met for scoring-engine scope**.

## S2 Layer 1 Evidence Signals

Date: 2026-07-07

Implemented detectors (deterministic, unit-tested):

- Time-frame alignment detector (`src/domain/igcse/evidence/timeFrame.ts`)
- Word/response counts per question (`src/domain/igcse/evidence/counts.ts`)
- Filler density per question (`src/domain/igcse/evidence/fillers.ts`)
- Two-part-task `partsAddressed` detector (`src/domain/igcse/evidence/parts.ts`)
- Evidence composer (`src/domain/igcse/evidence/buildEvidence.ts`)

Transcript shape extension (optional inputs only):

- `expectedTimeFrame?: TimeFrame` on conversation turns
- `partsExpected?: 1 | 2` on role-play tasks

Test artifacts:

- `src/domain/igcse/evidence/__tests__/timeFrame.test.ts`
- `src/domain/igcse/evidence/__tests__/counts.test.ts`
- `src/domain/igcse/evidence/__tests__/fillers.test.ts`
- `src/domain/igcse/evidence/__tests__/parts.test.ts`
- `src/domain/igcse/evidence/__tests__/buildEvidence.golden.test.ts`

Adversarial required-pass confusion cases were implemented and passing for:

- `c'est` vs `c'était`
- present response to `récemment` / `la semaine dernière` cue -> `misaligned`
- `j'ai faim` (present) vs `j'ai mangé` (past)
- `je venais` vs `vous venez`
- futur proche (`je vais + inf`) vs literal present (`je vais à ...`)
- imparfait `-ais` vs conditionnel `-rais`

Regression results:

- Full suite run after S2 changes: `npm test` -> **279/279 tests passed** (29 test files).
- Golden evidence regression: `buildEvidence.golden.test.ts` passing.
- S1 golden transcript regression remains passing (`scoreSpeaking.test.ts` happy path).
- Typecheck: `npm run typecheck` still fails in pre-existing legacy UI files outside S2 scope.

### PROVISIONAL — Time-Frame Classifier

Even with the adversarial confusion fixtures passing, self-authored fixtures do not prove correctness on unseen French responses.

Logged commitment for S3+:

- Manually spot-check classifier output against the first **3-5 real teacher transcripts** once S3 ingestion is available.
- Audit per-response `TimeFrame` output against the actual French.
- Keep this signal **advisory** for Phase A until that held-out manual check passes.
