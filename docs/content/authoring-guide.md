# S11 Authoring Guide — Original IGCSE French 0520 Question Bank

Content contract for `backend/data/igcse/original-practice-*.json`. Applies to every set
from `002` onward; `001` is the frozen architecture-proof set (see the apostrophe note in
§9 for why it is exempt from one rule).

This guide is normative for `npm run authoring:check`. If the checker and this guide ever
disagree, the checker is a bug — file it, don't route around it by re-approving a set.

## 0. Before you write anything

- Read `docs/architecture/04-frontend-pipeline.md` §6.4 (question authenticity/copyright)
  and §6.5 (examiner-simulation conduct rules). Both shape what a valid item looks like.
- Read `docs/content/corpus-matrix.md` and find your set's row: pair, role-play area,
  archetype, time-frame template, rare-structure targets.
- **Clean-room only.** Author from the public syllabus and §6.4 above. Never open, quote,
  paraphrase, or "recall" a Teacher's Notes booklet or past paper. If you have ever seen the
  June 2024 TN booklet, do not author from memory of it — draft independently and let the
  originality review catch accidental overlap. See §3 (Originality) below.

## 1. Wording style

- **Role-play tasks**: imperative instruction style, addressed to the candidate, in French
  — "Saluez…", "Demandez…", "Dites que…" (mirrors 001; see §6.4's instruction-style examples).
- **Topic questions**: direct questions, `tu`-register — "Que fais-tu…?", "As-tu déjà…?".
- **One communicative goal per question.** A second goal is never bolted on with a comma —
  it requires `partsExpected: 2` and a distinct `secondPartText` instead.
- **Examiner tone**: neutral, non-leading. Never hints at the "right" answer.

## 2. Vocabulary level

CEFR **A2 with elements of B1** (`01-cambridge-rubric-source.md` §1.3). Concrete, everyday
vocabulary; grammatical complexity may reach B1 (e.g. conditional, comparison) but the
*lexis* should stay accessible to a strong A2 candidate. If a question needs a gloss to be
understood, it's pitched too high.

## 3. Register

`tu`-register throughout — every question, alternative, and further question (§6.5). The
examiner voice is self-sufficient: because questions are **read exactly as printed** with
repetition allowed but rephrasing forbidden, a question must never lean on how it "would
obviously be asked out loud." Write it the way it will be read.

## 4. Length

- Topic questions: ≤ ~12 words.
- Role-play tasks: ≤ ~15 words.
- `secondPartText`: short — model it on `001`'s `"Pourquoi ?"` / role-play `rp3`'s
  `"Demandez aussi s'il y a une réduction pour les étudiants."` Long enough to stand alone
  as a prompt, never a restatement of `mainText`.

## 5. Role-play structure (T1–T5)

Five transactional tasks per scenario, TN instruction style, in this fixed functional order:

| Task | Function |
| --- | --- |
| T1 | Greet + state purpose |
| T2 | Give a specific detail (time, number, preference) |
| T3 | **Choose between two options** — the natural two-part slot |
| T4 | Ask the examiner a question |
| T5 | Thank + close |

Exactly **1–2** tasks per scenario carry `partsExpected: 2`. `secondPartText` must be short
and must not equal `mainText` (validator: `second-part-equals-main`). Both parts must be
independently answerable — Cambridge awards full marks only when both parts are
communicated, so a second part that merely rephrases the first tests nothing new.

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
corpus matrix (§ below) deliberately places the four that otherwise never appear —
`imperfect`, `simple-future`, `comparison`, `negation` — check your set's row and make sure
at least one question genuinely exercises your assigned structure(s); don't just tag it and
hope.

## 8. Time-frame distribution

Every topic (5 questions) must exercise **past AND future** at minimum — the lint rule
`time-frame-monotony` is a hard machine check, but hitting it exactly means you also hit
`present` since three progression templates all include it. Use the template assigned to
your topic by the corpus matrix:

| Template | Q1 | Q2 | Q3 | Q4 | Q5 |
| --- | --- | --- | --- | --- | --- |
| P0 | present | present | past | present (opinion) | future |
| P1 | present | past | present (opinion) | future | conditional |
| P2 | present | future | past | conditional | present (opinion) |

`expectedTimeFrame` must match what the question's wording actually cues (cue words — e.g.
"l'année dernière" → past, "dans le futur" → future — drive the S2 Layer-1 time-frame
alignment detector). Do not tag `future` on a question whose French is grammatically
present-tense with no future cue.

## 9. Alternatives (Q3–Q5) — highest risk

Topic Q3, Q4, and Q5 each require **≥1 alternative** (`alternativeTexts`). Two rules follow
directly from how the examiner conduct engine uses them (§6.5):

1. **An alternative is only ever asked after the main question has been repeated once and
   still failed.** It must therefore be **easier and more concrete** — a different route to
   the same communicative goal, not a synonym or rewording of the same question. A reworded
   twin helps no candidate and trips lint `weak-alternative` at ≥0.8 token-set similarity
   against its own `mainText`.
2. **`alternativeTexts` is untagged** — it silently inherits the question's
   `expectedTimeFrame`. An alternative that elicits a different time frame makes that tag a
   lie and corrupts Layer-1 time-frame alignment for anyone who answers via the alternative.
   A `past`-tagged question's alternative must still elicit a past-tense answer.

`furtherQuestions`: exactly 2 per topic, `tu`-register, open, on-topic, and distinct from
all 5 main questions and their alternatives (examiner conduct engine caps further questions
at 2 per topic, asked in order — never improvised, §6.5).

## 10. Tag duplication rule

**Topic-level `topicArea`/`subTopic` must equal every question's own `topicArea`/`subTopic`
in that topic.** Nothing in `validate.ts` checks this — `validateTopic` only requires
question-level presence — and the content hash and the adapter both use the
**question-level** value, so a topic-level mismatch is a silent lie that the machine gate
will not catch. The corpus check (`corpusLint.ts`'s `topic-area-mismatch` /
`sub-topic-mismatch` rules) is what catches it. Set both consistently from the start;
don't rely on the checker to find you a shortcut.

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

Use straight ASCII `'` in all authored text, in every set from `002` onward.

Why this is worth doing even though the lint can't see it: `canonicalizeForMatch` folds
curly/typographic apostrophe variants (`'`, `ʼ`, `` ` ``, `´`) to straight `'` before
comparing text (`src/domain/igcse/text/normalize.ts`), so the **lint is blind to
apostrophe style** — a curly and straight version of the same sentence look identical to
`lintAuthoredContent` and `corpusLint`. But the content hash **NFC-normalizes and does not
fold** apostrophe variants, so style **is hash-affecting**: two byte-different-but-
lint-identical files produce different `content_hash` values.

`001` already has one inconsistency (`t2q3`'s `l'étranger` uses a curly `'` against 7
straight instances elsewhere in the set) — confirmed harmless today because the TS fixture
and the canonical JSON agree on all 28 hashed strings, so no online/offline divergence
exists. **Leave `001` alone.** Fixing its apostrophe would change its hash, and per §11 a
`questionSetId`'s content is never silently revised — that would trigger the id-reuse guard
for zero product benefit. New sets simply don't inherit the inconsistency.

## 14. Skeleton → draft → check workflow

1. `npm run authoring:skeleton -- 0NN` — emits a pre-tagged JSON skeleton (ids, `part`,
   areas, `partsExpected` slots, time-frame template tags) from the matrix row. **Fill in
   text only** — don't hand-edit ids, `part`, or slot structure.
2. Draft the role-play (5 tasks), then topic 1 (5 questions), then topic 2.
3. Write alternatives for Q3–Q5 of each topic (§9), then 2 `furtherQuestions` per topic.
4. Re-read every `targetStructures` tag against what the text actually elicits (§7).
5. `npm run authoring:check -- --draft` — fixes everything **except** `not-approved`, which
   `--draft` suppresses on purpose (see below). Iterate until clean.
6. Self-review checklist (G1) → linguistic review (G2) → independent originality review.
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

## 16. Checklist before flipping `approved`

- [ ] Topic-level and every question-level `topicArea`/`subTopic` agree (§10).
- [ ] Every topic exercises past + future (+ present via the template) across its 5
      questions.
- [ ] Q3–Q5 of both topics each have ≥1 alternative; every alternative is easier/more
      concrete than its main question and preserves the main question's time frame (§9).
- [ ] No question or alternative references a previous answer (§6).
- [ ] 1–2 role-play tasks carry `partsExpected: 2`; `secondPartText` is short, distinct
      from `mainText`, independently answerable.
- [ ] `targetStructures` describes what the text actually elicits, not aspiration (§7).
- [ ] Archetype is unique in the corpus (check `corpus-matrix.md`).
- [ ] Straight ASCII apostrophes throughout (§13).
- [ ] `provenance: 'original-practice'`; `review.notes` records author + clean-room
      attestation (§3).
- [ ] `npm run authoring:check` (no `--draft`) is clean.
