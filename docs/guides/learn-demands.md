# Learn Demands Authoring Guide

Content contract for `src/data/learn/demands/<topic>.json`. Normative for
`npm run learn:check`. If the checker and this guide ever disagree, the
checker is a bug — file it, don't route around it by re-approving an entry.

See `docs/systems/learn-adaptive-difficulty.md` for the full design this
contract implements.

## 0. Before you write anything

- Read `src/domain/learn/demand/types.ts` for the exact `QuestionDemands`
  shape and `deriveDemandLevel.ts` for how a level is derived — a level is
  never hand-picked.
- One `LearnDemandsFile` per topic, keyed by `topicKey` (matches
  `src/data/questions.ts`'s `Question.topicKey`). One `LearnDemandsEntry` per
  question in that topic.

## 1. Rules a generating model must follow

1. `cognitiveDemand` describes what the *question wording* forces, not what a
   good answer could optionally include. *"Parle-moi de ton école"* is
   `describe` even if a strong answer justifies.
2. `timeFrames` lists what the wording **cues** — never tag `past` on a
   present-tense question with no past cue.
3. `structures` must be what the text genuinely elicits — answer it yourself
   in French and check.
4. `sufficientAnswer` is English, 1–2 sentences, with **countable**
   requirements ("at least two reasons"). It is shown verbatim to the grader
   and is never machine-checked beyond a word-count floor and a banned-vague-
   phrase list.
5. **Never assert a CEFR level.** To make a question harder, raise the
   cognitive demand or the time frames — not the vocabulary. The `demands`
   shape has no level field; do not add a `checkedInLevel` by hand except to
   intentionally test `demand-level-mismatch`.
6. `responseLoad` must match `cognitiveDemand`: `describe` may be `short`;
   `justify`, `compare` and `hypothesize` never are.
7. When `provenance: 'inferred'`, `inferenceConfidence` (0–1) is required.
   When `provenance` is `'reviewed'` or `'authored'`, `inferenceConfidence`
   must be absent — a human is vouching for it.

## 2. Deterministic validation — `npm run learn:check`

| Rule | Severity | Fires when |
| --- | --- | --- |
| `unknown-question-id` | error | id not in `QUESTIONS` |
| `missing-time-frame` | error | `timeFrames` empty |
| `demand-level-mismatch` | error | a `checkedInLevel` disagrees with the derived level |
| `short-load-on-high-demand` | error | `justify`/`compare`/`hypothesize` with `responseLoad: 'short'` |
| `sufficient-answer-too-vague` | error | < 8 words |
| `missing-inference-confidence` | error | `provenance: 'inferred'` with no `inferenceConfidence` |
| `unexpected-inference-confidence` | error | `inferenceConfidence` present when `provenance !== 'inferred'` |
| `duplicate-question-id` | error | the same `questionId` appears twice in one file |
| `not-approved` | error (suppressed by `--draft`) | `review.status !== 'approved'` |
| `level-not-carried-by-vocabulary` | warn | `lexicalReach: 'abstract'` is the only above-baseline signal |
| `time-frame-not-cued` | warn | a tagged frame has no cue word in the question text |
| `structure-not-elicited` | warn | structure tagged but no matching pattern in the question text |
| `topic-demand-monotony` | warn | a topic file covers < 3 distinct `cognitiveDemand` values |
| `corpus-hash-drift` | error | reserved for Stage 8 (`src/data/learn/` vs `backend/data/learn/` parity) — not implemented until then |

`time-frame-not-cued` and `structure-not-elicited` are skipped (never warn)
when the checker cannot resolve the question's French text — this happens
only if the referenced `questionId` isn't found in `QUESTIONS`, which
`unknown-question-id` already flags as an error.

## 3. Scripts

```bash
npm run learn:skeleton -- <topicKey>     # emit a pre-tagged skeleton for a topic
npm run learn:check [-- --draft]         # validate + lint every topic file
npm run learn:review -- --topic <key>    # readable Markdown review sheet
npm run learn:status                     # provenance split + coverage report
```

## 4. Workflow

1. `npm run learn:skeleton -- <topicKey>` writes
   `src/data/learn/demands/<topicKey>.json` with one draft, `describe`-floor,
   `provenance: 'inferred'`, `inferenceConfidence: 0` entry per question in
   that topic.
2. Fill in every entry per §1 above (or run the Stage 3 inference script,
   once it exists, to populate the skeleton automatically).
3. `npm run learn:check -- --draft` until clean.
4. Human review flips `provenance` to `'reviewed'` (or `'authored'` for
   hand-written demands) and `review.status` to `'approved'`, stamping
   `review.reviewedBy`/`review.reviewedAt`.
5. `npm run learn:check` (no `--draft`) must be clean before the file is
   considered review-complete.
