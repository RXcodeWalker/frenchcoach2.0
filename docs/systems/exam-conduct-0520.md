# Exam Conduct — Cambridge 0520/03 Speaking

> **This is a live specification, not a plan.** Its `§`-numbered sections are cited from code
> and tests as `exam-conduct §N`. **Do not renumber sections.** Add new ones at the end.

What the simulated examiner must do, and how Exam Sim and Coached Practice differ. The engine
that implements it is `src/domain/igcse/session/conductEngine.ts`, driven by
`src/services/exam/simulationSession.ts`. Scoring is out of scope: see `assessment-engine.md`.

## Sources and how they are cited

- **TN p.N**: Cambridge IGCSE French 0520/03 *Teacher/Examiner Notes*, June 2026. The page numbers
  are the booklet's printed page numbers.
- **Syl p.N**: Cambridge IGCSE French 0520 syllabus, 2025–2027.

Both are cited **by page only**. No script wording from the notes (role-play scenarios,
questions, topic scripts) is reproduced here or anywhere in the repo, and the booklet itself is
never committed. The notes are confidential to centres.

**Rule** means something the notes or syllabus state. **App policy** means a choice the notes
leave open. App policy is labelled as such, and any threshold it uses is `UNVALIDATED` until it
is checked against real recordings (CLAUDE.md rule 5: no graded corpus is assumed).

**Status** records where each rule is enforced. "Planned (Batch N)" refers to the 0520 conduct
plan's batches. Update the status in the same change that implements the rule.

---

## Structure of the test

### §1 — Parts and order

**Rule.** 10 minutes of preparation, then: greeting (about 30 s, not assessed) → role play (about
2 min) → topic conversation 1 (4 min) → topic conversation 2 (4 min). About 10 minutes in all
(TN p.1, p.3, p.6 #3–4; Syl p.19).

**Status.** Enforced. The engine runs role play → topic 1 → topic 2 (`startConduct`,
`advanceRolePlay`, `advancePart`). `ExamIntro.tsx` names Paper 3, the real part structure, and no
topic (Batch 3).

### §2 — Preparation time

**Rule.** 10 minutes, supervised, under exam conditions. The candidate may not write anything or
use a dictionary (TN p.1, p.5; Syl p.19).

**App policy (D3).** Exam Sim: a fixed 10:00 countdown that auto-advances to the greeting at 0:00.
A "Start now" button is offered anyway, but using it makes the attempt practice-only (the same
treatment as a typed answer) — see `attemptStatus.ts`'s `earlyStart`. Coached: untimed; start when
ready.

**Status.** Enforced (Batch 3): `RolePlayCardPreview.tsx`'s 600 s countdown, `ExamMode.tsx`'s
`earlyStart` plumbing into `countsTowardProgress`.

### §3 — The candidate card

**Rule.** The card gives the role-play information and reminds the candidate that two topic
conversations follow. The candidate keeps it until the test ends (TN p.14, p.9 #23; Syl p.19).

**App policy (D14).** The scenario is shown in French. It stays visible throughout the role play
(the `ExamRunner` header keeps `rolePlaySetup`/`rolePlayTitle` on screen for the whole part).

**Status.** Enforced (Batch 3): the two-topic reminder and updated task-count copy are in
`RolePlayCardPreview.tsx`. An English gloss for Coached is not implemented — a known gap, not a
design decision.

### §4 — Topics are not shared in advance

**Rule.** The candidate must not learn the conversation topics before the test or during
preparation (TN p.5). The card must not reach the candidate before preparation starts (Syl p.19).

**App policy (D4).** Exam Sim picks a set at random and shows neither topics nor card before
preparation; each topic is named only when its conversation starts (§5). Coached may show the set
picker.

**Status.** Enforced (Batch 3): `ExamSelect.tsx` renders only a "Start Exam Sim" button in Exam
Sim mode (no fetch of the catalog, no topic areas/sub-topics/role-play titles); Coached still shows
the full picker. `DailyChallenge.tsx` no longer previews the set's title or scenario before the
test starts.

### §5 — Announcing each part

**Rule.** The examiner tells the candidate when the role play has finished, and introduces each
topic conversation by naming its topic (TN p.6 #10, p.7 #12, p.8 #17).

**App policy.** Original French transition lines, spoken by the UI the same way the role-play
scenario is. Naming each topic's actual sub-topic needs an unhashed per-topic title
(`AuthoredTopic.title`), which is Batch 4 schema + Batch 5 content.

**Status.** Partly enforced (Batch 3): `ExamMode.tsx` speaks an original "the role play has
finished" line, then a transition line announcing each topic conversation's *start* — but without
naming the actual topic, since `AuthoredTopic.title` doesn't exist yet. A known, documented gap
until Batch 4/5 land, not a design decision. The role-play scenario itself is now spoken aloud too
(audit #12, TN p.6 #5) — see §6.

---

## Role play

### §6 — Read exactly as printed

**Rule.** The scenario and every question are read exactly as printed. The examiner plays the
role (TN p.6 #5–6).

**Status.** Enforced. The engine only ever speaks authored text for scripted prompts. The scenario
itself (`setup`) is now spoken by the UI too (Batch 3, audit #12) — after the greeting and before
rp1, via `speakExaminerText`, never as a conduct-engine action, so it stays outside the
ConductLog/hash/judge input, the same way `setup` was already excluded from the content hash.

### §7 — Two-part questions

**Rule.** For a two-part question, pause, wait for the answer to part 1, then ask part 2. This
applies to role-play tasks and topic questions alike (TN p.6 #6, p.7 #13, p.8 #18). The notes give
**no** rule for skipping part 2 when part 1 already answered it.

**App policy (D2).** Part 2 is always asked, in both modes.

**Status.** Enforced (`stepRolePlay`, `moveToSecondPartOrExtension`). The runner now labels part 2
distinctly ("Question N of 5 · part 2", Batch 3, `ExamRunner.tsx`'s `isSecondPart`). Content: rp3 is
the only two-part task in every current set. Planned (Batch 5).

### §8 — Role-play repeats

**Rule.** Repeat a role-play question if the candidate didn't understand or hear it. Never
rephrase it. If they still can't answer after the repeat, move to the next task. There are no
alternative or extension questions in the role play (TN p.6 note).

**Status.** Enforced: one verbatim repeat, then advance (`stepRolePlay`). A lint rule forbidding
alternatives on role-play tasks is planned (Batch 4).

### §9 — Responding in role

**Rule (script layout).** After each answer the examiner responds in role before the next
question, and closes the exchange after the last task (TN pp.16–24).

**App policy (D13).** A short generic acknowledgement from a fixed list, not authored per task.

**Status.** Enforced (Batch 3): the engine emits a `TRANSITION` (the same neutral acknowledgement
topics use) between rp1–rp5, but never crossing into topic 1 — that boundary gets the UI's own
"role play finished" line instead (§5), so it is never doubled
(`advanceRolePlayWithTransition`, `conductEngine.ts`).

### §10 — Role-play length

**Rule.** About 2 minutes. If shorter, add no questions. If longer, don't shorten the topic
conversations (TN p.3).

**Status.** Enforced by the engine: no role-play cutoff, no extra questions. The runner's countdown
now counts down from the current part's own start (Batch 3, `ExamRunner.tsx`'s `partStartS`),
Exam Sim only — Coached shows no countdown at all (§24).

---

## Topic conversations

### §11 — All five questions, in order

**Rule.** Ask all five questions, in the printed order, exactly as printed (TN p.7 #13, p.8 #18).

**Status.** Enforced (`advanceTopicQuestion`). Further questions (§15) have their own engine phase
(`ConductPhase` kind `further`) and never inherit Q5's state.

### §12 — Repeat ladder, Q1–Q2

**Rule.** No relevant answer → repeat the question. Still none → ask the next question (TN p.7,
p.8 table). Q1–Q2 have no alternative question.

**Status.** Enforced: the engine offers an alternative only from Q3 on
(`FIRST_ALTERNATIVE_QUESTION_INDEX`), even if content carries one on Q1–Q2. A lint rule forbidding
alternatives on Q1–Q2 is planned (Batch 4).

### §13 — Repeat ladder, Q3–Q5

**Rule.** No relevant answer → repeat the question. Still none → ask the alternative question(s),
repeating once if necessary. Still none → the next question (TN p.7, p.8 table). In the scripts,
an alternative keeps the main question's shape, including a second part (TN pp.25–31).

**App policy (D9).** `alternativeTexts` holds the alternative question's **ordered parts**, not a
list of separate alternatives. The engine asks them in order, pausing for an answer between parts,
exactly like a main question's second part. Each part gets one verbatim repeat. An unanswered
part moves on to the next question.

**Status.** Enforced (`afterFailedMain`, the `alternative` sub-state).

### §14 — Extension questions

**Rule.** If the candidate doesn't answer, or answers very briefly and could say more, the
examiner may encourage a fuller response with an extension question, "if necessary" (TN p.7 #15,
p.8 #20). The notes give example prompts and **no** length threshold.

**App policy (D7, D16).**
- The engine's two prompts are the notes' own example prompts (`AUTHORIZED_EXTENSION_PROMPTS`).
  They are conduct prompts, not question scripts.
- "Very briefly" means the **whole answer to the question** (every part answered, including the
  parts of an alternative) is under `DEVELOPED_ANSWER_WORDS` words and under
  `DEVELOPED_ANSWER_SECONDS` seconds of speech. Both thresholds are `UNVALIDATED`. The ConductLog
  keeps each turn's word count and timings, so they can be checked against recordings later.
- At most `MAX_EXTENSIONS_PER_TOPIC` per conversation (app policy).
- A candidate may ask for an extension prompt to be repeated. It is repeated once, verbatim. If
  it still goes unanswered, the examiner moves on.

**Status.** Enforced (`moveToExtensionOrAdvance`, `decideExtension`).

### §15 — Further questions

**Rule.** If a topic conversation lasts 3½ minutes or less, even after extension questions, ask
up to two further questions on the same topic, to bring it to 4 minutes (TN p.3, p.7, p.8).

**App policy (D6, D5).**
- Further questions are the authored `furtherQuestions` only. The engine never builds one from
  the candidate's own words.
- Exam Sim: the 3½-minute check is re-made after each further question.
- A candidate may ask for a further question to be repeated. It is repeated once, verbatim.
- Coached Practice always asks both authored further questions per topic, never time-gated — they
  are authored content worth practising, not a device for filling dead air (D5, revised from an
  earlier "Coached asks none" draft — see §24, §25).

**Status.** Enforced (`checkFloorOrAdvancePart`, the `further` phase): Exam Sim gates on the
3½-minute wall-clock floor; Coached has no such gate.

### §16 — How the 3½ minutes are measured

**Rule.** The examiner times each part with a timer or clock (TN p.4, p.6 #3). The rule is about
how long the **conversation** lasts, not how long the candidate speaks (TN p.7).

**App policy (D8).** Wall-clock time from the step that starts the topic (the handling of the last
answer of the previous part) to the end of the latest answer. Examiner speech, thinking time and
typed turns all count.

**Status.** Enforced: the driver passes the session clock on every candidate turn
(`StepInput.clockS`), and the engine records each topic's start (`ConductEngineState.partStartS`).

### §17 — When 4 minutes have passed

**Rule.** The notes give no instruction to stop at 4 minutes. All five questions must still be
asked, and the test need not last exactly 10 minutes (TN p.7 #13, p.3).

**App policy.** No cutoff in either mode. In Exam Sim only, once a conversation reaches
`TOPIC_TARGET_S` of wall-clock time, no further extension prompts are offered. Coached has no time
rules.

**Status.** Enforced (`moveToExtensionOrAdvance`).

### §18 — Acknowledging answers

**Rule.** Listen carefully to and acknowledge each answer (TN p.7 #14, p.8 #19).

**App policy.** A neutral acknowledgement (`TRANSITION_MARKERS`) after each answered question,
never after an unanswered one (a failed repeat, alternative, extension or further question), and
never immediately before the closing line.

**Status.** Enforced (`advanceWithTransition` is reached only from successful answers).

---

## Test conditions and allocation

### §19 — No pausing

**Rule.** Don't stop or pause the recording; exam conditions last until the test ends (TN p.5,
p.6 #1).

**App policy (D15).** Exam Sim may resume after a reload, but a resumed attempt becomes practice
only (it doesn't count), the same as a typed answer.

**Status.** Enforced (Batch 3): a resume guard (`localTranscriptStore.ts`'s `RunningSessionSnapshot.
questionSetHash`/`engineVersion`) discards a snapshot saved under since-changed content or an older
engine version rather than resuming it; a snapshot that DOES still match is resumed and marks the
attempt practice-only via `attemptStatus.ts`'s `resumed` reason.

### §20 — Language

**Rule.** Everything is conducted in French from the greeting onward (TN p.6 #3).

**Status.** Enforced: all examiner text is French.

### §21 — Allocation and topic-area pairing

**Rule.** Nine candidate cards and seven topics, allocated in sequence from a grid that restarts
after 30 candidates and each day. Topic conversation 1 comes from Area A or B; topic conversation
2 from Area C, D or E (TN p.3, pp.14–15; Syl p.19).

**App policy (D4).** The app keeps fixed sets (card + topic 1 + topic 2), because question-set
hashes, duels and the Daily Challenge are all set-based. Each set must still follow the pairing.

**Status.** Planned: a `topic-area-slot` validator rule (Batch 4) and rewritten content (Batch 5).
Four current sets break the pairing.

### §22 — Sub-topics

**Rule.** Each conversation is on one specific sub-topic of its area (TN p.3). The syllabus lists
sub-topics as examples, not a prescriptive list (Syl p.14).

**App policy.** `subTopic` becomes a closed list per area, taken from Syl p.14.

**Status.** Planned (Batch 4).

### §23 — Marks

**Rule.** Role play: 5 tasks × 2 marks. Communication /15 and Quality of Language /15 across both
conversations (TN pp.10–12).

**Status.** Enforced by the scoring pipeline (`src/domain/igcse/rubric.ts`). Conduct changes never
change the rubric. They do change the judge's inputs: each turn's examiner support and the
`further1`/`further2` turns come from the conduct log (see `assessment-engine.md`).

---

## §24 — The two modes

The engine takes a `ConductPolicy` (`{ mode: 'examSim' | 'coached' }`) at
`initConductEngineState` and keeps it in its state, so it survives a snapshot restore.

| Behaviour | Exam Sim | Coached Practice |
|---|---|---|
| Preparation (§2) | 10:00 countdown | Untimed |
| Topics shown before the test (§4) | Never | Allowed in the set picker |
| Scripted Q1–Q5 and second parts, in order (§7, §11) | Yes | Yes |
| Repeat and alternative ladders (§12, §13) | Yes | Yes |
| Extension prompts (§14) | Brief answers only | Brief answers only |
| Further questions (§15) | Up to 2, when ≤3½ min | Up to 2, always (not time-based, D5) |
| Time-based decisions (§16, §17) | Yes (wall clock) | None |
| Countdown in the runner (§10) | Per part | None |
| Feedback after each answer | None | Yes |
| Typing and transcript editing | No | Yes |
| Counts toward progress | Yes (unless earlyStart/resumed) | No (ADR-0007) |

All rows enforced as of Batch 3.

## §25 — Where the notes are silent

Things the notes don't cover and the app has had to decide:

| Question | Decision |
|---|---|
| Skip part 2 when part 1 already gave a reason? (D2) | No, in either mode (§7) |
| Early start from preparation in Exam Sim? (D3) | "Start now" offered, but makes the attempt practice-only (§2) |
| Extension prompts / further questions in Coached? (D5) | Both on; further questions always asked, not time-based (§24) |
| Further questions quoting the candidate's words? (D6) | No; authored only (§15) |
| What is "very briefly"? (D7) | The whole answer to the question, `UNVALIDATED` thresholds (§14) |
| Endpoints of the 3½-min clock (D8) | §16 |
| Alternatives with more than one part (D9) | `alternativeTexts` = the alternative's ordered parts (§13) |
| In-role reply between role-play tasks (D13) | Generic acknowledgement (§9) |
| Card language and visibility (D14) | §3 |
| Resume after a reload in Exam Sim (D15) | Allowed, practice only (§19) |
| The notes' own extension prompts (D16) | Used as the engine's extension prompts (§14) |
