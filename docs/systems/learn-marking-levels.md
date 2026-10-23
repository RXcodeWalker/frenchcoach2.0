# Learn marking levels

How Learn's marking level (A1 · A2 · Exam standard · B1 · B2) changes **both the score and the
feedback**: a simple answer can score high at A1, the same answer scores much lower at B1, and the
feedback says what a B1 answer needs that this one lacks. Why it works this way:
`docs/decisions/0013-learn-marking-level-ladder.md`. This page is the specification; the code and its
tests are the current behavior. It is **§-numbered and live — never renumber a section** (cite as
`learn-marking §N`).

**Status: backend built, inert; frontend wired behind a flag.** The scoring code
(`backend/lib/learn_ladder.py`) and the backend wiring (`marking` field, kill switch, the two-call
Design D marking — v6 feedback, then the level checklist; see the Design D amendment at the end —
scoring before `enrich_feedback` on `/v3` and the stream) exist. The
frontend wiring (the marking dial, the `marking` field, the `levelCheck` schema, `markedScore`, the
rewards gate and sync — see the Batch 3 amendment at the end) and its copy (the needs card, the
"Checked against…" caption, the notes — see the Batch 4–5 amendment) are built behind the frontend flag
`learnMarkingLevels`, which stays `coming-soon`, so no client sends `marking` yet. Production Learn
stays on `learn-prompt-v6` until the gate in `docs/guides/learn-marking-test-protocol.md` passes (the
2026-10-19 and 2026-10-23 runs did not; see `verification-log.md`).
Every number below that is not stated by a source is `UNVALIDATED`.

**Labels used in this page.**

- **CV p.N** — CEFR Companion Volume 2020, quoted. In CV tables the upper row inside a level is its
  "plus" level; both rows count as that level's rung here. This is a reading, and should be checked.
- **Syl p.N** — Cambridge IGCSE French 0520 syllabus 2025–27. **TN p.N** — Teacher's Notes
  0520/03/TN/M/J/26. Both are cited by page and paraphrased, never quoted (ADR 0008). `rubric.ts`
  cites the J/24 Notes; the TN p.11–12 descriptors used here come from J/26.
- **UNVALIDATED** — not stated by any source. **UNCERTAIN** — the source mapping is arguable.

## §1 Why the ladder exists

An earlier approach (`learn-prompt-v7`, backend branch `claude/vigilant-faraday-nd6ms4`, never
deployed) asked the model for one holistic 0–10 score "measured against the TARGET LEVEL". A live
test showed that does not work: the level moved the score by only about 1 point, scores did not
reliably fall from A1 to B2, Exam standard scored below B1, the top of the scale went unused, and some
mistakes were reported at one level and not at another.

The cause is that nothing official turns "measured against B1" into a number. **The conversion has to
be written down and done by code.** That is what this page specifies.

### §1.1 The design in plain words

- Each skill the examiners care about has a **ladder with four rungs**, A1 → A2 → B1 → B2. Each rung
  is one sentence taken from the CEFR that can be checked from the transcript.
- The model reads the answer once and says, rung by rung, **"yes, it does this"** (quoting the
  student's words) or **"no"**.
- **The level the learner picked is never sent to the backend, and never appears in a prompt.** The
  model cannot be influenced by it, and the prompt is identical for every learner.
- The backend computes the sub-scores at all five levels. The app shows the learner's chosen level;
  the "what's missing" list is the rungs not reached at that level.

### §1.2 What this guarantees by construction

- **The marking level cannot change the mistakes, the demand verdicts or the learning evidence.**
- **Scores always fall A1 ≥ A2 ≥ Exam ≥ B1 ≥ B2.** This is arithmetic (§6.6), not model behavior.
- **Exam standard always sits between A2 and B1.**
- **"What's missing for B1" is exactly the unreached B1 rungs**, each with a short example built from
  the student's own words.
- **One model call produces all five scores.**

### §1.3 Where it sits in the architecture

It follows ADR 0002's three layers, unchanged:

- **Deterministic evidence:** the question's resolved demands decide which ladders apply (§4).
- **Constrained judgement:** the model gives yes/no verdicts with quotes (§7).
- **Deterministic guardrails:** a quote that is not in the transcript turns a "yes" into a "no"; a
  "yes" above a "no" is ignored; an answer that is off the question is capped at 2 (§6).

It is **opt-in per request** (§8.1): only Learn asks for it. Every other screen that shares the
backend `SYSTEM_PROMPT` (Story, Roleplay, Scenario Architect, Onboarding Placement, Daily News) and
every old app version stays on `learn-prompt-v6` untouched.

### §1.4 Weaknesses, stated honestly

- **The points and weights are UNVALIDATED.** No official conversion exists.
- **Borderline B1/B2 rungs will be the shakiest verdicts.** The test protocol measures exactly these.
- **The steps are coarse.** One flipped verdict moves a score by about 0.6.
- **A1 is lenient because the CEFR's A1 is lenient.** A weak on-topic answer can score about 9 at A1.
  Its mistakes are still all listed, and below Exam standard it earns no bonus XP or gems (§8.2).
- **"Which ladders apply" depends on demand tags**, and 660 of 668 are model-inferred.
- **Each call is about 25% bigger** than v6.
- **Learn scores are not Cambridge marks.** The ladder is a practice instrument built from the CEFR
  and from Cambridge's published descriptors; it does not reproduce the 0520 mark scheme.

## §2 Scope and what is left out

The ladder scheme applies to Learn's **Coach-voice** answer feedback. Examiner style is untouched and
never shows a ladder card (ADR 0005: examiner-voice feedback emits no marks).

**Left out on purpose:**

- **Fluency (CV p.142) and phonology (CV p.183–185):** pauses, false starts and pronunciation are not
  visible in a transcript, and pronunciation has its own feature. Consequence: **fluency stops being
  judged in Learn** under this scheme. Judging it needs audio, like the pronunciation feature.
- **Interaction and turntaking (CV p.139):** a Learn answer is one turn.
- **Propositional precision:** it overlaps ladder T.
- **Vocabulary control A1–B1:** it is on CV p.133, which is not in the extract.

## §3 The six ladders

### §3.1 T — Answering and developing (always applies)

| Rung | Check | Source |
|---|---|---|
| A1 | Gives at least one piece of information that answers the question (isolated phrases are fine) | CV p.62 Overall oral production A1 "simple, mainly isolated phrases about people and places"; relevance: TN p.11 lowest bands |
| A2 | A short series of relevant points; a list of simple sentences is fine | CV p.62 A2 "…a short series of simple phrases and sentences linked into a list" |
| B1 | The points come as a sequence, and at least one is developed with a detail, example or explanation | CV p.62 B1 "…presenting it as a linear sequence of points"; CV p.140 Thematic development B1. "At least one" is UNVALIDATED (TN p.11 Good band: develops ideas sometimes) |
| B2 | Main points are expanded and supported with sub-points and relevant examples | CV p.62 B2 "…expanding and supporting ideas with subsidiary points and relevant examples"; CV p.140 B2 |

### §3.2 L — Linking ideas (always applies; Coherence and cohesion, CV p.141)

| Rung | Check | Source |
|---|---|---|
| A1 | Links words or ideas with *et*, *puis* | A1 "very basic linear connectors (e.g. 'and' or 'then')" |
| A2 | Uses simple connectors such as *mais*, *parce que*, *car* | A2 "simple connectors (e.g. 'and', 'but' and 'because')" |
| B1 | Joins several short points into one connected sequence, linking across sentences (*d'abord, ensuite, après, donc, quand*) | B1 "link a series of shorter, discrete simple elements into a connected, linear sequence of points"; restated as a speaking outcome in Syl p.13. The French examples come from Syl p.26 and are UNVALIDATED as a list |
| B2 | A range of linking expressions showing contrast, consequence or concession (*cependant, par contre, alors que, même si, c'est pourquoi*) | B2 "using a range of linking expressions and cohesive devices"; B2+ "mark clearly the relationships between ideas" |

### §3.3 O — Opinions and reasons (only when invited, §4; Putting a case, CV p.64)

| Rung | Check | Source |
|---|---|---|
| A1 | No requirement | CV p.64 gives no A1 descriptors |
| A2 | An opinion or preference in simple terms (*j'aime, je préfère, je pense que, c'est…*). **If the question explicitly asks why** (`justification` tag, e.g. *Pourquoi ?*), the answer must also give a simple reason | A2 "present their opinion in simple terms"; A2+ "explain what they like or dislike about something, why they prefer one thing to another, making simple, direct comparisons" |
| B1 | At least one reason or explanation for an opinion, plan or action | B1 "briefly give reasons and explanations for opinions, plans and actions"; Syl p.13; TN p.11 Good band |
| B2 | A developed viewpoint: a chain of reasons, or advantages and disadvantages | B2 "construct a chain of reasoned argument … advantages and disadvantages of various options" |

### §3.4 F — Past, future and imagined (only when invited, §4; Describing experience, CV p.62–63)

F has two parts, and **only the parts the question asks for are checked**:

- the **past part**, when `timeFrames` includes `past`;
- the **future/imagined part**, when it includes `future` or `conditional`. These count as one part,
  and either verb form is accepted.

A past-only question is never marked down for leaving out the present or the future. The code picks
the rung wording the model sees from the question's time frames.

| Rung | Past part (e.g. hol_01) | Future/imagined part (e.g. fut_19) | Source |
|---|---|---|---|
| A1 | No requirement | No requirement | A1 descriptors cover only the present (CV p.63) |
| A2 | Talks about the past event the question asks about, in a past form (a wrongly formed verb counts under Accuracy) | Talks about the plan or wish asked about, in a future or conditional form | A2 band "describe plans and arrangements, habits and routines, past activities and personal experiences"; "briefly describe what they plan to do … during the holidays" |
| B1 | A detailed account that says how they felt or reacted | Describes hopes, ambitions or the imagined situation in some detail | B1 "detailed accounts of experiences, describing feelings and reactions"; "describe dreams, hopes and ambitions"; "describe events, real or imagined"; Syl p.13 |
| B2 | Explains the personal significance of the experience in detail | Speculates about causes or consequences | CV p.62 B2 "describe the personal significance of events and experiences in detail"; CV p.174 B2 "speculate about causes, consequences, hypothetical situations". UNCERTAIN: no scale covers hypotheticals below B2 |

When a question asks for both parts (e.g. "Qu'as-tu fait le week-end dernier et que feras-tu le
week-end prochain ?"), a rung is met only when both parts meet it.

### §3.5 R — Range of language (always applies; General linguistic range CV p.130–131, Vocabulary range CV p.131)

| Rung | Check | Source |
|---|---|---|
| A1 | Simple expressions and one-clause sentences on the topic | A1 "basic structures in one-clause sentences with some omission or reduction of elements" |
| A2 | Complete basic sentence patterns with everyday topic vocabulary | A2 "basic sentence patterns … about themselves and other people, what they do, places, possessions"; VR A2 |
| B1 | Varied topic vocabulary, and some sentences with more than one clause (*qui, que, quand, si, parce que*) | B1 "enough language to get by … on topics such as family, hobbies…"; VR B1 "good range of vocabulary related to familiar topics". The more-than-one-clause test is UNVALIDATED (read as the step up from A1's "one-clause") |
| B2 | Some complex sentence forms and varied wording. **The examples are only examples;** any complex form counts, and no particular tense or structure is ever required (*si* + imperfect/conditional, *dont/ce que*, *en* + present participle, pluperfect) | B2 "using some complex sentence forms"; VR B2 "vary formulation to avoid frequent repetition"; examples from Syl p.25–26 |

### §3.6 A — Accuracy (always applies; Grammatical accuracy CV p.132)

| Rung | Check | Source |
|---|---|---|
| A1 | Some simple structures are correct (*je suis, j'ai, il y a*) | A1 "limited control of a few simple grammatical structures" |
| A2 | Despite basic mistakes, it is usually clear what the student means | A2 "…systematically makes basic mistakes; nevertheless, it is usually clear what they are trying to say" |
| B1 | Everyday patterns are mostly correct (common verbs, common agreements, the tense the question asks for); errors are mainly in more ambitious structures | B1 "uses reasonably accurately a repertoire of frequently used 'routines' and patterns"; the ambitious-error allowance comes from CV p.132's intro |
| B2 | No mistake causes misunderstanding; slips are occasional | B2 "relatively high degree of grammatical control. Does not make mistakes which lead to misunderstanding" |

**Speech rule for the A ladder.** The transcript comes from speech recognition, so a word spelled
differently but *sounding the same* is never counted against Accuracy. This follows Learn's existing
sound-alike rule (`stt/homophones/`, `alignRecognisers.ts`); do not introduce a second rule.

## §4 Which ladders apply

**The rule.** The criteria change with the question, and **no ladder ever asks for a tense, an
opinion or a structure that the question does not ask for.**

- **The marking level decides *how well*** each asked-for thing must be done.
- **The question decides *which* things are asked for.**
- v6's unsourced rule "8+ only with multiple tenses" is gone, and nothing replaces it.

This is decided by code from the question's resolved demands — never by the model and never by the
marking level.

- **T, L, R, A:** always.
- **O:** when `structures` includes `opinion`, `justification` or `comparison`; or when
  `cognitiveDemand` is `justify`, `compare` or `hypothesize`. A plain `explain` does **not** invite O
  (example: `sch_03` "Comment tu vas à l'école ?" is tagged `explain` but asks for no opinion).
- **F:** when `timeFrames` includes `past`, `future` or `conditional`.
- **Unresolved demands** (follow-up questions, `demandsVersion` mismatch): T, L, R and A only. Never
  fail a learner on something the question may not ask.

| Question | Ladders that apply |
|---|---|
| fam_01 | T L R A |
| hol_01 | T L F R A |
| sch_03 | T L R A |
| env_05 | T L O R A |
| fut_19 | T L O F R A |

## §5 Exam standard

TN p.11–12: the descriptors are read at "A2 with elements of B1". Exam standard is therefore not a
single rung but a per-ladder requirement:

| Ladder | Exam requires | Source |
|---|---|---|
| L linking | **B1** | Syl p.13: link short points into a connected sequence |
| O reasons | **B1** | Syl p.13: brief reasons for opinions and plans; TN p.11 Good/Very good bands |
| F past/future | **B1** | Syl p.13: past events and experiences, hopes and ambitions |
| A accuracy | **B1** | Syl p.13 "reasonable accuracy"; TN p.12 puts "frequent errors" in the middle Quality-of-Language band. Without this, a weak 4-error answer outscored a correct simple one at Exam (7.3 vs 7.1) |
| T developing | A2 | TN p.11 asks for development only "sometimes" |
| R range | A2 | TN p.12 Good band: "a range of structures" with some errors. UNCERTAIN |

The other four levels require their own rung on every ladder (A1 → rung 1, A2 → 2, B1 → 3, B2 → 4).

## §6 From verdicts to a score (all numbers UNVALIDATED)

1. **How high each ladder climbs.**
   - `reached` = the highest level up to which every rung is met.
   - O and F have no A1 rung, and that missing rung counts as met. `null` is allowed only there; any
     other `null` counts as "no".
   - A "yes" above a "no" is ignored.
   - A "yes" whose quote is not in the transcript becomes a "no". Matching ignores case, accents,
     apostrophe style and spacing, and checks each "…"-separated fragment separately.
2. **Points per ladder: gap = required rung − reached rung** (no rung met = rung 0).

   | Gap | Meaning | Points |
   |---|---|---|
   | ≤ −1 | Above the requirement | 10 |
   | 0 | Exactly the requirement | 8 (10 when the requirement is B2, the top) |
   | 1 | One rung short | 5 |
   | 2 | Two rungs short | 2.5 |
   | ≥ 3 | Three or more short | 1 |

   "Meets ≈ 8, beyond ≥ 8.5" is the anchor approved in v7.
3. **Sub-scores, per level:**
   - `comm` = mean of the applicable T/O/F points;
   - `fluency` = L;
   - `know` = R;
   - `acc` = A.

   They are sent **unrounded**. The overall is the client's unchanged `computeOverall`
   (`src/domain/scoring.ts`: mean, rounded half up), so there is one formula and no Python/JS rounding
   drift. Equal weights are UNVALIDATED; Cambridge splits 50/50 between Communication and Quality of
   Language.
4. **Relevance cap.** If T-A1 is not met, every sub-score is capped at 2 (TN p.11 lowest bands).
5. **`cefrLevel`** is derived as the highest of A1–B2 whose overall is ≥ 8, or A1 if none. "Exam" is
   never a `cefrLevel`.
6. **Why the order is guaranteed.**
   - The requirement never drops along A1 → A2 → Exam → B1 → B2 on any ladder, and Exam sits between
     A2 and B1 on each one.
   - Points never rise as the requirement rises.
   - The cap and the set of ladders that apply do not depend on the level.
   - A property test runs every combination.

### §6.1 "What your answer needs for <level>"

Coach voice only; **never in Examiner style**. For each applicable ladder below its requirement, the
list shows:

- the next rung's learner sentence, marked "first step" when the answer is two or more rungs short;
- the model's example of at most 20 words, built from the student's own words.

The order is T, O, F, L, A, R, with at most 3 shown (UNVALIDATED). The list is empty when the answer
meets the level. Model-written text passes a **drop-only** filter: an over-long, empty or copied
example is dropped, never rewritten.

## §7 What the model returns (ladder scheme only, level-blind)

These change from v6; everything else stays as in v6 (errors, strengths, `improved_answer` at exam
standard, the teacher voice, the filters).

- **Removed from the model's reply:** `fluency`, `scores` and `cefrLevel`. Code fills them in.
- **New, required: `levelCheck`.** For each applicable ladder: `["y"|"n"|null ×4]`, plus a `quote`
  for the highest "y" and a `next` example for the first "n".
- **New, required: `demandCheck {met, quote}`.** It checks the question's own "A complete answer
  must: …" line, for the demand-evidence fix (§9.2). With no such line (unresolved demands) the
  model returns `{"met": null, "quote": ""}`. Unlike a bad `levelCheck`, a missing or malformed
  `demandCheck` does not fail the reply: it is relayed as `null` and logged (gate G11 counts it).
- **The backend adds:**
  - `scores`, `fluency` and `cefrLevel` at Exam standard;
  - `levelCheck {scheme, ladderVersion, applies, reached, subScoresByLevel{A1,A2,exam,B1,B2}, needsByLevel}`;
  - `answered_the_question` (the T-A1 verdict);
  - `promptVersion`.

## §8 How the score flows into the app

### §8.1 Opt-in and the unchanged readers

- Only Learn opts in, through a request field `marking: "ladder-v1"`. Any other value is a 422. A
  backend kill switch (`LEARN_LADDER_ENABLED`) makes the field ignored, falling back to v6.
- A request that also uploads audio stays on v6: its Gemini call uses the multimodal prompt, which
  the ladder leaves untouched (Learn never uploads audio to feedback).
- A reply without a usable `levelCheck` fails inside the provider call, so `/v3`'s Groq → Gemini
  chain moves on. The stream has no second provider: it ends with an `error` event and Learn falls
  back to `/v3` (same quota key, so no second charge).
- The level the learner picked never leaves the device and is never in the request body
  (`buildDifficultyContext` is unchanged).
- The backend always fills the existing `scores` at **Exam standard**, so **nothing that reads the
  score today changes**: `Session.score` and `bestScore`; topic average, mastery and unlock; SM-2
  review; mid-session ease/raise; belief evidence and evidence text; the coach profile and decision
  engine; Supabase sync; the notebook offer.

  Picking strict or lenient marking therefore never changes what comes next, when it comes back, or a
  topic average.

### §8.2 What reads the chosen level

Only what the learner **sees and earns**, through one helper,
`markedScore(fb, strictness)` = `computeOverall(levelCheck.subScoresByLevel[level])`:

- the score on the answer;
- the "needs for <level>" card;
- XP bonus and gems, in both XP call sites (`Learn.tsx` and `sessionOrchestrator.ts`), gated: **below
  Exam standard, no bonus XP or gems** (owner decision, 2026-10-18);
- score achievements and the answer streak (gated the same way);
- the session summary and its confetti.

Learn's in-session state keeps `bestScore` = Exam (it feeds `midSessionAdjust`) and adds
`bestMarkedScore` for display.

### §8.3 Fallback and comparability

- **Without `levelCheck`** (kill switch, offline, old backend), the app shows the Exam score with
  "Level marking unavailable — marked at Exam standard".
- **Exam-standard scores move.** Good answers rise (about 9–10, against v6's 6.8); weak ones fall
  slightly (about 5–6.5). History is not rescaled. New attempts carry `markingVersion: 'ladder-v1'`
  in the synced feedback blob.
- **Effects to accept:** topic averages drift and gems/mastery become reachable for strong answers.
  That fixes "top of scale unused" but shifts the economy (a `shop-economy.md` amendment, appended,
  never renumbered).
- The Full report's four sub-scores are relabelled when `levelCheck` is present: Answering / Range /
  Accuracy / Linking.

## §9 Worked examples and a known side finding

### §9.1 Three sample answers checked against the ladders

**Ex 1 — fam_01 "Décris ta famille." (simple but correct).** Ladders: T L R A.

> Dans ma famille, il y a quatre personnes : mon père, ma mère, mon frère et moi. Mon père est
> grand. Ma mère est très gentille. Mon frère a dix ans.

| Ladder | Verdicts | Reached |
|---|---|---|
| T | A1 ✓, A2 ✓, B1 ✗ (nothing developed) | A2 |
| L | A1 ✓ ("mon frère et moi"), A2 ✗ | A1 |
| R | to A2 ✓, B1 ✗ | A2 |
| A | all ✓ | B2 |

| A1 | A2 | Exam | B1 | B2 |
|---|---|---|---|---|
| **9.5** | 7.8 | 7.1 | 5.6 | **4.0** |

Needs for B1: develop a point (*Mon père est grand et il travaille comme…*); first step: *mais/parce
que* (*Ma mère est gentille mais un peu stricte*); a two-clause sentence (*J'ai un frère qui a dix
ans*).

**Ex 2 — hol_01 "Où es-tu allé(e) pendant les dernières vacances ?" (weak, 4 seeded errors).**
Ladders: T L F R A.

> Pendant les vacances je vais en France avec mon famille. Je mange des croissants et je visite la
> Tour Eiffel. C'est très bien.

| Ladder | Reached | Why |
|---|---|---|
| T | A2 | |
| L | A1 | |
| F | A1 | A2 ✗: present tense throughout; F has no A1 rung |
| R | A2 | |
| A | A2 | B1 ✗: routine passé composé and *ma famille* wrong |

| A1 | A2 | Exam | B1 | B2 |
|---|---|---|---|---|
| **9.3** | 6.9 | 5.2 | 4.1 | **1.9** |

All four mistakes are listed at every level. Needs for Exam: first step for F: tell it in the past
(*je suis allé(e)… j'ai visité…*); first step for L: *mais/parce que*; accuracy: everyday patterns
(*ma famille*, passé composé). 9.3 at A1 is the design working, because A1 does not ask for the past;
§8.2 means it earns no bonus.

**Ex 3 — env_05 "Que penses-tu du recyclage ?" (strong B1).** Ladders: T L O R A.

> Je pense que le recyclage est très important parce qu'il protège la planète. Chez moi, on trie le
> plastique, le verre et le papier, et ma mère apporte les bouteilles au centre de recyclage le
> samedi. D'abord c'était un peu ennuyeux, mais maintenant c'est une habitude. Par contre, je trouve
> qu'il y a trop d'emballages dans les supermarchés, donc il faudrait les réduire.

| Ladder | Reached | Note |
|---|---|---|
| T | B1 | B2 borderline → ✗ |
| L | B2 | |
| O | B1 | B2 borderline → ✗ |
| R | B1 | |
| A | B2 | |

| A1 | A2 | Exam | B1 | B2 |
|---|---|---|---|---|
| **10** | 10 | 9.8 | 9.0 | **7.5** |

Needs for B1: nothing. Needs for B2: examples and sub-points; advantages and disadvantages, or a
chain of reasons; a complex sentence form.

**For comparison:** v6/v7 means at Exam were 5.1 (weak) and 6.8 (strong). Further cases at Exam: a
one-sentence answer with no connector 6.0; a weak 4-error answer with "mais" 6.5; a typical A2 answer
with 1–2 slips 6.9; off-topic 2.0.

### §9.2 Side finding: Learn's AI demand evidence ("L2") has never worked in production

Three separate breaks each stop it on their own:

- **The prompt makes the keys optional, and skippable in practice.** `answered_the_question`,
  `demands_met` and `demands_missed` are OPTIONAL and "omitted unless QUESTION DEMANDS was provided
  above". That section sits in the user message, after the system prompt, so nothing is ever above.
  The REMINDER never asks for these keys.
- **The backend never sets `demandsResolved`**, which is the client's on-switch
  (`evidenceProjection.ts`).
- **The formats do not match.** The client looks for the demand id (`'justify'`); the prompt asks for
  free text.

Also: the cache key ignores `questionId` and `demandsVersion`, and no harness was committed for the
earlier check, which may never have rendered QUESTION DEMANDS (it needs `questionId` plus an exactly
matching `demandsVersion`).

The ladder scheme's `demandCheck` (§7) is the fix, behind its own backend switch
`LEARN_L2_DEMAND_VERDICTS` (default off): `demandCheck` → `demands_met`/`demands_missed:
[cognitiveDemand]` + `demandsResolved: true`, level-blind by construction. Turning it on is a real
behavior change — L2 is the only path that records a demand failure, so some learners' ability
estimates will move down — and it goes on only after `adaptiveSimulation` scenarios with L2 events, a
one-day log check, and the owner's OK. Rolling back is the switch; evidence already written stays,
because the log is append-only.

## §10 Defaults still open

All UNVALIDATED, changeable by the owner: points 10/8/5/2.5/1; equal sub-score weights; at most 3
"needs" items; relevance cap 2; `cefrLevel` = highest level ≥ 8.

**Known blind spots.**

- **Daily capacity.** Production on the 200k-tokens/day tier can AI-mark only about 40 Learn answers a
  day in total, fewer with the ladder scheme. Fine with no users; a launch blocker for real users.
- **Demand tags decide what applies**, and 660 of 668 are inferred. A lint flagging question text
  whose cues (*pourquoi, penses-tu, aimerais-tu*) disagree with its tags would catch mis-tags like
  `sch_03`; it is a candidate for the question-levels batch.

## Amendment: Batch 3 — frontend wiring (2026-10-20)

Built behind `learnMarkingLevels` (`src/config/featureFlags.ts`, default `coming-soon`; try it with
`?ff_learnMarkingLevels=live`). With the flag off Learn is exactly the old path: no `marking` field,
no dial, every score at Exam standard.

- **The dial.** `AppState.markingLevel` (`A1 · A2 · exam · B1 · B2`, default `exam`), written by
  `SET_MARKING_LEVEL` to the identity-scoped raw key `frenchCoach_markingLevel`, mirrored across tabs
  like `aim`. Shown on Learn's setup screen in the Coach style only (the Examiner style shows no
  score). It never leaves the device: it is in no request body, sync row or prompt. The existing Aim
  control (Comfortable / Balanced / Push) is the question-level dial; it is unchanged (owner,
  2026-10-20).
- **The request.** Learn alone passes `marking: 'ladder-v1'` to `getAIFeedback`/`streamFeedback`
  (the last argument); every other caller omits it. `buildDifficultyContext` is unchanged.
- **The reply.** `feedbackSchema.ts` validates `levelCheck` (`.catch(undefined)`: a malformed one
  degrades to "no level marking", never a failed reply; a malformed needs list empties only that
  level) and `promptVersion`; `mergeV2Fields` copies both and stamps `markingVersion: 'ladder-v1'`,
  which `sessionSync.ts`'s `stripFeedback` keeps. `levelCheck` itself is not synced.
- **One helper.** `src/domain/learn/marking/markingLevel.ts`'s `resolveMarkedScore`/`markedScore`
  (§8.2); Learn calls it once per answer through `features/learn/markingLevel.ts`'s
  `scoreLearnAttempt`, which returns the Exam-standard bookkeeping score and the marked one.
- **What reads the marked score:** the score line and the Full report (grid relabelled Answering /
  Range / Accuracy / Linking on a ladder reply, at the chosen level); XP in both sites (Learn's
  `Session.xpEarned` and the orchestrator's `awardXP`, via the new `reward` input); score
  achievements; the answer streak; `bestMarkedScore` for the progress bar, the mid-session toast, the
  session summary and its confetti. `Session.score`, `bestScore`, topic mastery, SM-2 review,
  mid-session adjust, evidence and the notebook offer stay on the Exam score
  (`markingLevelIndependence.test.ts` runs one reply through all five levels).
- **Interpretations of §8.2, chosen here.** *No bonus XP or gems* below Exam standard means the
  answer earns exactly participation XP and gems (`computeXPGain(…, { scoreCounts: false })` ==
  `computeParticipationXPGain`): the score bonus and the +5 gem bonus go, the base gems stay, so a
  lenient level never earns less than an ungraded answer. Below Exam standard the answer streak
  *holds* (neither extends nor breaks), like an ungraded answer. `awardXP`'s own copy of the gem
  bonus now goes through `scoreGemBonus`, the same rule.
- **Fallback (§8.3).** Without a `levelCheck` (kill switch, offline, old backend) the score line says
  "Level marking unavailable — marked at Exam standard" and rewards count as at Exam standard. The
  rest of the copy (the needs card, "Checked against the B1 ladder") is Batch 4.

**Rollback.** Keep the flag `coming-soon` (or set it back); the stored level is then ignored.

## Amendment: Batches 4–5 — copy and the needs card (2026-10-23)

Same flag, same rollback: with `learnMarkingLevels` off nothing below renders, because every piece is
gated on a `markingLevel` that Learn passes only while the flag is live.

- **Where the words live.** `src/domain/learn/marking/markingCopy.ts` — pure, no prompt, request,
  evidence or reward ever reads it. It holds the level names (the raw `exam` key is never shown), the
  captions and notes below, and `buildLevelNeedsView`, the needs card's view model.
- **The needs card (§6.1).** `features/feedback/components/LevelNeedsCard.tsx`, in the Coach
  conversation directly under the score line: "What your answer needs for <level>", the backend's
  unreached rungs at that level in the backend's order, at most `MAX_NEEDS_SHOWN` (3), each with its
  learner sentence, a "First step" tag when `firstStep`, and the model's example. Nothing missing →
  "This answer meets <level>". No `levelCheck` or an ungraded answer → the card renders nothing (the
  score line carries the note). Model-written text is **drop-only**: a blank item is skipped and a blank
  example is shown as none — never rewritten — and a list whose items were all dropped says nothing
  rather than claiming a pass. The card is **Coach style only**: it is rendered by `FeedbackExperience`,
  while the Examiner style goes through `LearnExaminerFeedback`, which is never given a marking level
  (guarded by `markingCopy.test.ts`; ADR 0005).
- **Captions.** The score line says "Checked against the B1 ladder" (or "…Exam standard"); with no
  `levelCheck` it keeps "Level marking unavailable — marked at Exam standard" (§8.3); an ungraded
  (offline) attempt says "Not graded, so your marking level was not applied." Exam standard is
  explained in the card — "blends A2 and B1 … a practice score, not a Cambridge mark" (§1.4, §5) — and
  that sentence is shown even when nothing is missing at Exam standard.
- **Premium UI (Batch 5).** Scoped to the surfaces this feature added: the needs card (header tile,
  an accent rail on "First step" items, quoted examples, a staggered reveal that only fades under
  reduced motion) and the caption pill. Colour is role tokens only (`lightContrast`/`tokenContrast`
  pass); checked in dark and light at 360 px and 900 px with no horizontal overflow. The setup-screen
  dial was left as is: it already matches the Aim and Feedback-style controls beside it, and restyling
  one of three siblings would make the screen inconsistent.

**Gate status is unchanged.** The 2026-10-19 Stage 2 run did not pass (G4, G11, G12; Stage 3 not run —
`verification-log.md`), so the flag stays `coming-soon`. Nothing in these batches changes that.

## Amendment: Design D — two calls (2026-10-23)

The one-call design failed the gate twice (`verification-log.md`, 2026-10-19 and 2026-10-23), mainly on cost and on
the size of a single request. On the owner's decision the backend now marks a `ladder-v1` request with the protocol's
fallback, Design D (ADR 0013 amendment). Nothing in §3–§6 (rungs, which ladders apply, Exam standard, points,
ordering) changes; these sections change as follows.

- **§1.2 "One model call produces all five scores"** becomes: two calls produce them — Learn's unchanged v6 feedback
  call, then a level checklist at temperature 0. The level still never reaches either call.
- **§1.4 "Each call is about 25% bigger than v6"** becomes: each answer costs about 6,800–8,800 tokens across the two
  calls (2026-10-23 smoke runs), against ~5,000 for v6 alone.
- **§7 What the model returns.** The feedback call returns v6's reply, unchanged; its own `scores`, `fluency` and
  `cefrLevel` are overwritten as before. The checklist returns only `levelCheck` and `demandCheck`, in the shapes §7
  describes. It sees the question, the transcript, the question's demands (no CEFR demand level, no session target,
  no DETERMINISTIC SIGNALS), the rungs, and the errors the feedback call found (each quote once, only quotes found in
  the transcript). Accuracy rungs 3–4 count that list (the interpretation A-B1-B2 in the test set: up to two errors
  meet B1, up to one meets B2; a sound-alike spelling never counts); rungs 1–2 do not count errors. The reply's
  `promptVersion` names both prompts (`learn-prompt-v6+ladder-check-v2`).
- **§8.1 fallback.** A checklist with no usable `levelCheck` moves to the other provider, as before. When no provider
  returns one, the reply is no longer a failure: the v6 feedback is served without `levelCheck` (§8.3's "Level
  marking unavailable — marked at Exam standard") and is not cached. The stream sends its sections as v6 writes them,
  hides v6's score snapshot, and runs the checklist before `complete`.
- **Rung wording** (the judge's, not the learner's) was made more checkable in the 2026-10-23 iteration and carried
  into the checklist: T-B1 says what counts as development; L-A1 counts any *et*/*puis*; R-B1 reads "some sentences"
  as at least two sentences with a subordinate clause; O-B1 and F (future) B1 say what is not a reason or not detail.
  None is meant to change a rung's meaning; R-B1's "at least two" is the nearest to the line and awaits the owner's
  check.

