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
| `corpus-hash-drift` | error | `src/data/learn/demands/` and `backend/data/learn/` hash differently (skipped when `backend/data/learn/` is absent) |

`time-frame-not-cued` and `structure-not-elicited` are skipped (never warn)
when the checker cannot resolve the question's French text — this happens
only if the referenced `questionId` isn't found in `QUESTIONS`, which
`unknown-question-id` already flags as an error.

### 2a. Question-bank lint (also run by `learn:check`)

`src/data/learnBankLint.ts` checks the Learn-only fields on `Question` and the
wording of the question itself. It is a content gate, never a runtime filter.

| Rule | Severity | Fires when |
| --- | --- | --- |
| `sub-topic-not-in-topic` | error | `subTopic` is not in `LEARN_SUB_TOPICS[topicKey]` (`src/data/learnSubTopics.ts`; only the 16 core topics have a list) |
| `coach-hint-shape` | error | `coachHint` has not 2–3 ideas, an idea under 3 words or over 120 characters, or an empty `phrase.fr`/`phrase.en` |
| `coach-hint-restates-question` | warn | an idea copies the legacy `hint`, or `phrase.fr` mostly repeats the question's own words |
| `coach-hint-tense-mismatch` | warn | the question is tagged past/future/conditional and `phrase.fr` shows none of those cues, or it is tagged present-only and the phrase cues another tense (skipped without a demands tag) |
| `bare-yes-no-question` | warn | a one-`?` question that opens as a yes/no and has no open word — the same predicate as the exam bank's `patternLint.ts` |
| `loaded-negative` | warn | the question leads the answer ("Ne penses-tu pas…") — same predicate as `patternLint.ts` |

`subTopic` and `coachHint` live on the question in `src/data/questions.ts`, not
in the demands files, so editing them never changes `demandsVersion`. **`hint`
is not display-only** — `infer.ts` (response load, sufficient answer) and
`diagnosticEngine.ts` (avoidance) read it — so write the learner-facing help
in `coachHint` and leave `hint` alone. Changing a question's *text* changes
inference: re-tag and re-review that entry in the same commit.

### 2b. Parity tests (run by `npm test`)

`src/data/learn/__tests__/demandsParity.test.ts` fails when the manifest is stale
(`demandsVersion` or `byQuestionId` differs from the JSON; fix with
`npm run learn:build-manifest`) and, when `backend/` is present, when
`backend/data/learn/` is not a byte copy (fix with `npm run learn:sync-backend`).
A hash mismatch is silent at runtime: the backend sets `demandsResolved: false`
and L2 evidence switches off. Ship each demands change as one frontend commit
(JSON + regenerated manifest) and one backend commit (byte copy), deployed back
to back, and note the short L2-off window in `verification-log.md`.

### 2c. Model re-read vs human review

Entries carrying `review.notes` ("Learn Batch 3b: re-read against its wording by the authoring
model; not human-reviewed.") were checked against the question wording by the authoring model
and corrected where the tag disagreed with the text. They stay `provenance: 'inferred'`
(`inferenceConfidence` 0.8) with `review.status: 'draft'`: a model cannot vouch for itself, and
the weight of a tag only rises when a human flips it (§1 rule 7). To promote a topic after you
have read its sheet (`npm run learn:review -- --topic <key>`):

1. For each entry you accept, set `provenance` to `'reviewed'`, delete `inferenceConfidence`,
   set `review.status` to `'approved'`, and stamp `review.reviewedBy` / `review.reviewedAt`
   (drop `review.notes`); fix any entry you do not accept first.
2. `npm run learn:build-manifest && npm run learn:sync-backend`, then `npm run learn:check`
   (no `--draft`) must be clean for that topic.
3. Ship it as one frontend commit (JSON + manifest) and one backend commit (byte copy), deployed
   back to back; note the short L2-off window in `verification-log.md`.

`npm run learn:infer` refuses to run while any entry carries `review.notes`, `reviewed` or
`approved` work — it is a one-time bootstrap, never a way to "refresh" a topic.

### 2d. Wording rules for Learn questions

- A question must not be a bare yes/no: add a second part that uses an open word (*pourquoi*,
  *comment*, *quel(le)(s)*, *lesquel(le)s*, *quand*, *où*, *combien*) — `bare-yes-no-question`
  and `learnBank.coverage.test.ts` enforce it for core topics.
- If the question asks about the past or the future, the wording should carry a cue the checker
  knows (*l'année dernière*, *quand tu étais…*, *à l'avenir*, *dans vingt ans*, *plus tard*),
  so the `timeFrames` tag is checkable.
- Keep a question inside everyday A2–B1 life; a question about AI ethics, supply chains or
  boycotts is replaced by a personal version (done for `emo_18`, `emo_29`, `arv_25`, `sho_19`,
  `foo_47`).
- `subTopic`: every core question gets one; a list key with fewer than 5 questions hides its chip
  in Learn's setup, so merge the list rather than leaving it thin.

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
