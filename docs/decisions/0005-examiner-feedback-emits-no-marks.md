# 0005 — Examiner-voice practice feedback emits no marks

Date: 2026-09-01
Status: Accepted

## Decision

`src/services/coaching/examinerFeedback.ts` — Learn-mode practice feedback written in Cambridge
examiner register — must never output a mark, a band number, a score out of 15 or 40, or a letter
grade. Its entire output is qualitative commentary: which official mark-scheme descriptor language
applies to the candidate's answer, and what would move it up a band, with every claim quote-verified
against the candidate's own transcript. This is deliberately **not** the audited Cambridge scorer
(`src/domain/igcse/`) and must never be mistaken for a grade prediction.

Structurally, this module may only import rubric descriptor text and `isQuoteGrounded` — never the
scoring/envelope/guardrails/session machinery. This is enforced two ways:

1. A scoped `no-restricted-imports` ESLint rule in `eslint.config.js`, targeting exactly
   `src/services/coaching/examinerFeedback.ts`, blocking imports matching
   `**/domain/igcse/judgement/scoreSpeaking*`, `**/domain/igcse/envelope/**`,
   `**/domain/igcse/guardrails/**`, and `**/domain/igcse/session/**`.
2. `src/services/coaching/__tests__/examinerFeedback.importGraph.test.ts`, which independently
   verifies the module's import graph stays within the same boundary.

The `ExaminerFeedback` type itself has no numeric, band, or mark field — only
`currentDescriptorCommentary` and `improvementCommentary`, each an array of `{ claim, quote }`.

## Why

Learn-mode practice feedback needs to sound like real examiner language to be useful, but a
predicted mark from an unaudited code path would be indistinguishable from — and could be mistaken
for — a real result from the audited scorer (`docs/decisions/0003-node-engine-is-the-authoritative-scorer.md`).
Keeping this feedback strictly qualitative, and structurally incapable of importing the scoring
pipeline, removes that failure mode at the type level and the import-graph level rather than
relying on prompt discipline alone.

The rule previously lived only as a citation to a deleted roadmap document
(`roadmap.md S7`/`S10`) in both the ESLint rule's message and the module's own header comment.
That document no longer exists; this ADR is now the rule's authoritative home, and the ESLint
message and header comment should point here instead (Stage 6 of the documentation migration
repairs those citations).

## Consequences

- Any change that would let `examinerFeedback.ts` import scoring/envelope/guardrails/session code,
  or would add a numeric field to `ExaminerFeedback`, contradicts this decision — it is not a
  refactor to wave through.
- If Learn-mode practice ever needs an actual predicted mark, that requires a new, separate
  decision — not a loosening of this one.
