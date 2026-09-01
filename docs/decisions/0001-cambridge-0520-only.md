# 0001 — Cambridge IGCSE French (0520) only

Date: 2026-09-01
Status: Accepted

## Decision

The Assessment Engine scores exactly one syllabus: Cambridge IGCSE French (0520), Paper 3
Speaking. There is no generic rubric engine, no `ExamBoard` abstraction, and no multi-board
future-proofing. This is referenced in code as "hard-constraint #1"
(`src/domain/igcse/rubric.ts`'s header comment).

## Why

Every mark range, band descriptor, and threshold in `rubric.ts` traces to a specific official
Cambridge document (`0520/03/TN/M/J/24`, the May/June 2024 Teacher/Examiner Notes), attached via
an `exactSource(page)` citation on every band. A board-agnostic abstraction would either force
those sourced values to be genericized (destroying the traceability) or force a second,
necessarily different sourcing scheme to be bolted alongside it for no exam board that currently
exists in this product. The prior design docs that explained this rejection in more depth
(`docs/architecture/`) were deleted 2026-08-31; this ADR is the durable record of the constraint
they used to carry.

## Consequences

- Any number in the rubric lacking a source citation is `UNVALIDATED` by definition, not guessed
  (see `docs/systems/assessment-engine.md`).
- If a future syllabus or exam board is proposed, that is a new decision superseding this one —
  don't infer support for it from the current code shape.
- `backend/evaluator_service.py` (the legacy, unreached Python scorer) violates this rule — its
  Communication/Quality-of-Language bands are unsourced. It predates the audited engine and is out
  of scope to fix; see `docs/decisions/0003-node-engine-is-the-authoritative-scorer.md`.
