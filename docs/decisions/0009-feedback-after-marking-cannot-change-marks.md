# 0009 — Feedback is generated after marking and cannot change marks

Date: 2026-10-03
Status: Accepted (amends 0005's output type and import list)

## Decision

Examiner-style feedback — what the candidate did well, their actual mistakes (quoted, with the
correct French and an error category) and one next step tied to a descriptor — is produced
**after** marking and **cannot change a mark**. Concretely:

1. **It is unreachable from the scored pipeline.** The feedback helpers live in
   `src/domain/examFeedback/`, deliberately *outside* `src/domain/igcse/` (which the boundary tests
   scan as "the scored pipeline"). Nothing under `src/domain/igcse/`, `scripts/scoring/` or
   `server/` may import `src/domain/examFeedback`, `services/coaching/examinerFeedback`, the
   examiner card, or the rail hook. `src/domain/examFeedback/__tests__/scoredPipelineBoundary.test.ts`
   scans for exactly that.
2. **Its output types have no mark fields.** `ExaminerFeedback` is a union on `profile`
   (`learn` | `rail`, and for the rail `turnKind` `topic` | `rolePlay`) built only from
   `{ claim, quote }`, `{ quote, correction, category }` and `{ claim, quote?, descriptorId }`
   items. No number, band, grade or achieved/partly/not field exists on any shape, and a
   compile-time type test (`examinerFeedback.test.ts`) fails if one is added. A role-play
   "achieved / partly / not" field is a 2/1/0 mark under another name and is explicitly not allowed.
3. **Filters drop; they never rewrite.** Before display, every claim must pass the shared filters
   in `src/domain/examFeedback/shared/`: the mark/band filter (mark, band, grade, score, invented
   tier labels, `N/N`, "out of N", "sur N", band ranges, `A*`, and similar — claim text only, never
   the candidate's quote or the correction), the descriptor-copy filter (a whole canonical bullet,
   or 8+ consecutive words of one), the quote rules (grounded verbatim in the turn; minimum length
   — an `UNVALIDATED` app policy, no Cambridge document states it — and a strength whose quote
   overlaps a reported mistake is dropped), and, on a **spoken** turn only, the sound-alike filter
   (a mistake that exists only in spelling cannot be heard; a word-final audible `é` is kept).
4. **The prompt carries no band labels and no marking-principles text.** Descriptor bullets are
   listed unlabelled, by id, and only those that can be judged from one answer. A learner's next
   step must name one of those ids; an unknown id drops the step. The teacher/examiner notes are
   cited by page only (p.10 role play, p.11 Communication, p.12 Quality of Language); no descriptor
   text is introduced beyond `src/domain/igcse/canonical.ts`.

## Amendment to 0005

0005's structural rules still hold in spirit — feedback is data-only against the audited scorer —
with two changes:

- **Output type.** 0005 described `ExaminerFeedback` as `currentDescriptorCommentary` and
  `improvementCommentary`. That shape (the `examiner-v1` prompt) is replaced by the profile union
  above (`examiner-v2`); the backend keeps serving v1 for one release only so an older client
  survives the deploy. The "no numeric, band or mark field" requirement is unchanged and is now
  enforced by a type test as well as by review.
- **Import list.** `src/services/coaching/examinerFeedback.ts` may import rubric descriptor data
  and `src/domain/examFeedback/shared/**` only. `isQuoteGrounded` now reaches it through
  `shared/quoteRules.ts`, not directly. The scoped `no-restricted-imports` rule blocks the whole of
  `domain/igcse/judgement/`, `envelope/`, `guardrails/` and `session/` (0005 listed only
  `scoreSpeaking*` among the judgement files) and any `domain/examFeedback/` path outside
  `shared/`. `shared/` itself may import only `igcse/text/normalize` and `igcse/judgement/schema`
  (`isQuoteGrounded`), enforced by an ESLint block and `shared/__tests__/sharedBoundary.test.ts`.
  (0005 also named `examinerFeedback.importGraph.test.ts`; the import-graph assertions actually live
  in `src/services/coaching/__tests__/examinerFeedback.test.ts`.)

## Why

The audited engine's marks are the only marks; any feedback that can see, set or alter one would be
indistinguishable from a grade prediction (0003, 0005). Making the dependency one-way — feedback may
read the finished record, the scorer never reads feedback — turns "feedback cannot change marks" from
a prompt promise into a property of the import graph. The display filters exist because a language
model asked for examiner-style prose will drift toward band talk and pasted descriptors; dropping
(not repairing) the offending claim keeps what is shown attributable to the candidate's own words.

## Consequences

- A change that lets any file under `src/domain/igcse/`, `scripts/scoring/` or `server/` import the
  feedback modules, or adds a numeric/mark/band field to an `ExaminerFeedback` shape, contradicts
  this decision.
- Adding a filter rule, an error category, a descriptor id or a prompt line is a new
  `EXAMINER_FEEDBACK_PROMPT_VERSION` plus a regenerated `backend/data/examiner_feedback/prompts.json`
  (backend commit first); the pinned hash test fails until both happen.
- The post-marking exam **report** (a separate model call on an already-persisted envelope, with its
  own server route and table) is covered by the same rule; its implementation is Phase 3 Batch A and
  will extend this record with an amendment.
