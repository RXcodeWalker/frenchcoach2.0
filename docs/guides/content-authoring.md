# S11 Authoring Guide — Original IGCSE French 0520 Question Bank

Content contract for `backend/data/igcse/original-practice-*.json`. Applies to every set,
`001` included: `001` is no longer frozen (it was rewritten with the other nine in the 0520
conduct plan's Batch 5).

This guide is normative for `npm run authoring:check`. If the checker and this guide ever
disagree, the checker is a bug — file it, don't route around it by re-approving a set.

## 0. Before you write anything

- Read `docs/guides/corpus-matrix.md` and find your set's row: topic 1 and topic 2 sub-topics,
  role-play scenario and area, examiner register, and which slots are two-part.
- **Structure-modeled, original wording (ADR 0008).** The set's *structure* follows the current
  0520/03 Teacher/Examiner Notes: two-part positions, where alternatives go, the time frames
  Q3–Q5 cover, the examiner's register, the topic-area pairing. The conduct rules are specified
  in `docs/systems/exam-conduct-0520.md`, cited by page only. The *wording* is always your own:
  never copy, paraphrase or translate a scenario, question, alternative or further question
  from the notes or a past paper. The notes are confidential to centres and are never
  committed to either repo, in any form.
- **Originality check.** Before approval, run the local-only
  `npx tsx scripts/authoring/originalityCheck.ts <path-to-TN-text>` against a text extraction
  of the notes that lives **outside both repos** (the script refuses a path inside either). It
  flags 5-gram overlaps and any question with similarity ≥0.6 to a line of the notes. Rewrite
  anything it flags and re-run until clean. Its output names set and question ids only.

## 1. Wording style

- **Role-play scenario (`setup`)**: a short French scene-setting paragraph — who the
  candidate is, the situation, and who the examiner plays ("Je suis…"). Read aloud by the
  examiner and shown on the candidate's prep card; the candidate never sees the 5 questions
  in advance.
- **Role-play tasks**: real examiner-asked questions in French, matching the role the
  `setup` assigns the examiner (vendor, receptionist, friend, official, etc.) — "Où
  voulez-vous aller ?", "Quel est votre nom complet ?" (see §5).
- **Topic questions**: direct questions, `tu`-register — "Que fais-tu…?", "Qu'est-ce que tu
  as fait… ?". Never a loaded negative ("Ne penses-tu pas… ?", pattern lint `loaded-negative`,
  an error) and never a bare yes/no question: a yes/no opener always carries a second part
  (pattern lint `yes-no-question`, a warning).
- **One communicative goal per question.** A second goal is never bolted on with a comma —
  it requires `partsExpected: 2` and a distinct `secondPartText` instead.
- **Examiner tone**: neutral, non-leading. Never hints at the "right" answer.

## 2. Vocabulary level

CEFR **A2 with elements of B1** (per the Cambridge IGCSE French 0520 syllabus). Concrete, everyday
vocabulary; grammatical complexity may reach B1 (e.g. conditional, comparison) but the
*lexis* should stay accessible to a strong A2 candidate. If a question needs a gloss to be
understood, it's pitched too high.

## 3. Register

- **Topic questions, alternatives and further questions**: *tu* throughout (the notes' topic
  scripts always use *tu*).
- **Role play**: the examiner's role decides. A friend or someone the candidate's age uses *tu*;
  a stranger or official (ticket clerk, waiter, receptionist, interviewer) uses *vous*. Record it
  as `rolePlay.examinerRegister` (`'tu'` or `'vous'`), and write the `setup` in the same
  register, since the examiner reads it aloud. Pattern lint `register-mismatch` (a warning)
  flags a *vous*-set task containing *tu/ton/ta/tes/te/toi*, or the reverse, and any topic
  question containing *vous/votre/vos*.

The examiner voice is self-sufficient: because questions are **read exactly as printed** with
repetition allowed but rephrasing forbidden, a question must never lean on how it "would
obviously be asked out loud." Write it the way it will be read.

## 4. Length

- Topic questions: ≤ ~12 words. Q1–Q2 shorter still.
- Role-play tasks: ≤ ~15 words.
- `secondPartText`: short, and a **distinct** demand, not a restatement of `mainText`. Vary it:
  not only `"Pourquoi ?"`, but also "C'était comment ?", "Avec qui ?", "Et les inconvénients ?",
  "Qu'est-ce que tu vas faire ensuite ?".
- Topic `title`: a short French noun phrase naming the conversation's subject (e.g.
  "Les repas en famille"). The examiner speaks it when the conversation starts (exam-conduct §5).

## 5. Role-play structure — scenario `setup` + 5 examiner questions (rp1–rp5)

Each scenario has a `setup` (the French scene-setting paragraph — see §1), an
`examinerRegister` (§3), and five questions the *examiner* asks in role. The shape follows the
notes' scripts (TN pp.16–24):

| Task | Shape |
| --- | --- |
| rp1–rp2 | Single, short transactional questions that open the exchange. Never two-part. |
| rp3–rp5 | Where the demand is. **2–3 of these three are two-part.** Between them they call for a **past**, a **future or conditional**, and a **reason**. |

Rules (machine-checked by `src/data/exam/bank/patternLint.ts`, run by `authoring:check`):

- `two-part-position` / `roleplay-two-part-count` (errors): second parts only on rp3–rp5, and
  2–3 of them.
- `echo-choice` (error): no task the candidate can answer by repeating a word of the question.
  A bare "X ou Y ?" is a choice, not a task. If a choice is natural, the second part must ask
  for something beyond it (a reason, a detail).
- `trivial-closing` (error): rp5 asks for real content. Never "Autre chose ?", "C'est tout ?",
  "Ça vous convient ?", or any question "Non merci" or "Oui" fully answers.
- `roleplay-alternative` (validator error): role-play tasks have no alternatives (TN p.6).

Human rules (checklist §16):

- **Every question, second parts included, is one the examiner's role would ask.** A ticket
  clerk asks about the journey; they never ask the customer about a discount.
- Every task is answerable from the scenario plus the candidate's own invention. The candidate
  never needs a fact only the examiner could know.

`secondPartText` must not equal `mainText` (validator: `second-part-equals-main`). Both parts
must be independently answerable — Cambridge awards full marks only when both parts are
communicated, so a second part that merely rephrases the first tests nothing new.

`setup` and `examinerRegister` are validated but are **not** part of `SessionQuestionSet`/the
content hash — see `RolePlayScenario` in `types.ts`. `setup` is spoken by the UI layer before
the first task (exam-conduct §6), never routed through the conduct engine or scored.

## 6. Conversation flow — the anaphora rule

**The single most common way a natural-sounding conversation becomes an invalid exam item:**
questions are read exactly as printed, so **every question must stand alone.** No anaphora,
no reference to a previous answer.

- Invalid: *"Et ça, tu l'aimes ?"* (depends on what "ça" was — a prior answer).
- Valid: *"Aimes-tu le sport que tu pratiques le plus souvent ?"* (self-contained).

Demand rises Q1→Q5 by **cognitive demand** (concrete → abstract, present → other time
frames → justified opinion), never by **dependency** on a previous answer. Apply this rule
to role-play tasks too — T3's second part must be answerable without re-reading T1/T2.

## 7. Grammar coverage — `targetStructures`

Must describe what the text **actually elicits**, not what you hoped it would. If in doubt,
answer the question yourself in French and check which structure your answer actually
needs. The closed list (`src/data/exam/bank/types.ts`):
`present`, `perfect`, `imperfect`, `near-future`, `simple-future`, `conditional`, `opinion`,
`justification`, `comparison`, `negation`.

`present`, `perfect`, `opinion`, and `justification` arise naturally across any set. The
four that otherwise never appear — `imperfect`, `simple-future`, `comparison`, `negation` —
must each be genuinely elicited in at least 3 sets (`corpus-matrix.md`, "Time frames and
structures"); don't just tag it and hope.

## 8. Time-frame distribution

Per topic (TN pp.25–31 script pattern):

- **Q1–Q2**: short, single-part, present-tense factual questions. No alternative (validator
  `alternative-on-q1-q2`), no second part (`two-part-position`).
- **Q3–Q5**: at least one `past` and at least one `future` or `conditional` question
  (pattern lint `q3-q5-time-frames`, an authoring error), plus an opinion with a reason
  (pros and cons, or "why"). The order varies across topics; no fixed template.

The per-set lint `time-frame-monotony` (past + future somewhere in the topic) still runs as a
warning; `q3-q5-time-frames` is the stricter rule.

`expectedTimeFrame` must match what the question's wording actually cues (cue words — e.g.
"l'année dernière" → past, "l'année prochaine" → future — drive the Layer-1 time-frame
alignment detector). Do not tag `future` on a question whose French is grammatically
present-tense with no future cue. For a two-part question, tag the frame of the main part.

## 9. Alternatives (Q3–Q5) — highest risk

Topic Q3, Q4, and Q5 each require an alternative (`alternativeTexts`); Q1–Q2 and role-play tasks
never have one (validator errors `alternative-on-q1-q2`, `roleplay-alternative`).

**`alternativeTexts` holds the alternative question's ordered parts** (D9, exam-conduct §13),
not a list of separate alternatives. The engine asks `[0]`, waits for an answer, then `[1]`,
exactly like a main question's second part. So:

- A single-part main question has a one-element `alternativeTexts`.
- A two-part main question's alternative keeps the two-part shape: `[firstPart, secondPart]`
  (the notes' alternatives keep the main question's shape, TN pp.25–31). The second part may be
  the same as the main question's (e.g. both `"Pourquoi ?"`).

Rules that follow from how the engine uses them:

1. **An alternative is only ever asked after the main question has been repeated once and
   still failed.** It must be **easier and more concrete** — a different route to the same
   communicative goal, not a synonym or rewording. A reworded twin helps no candidate and trips
   lint `weak-alternative` at ≥0.8 token-set similarity against its own `mainText`.
2. **`alternativeTexts` is untagged** — it inherits the question's `expectedTimeFrame`. An
   alternative that elicits a different time frame makes that tag a lie and corrupts Layer-1
   time-frame alignment. A `past`-tagged question's alternative must still elicit a past-tense
   answer.

`furtherQuestions`: exactly 2 per topic, *tu*-register, open, on the topic's one sub-topic, and
distinct from all 5 main questions and their alternatives. Exam Sim asks them only when the
conversation lasts 3½ minutes or less; Coached always asks both (exam-conduct §15).

## 10. Tag duplication rule

Topic-level `topicArea`/`subTopic` must equal every question's own `topicArea`/`subTopic` in
that topic. `validate.ts` enforces this (`topic-area-mismatch`, `sub-topic-mismatch`), and the
backend's pydantic model mirrors it. The adapter and the content hash use the **question-level**
`topicArea`, so a mismatch would otherwise be a silent lie.

`subTopic` is a closed list per area, taken from Syl p.14 (`SUB_TOPICS_BY_AREA` in
`types.ts`; validator `sub-topic-not-in-area`). The full list is in `corpus-matrix.md`. Time
expressions, Colours, Measurements and Materials are in the list but never used as a standalone
topic (corpus lint `thin-sub-topic`).

**One sub-topic per conversation.** All five questions and both further questions stay on the
declared sub-topic (TN p.3). A topic may span two sub-topics of the same area only if its
`title` says so.

## 11. ID conventions

- Lowercase-kebab (`bad-set-id-format`/`bad-question-id-format` in the validator).
- `questionSetId`: `original-practice-0NN`.
- Question IDs: `rp1`–`rp5` (role-play), `t1q1`–`t1q5` / `t2q1`–`t2q5` (topics), matching
  `001`'s convention.
- **Immutable once seeded.** A `questionSetId` is never reassigned to different content
  (seed script's id-reuse guard: a published id may only be re-seeded if the incoming
  `content_hash` differs from the current published row's — i.e. a legitimate content
  revision, never an accidental collision). Don't renumber existing items when adding new
  ones to a set; append.

## 12. Character hygiene

- No control characters (C0/C1). The validator rejects them outright
  (`control-character`).
- Never emit U+001D/U+001E/U+001F — reserved as hash canonicalization delimiters
  (`reserved-delimiter`). You will not type these by accident; this matters only if content
  is machine-generated or pasted from a source with hidden formatting.

## 13. Apostrophe convention

Use straight ASCII `'` in all authored text, in every set.

Why this is worth doing even though the lint can't see it: `canonicalizeForMatch` folds
curly/typographic apostrophe variants (`'`, `ʼ`, `` ` ``, `´`) to straight `'` before
comparing text (`src/domain/igcse/text/normalize.ts`), so the **lint is blind to
apostrophe style** — a curly and straight version of the same sentence look identical to
`lintAuthoredContent` and `corpusLint`. But the content hash **NFC-normalizes and does not
fold** apostrophe variants, so style **is hash-affecting**: two byte-different-but-
lint-identical files produce different `content_hash` values.

The old exemption for `001` is gone: `001` was rewritten with the rest of the corpus, so its
hash changed anyway, and it follows the same convention.

## 14. Skeleton → draft → check workflow

1. `npm run authoring:skeleton -- 0NN` — emits a pre-tagged JSON skeleton (ids, `part`,
   areas, sub-topics, register, `partsExpected` slots) from the matrix row. **Fill in
   text only** — don't hand-edit ids, `part`, or slot structure.
2. Draft the role-play `setup` + 5 examiner questions, then topic 1 (5 questions), then topic 2.
3. Write alternatives for Q3–Q5 of each topic (§9), then 2 `furtherQuestions` per topic.
4. Re-read every `targetStructures` tag against what the text actually elicits (§7).
5. `npm run authoring:check -- --draft` — fixes everything **except** `not-approved`, which
   `--draft` suppresses on purpose (see below). Iterate until clean.
6. Originality check (§0) → self-review checklist (G1, §16) → linguistic review (G2).
7. Flip `review.status: approved`, set `reviewedBy: internal:<author>` (or
   `teacher:<name>` if a 0520-familiar teacher has done the exam-realism pass — see the
   S11 plan's M1/M2 distinction), set `reviewedAt`.
8. `npm run authoring:check` (no `--draft`) — the real pre-seed gate. Must be clean.

### The draft trap

`review.status !== 'approved'` is a **blocking validator error** (`not-approved`), and a
work-in-progress set is by definition not yet approved — so every draft reports ≥1 error
until you flip it to `approved`. If your checker doesn't account for that, the fastest way
to silence the noise is to flip `approved` before you're actually done — which destroys the
review discipline the gate exists to enforce.

`authoring:check --draft` exists to prevent that shortcut: it suppresses **exactly one**
error code, `not-approved`, and nothing else. Every other error and warning still fails the
check. Never flip a set to `approved` just to get a clean run — flip it because it passed
G0–G2 and (for `teacher:*`) G3.

## 15. Quality gates

| Gate | What | Blocks | Who |
| --- | --- | --- | --- |
| G0 Machine | validator 0 errors; 0 lint warnings (or justified in `review.notes`); corpus check clean; hash parity | Seed | Automated |
| G1 Self-review | checklist: tags match text; alternatives easier + frame-preserving; no anaphora | Seed | Author |
| G2 Linguistic | native/near-native French: naturalness, A2/B1 level, register | Seed | Reviewer |
| G3 Exam realism | 0520-familiar teacher, item by item | S11 exit | Teacher (deferred until sourced) |
| G4 Approval | `status: approved` + `reviewedBy` tier + `reviewedAt` | Seed | Author/reviewer |

Pilot-publishable = G0 + G1 + G2 + G4(`internal:*`). S11-complete = + G3 + G4(`teacher:*`).

## 16. Checklist before flipping `approved` (G1 self-review)

Structure (mostly machine-checked; confirm anyway):

- [ ] The set matches its `corpus-matrix.md` row: sub-topics, role-play area, register,
      two-part slots.
- [ ] `rolePlay.setup` sets the scene in the examiner's register and names the examiner's role.
- [ ] Topic-level and every question-level `topicArea`/`subTopic` agree (§10); each topic has a
      French `title`.
- [ ] Q1–Q2 of each topic: short, present, single-part, no alternative (§8).
- [ ] Q3–Q5 of each topic: an alternative each, keeping the main question's shape; at least one
      past and one future/conditional; an opinion with a reason (§8, §9).
- [ ] Every alternative is easier/more concrete than its main question and preserves its time
      frame (§9).
- [ ] 2–3 of rp3–rp5 are two-part; rp1–rp2 are not (§5).

Human judgement (no machine check can do these):

- [ ] **Every topic question and further question is on the topic's one declared sub-topic.**
- [ ] **The examiner's role could plausibly ask every role-play question, second parts
      included.**
- [ ] **No question assumes an experience a typical 15–16-year-old may not have had** (a trip
      abroad, a job, a pet, siblings). Offer a way in: "un voyage que tu as fait ou que tu
      voudrais faire". Pattern lint `assumed-experience` is only a keyword heuristic (warning).
- [ ] **Role play rp3–rp5 together call for a past, a future or conditional, and a reason.**
- [ ] No role-play task can be answered by echoing a word of the question; rp5 asks for real
      content (§5).
- [ ] No loaded negatives ("Ne penses-tu pas… ?") and no bare yes/no questions: a yes/no opener
      always has a second part.
- [ ] No question or alternative references a previous answer (§6).
- [ ] `targetStructures` describes what the text actually elicits, not aspiration (§7).
- [ ] Straight ASCII apostrophes throughout (§13).
- [ ] `provenance: 'original-practice'`; `review.notes` records the author and that the
      originality check (§0) ran clean.
- [ ] `npm run authoring:check` (no `--draft`) is clean.
- [ ] `npm run authoring:check` (no `--draft`) is clean.
