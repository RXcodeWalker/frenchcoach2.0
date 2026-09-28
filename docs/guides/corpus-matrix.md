# Corpus Matrix — Original Practice Sets 001–010

The per-set plan for the 10-set original question bank (`backend/data/igcse/original-practice-*.json`).
Every set is a full 0520/03 test: one role play plus two topic conversations. The wording rules
each set must follow are in `docs/guides/content-authoring.md`. The structure follows the
Teacher/Examiner Notes (ADR 0008; conduct rules in `docs/systems/exam-conduct-0520.md`), cited
by page only.

This table is the source of truth for the matrix. `scripts/authoring/matrix.ts` mirrors it for
the skeleton script. Keep the two in sync by hand.

## Rules the matrix follows

- **Topic-area slots (TN p.3, Syl p.19; exam-conduct §21).** Topic conversation 1 is always from
  Area **A or B**. Topic conversation 2 is always from Area **C, D or E**. Machine check:
  `topic-area-slot` (validator, runtime-fatal).
- **One declared sub-topic per conversation (TN p.3; exam-conduct §22).** `subTopic` is the
  closed list from Syl p.14 below. Machine check: `sub-topic-not-in-area` (validator).
- **Thin sub-topics are never standalone topics.** Time expressions, Colours, Measurements and
  Materials can't carry a 4-minute conversation. Machine check: `thin-sub-topic` (corpus lint).
- **Each sub-topic appears at most twice per slot.** Machine check: `duplicate-sub-topic-slot`
  (corpus lint).
- **No two sets share the same topic 1 + topic 2 sub-topic pair.** Machine check:
  `duplicate-area-subtopic-pair` (corpus lint).
- **Role-play areas are spread across A–E**: each area twice.
- **Examiner register is mixed**: friend roles use *tu*, stranger/official roles use *vous*,
  roughly half each (TN pp.16–24 script pattern). Recorded per set as
  `rolePlay.examinerRegister`. The scenario itself is always read in *vous*, whatever the role.
- **No role play re-uses a notes card's scenario.** Structure is modeled on the notes; a
  scenario and question sequence that mirror a real card are too close even with new wording.
- **Two-part positions (TN pp.16–31 script pattern).** Role play: 2–3 of rp3–rp5 are two-part,
  never rp1–rp2. Topics: two-part questions only among Q3–Q5, never Q1–Q2. Machine checks:
  `two-part-position`, `roleplay-two-part-count` (authoring-only pattern lint).

## Syllabus sub-topics (Syl p.14)

| Area | Sub-topics (the `subTopic` enum) |
| --- | --- |
| A Everyday activities | Time expressions; Food and drink; The human body and health; Travel and transport |
| B Personal and social life | Self, family and friends; In the home; Colours; Clothes and accessories; Leisure time |
| C The world around us | People and places; The natural world, the environment, the climate and the weather; Communications and technology; The built environment; Measurements; Materials |
| D The world of work | Education; Work |
| E The international world | Countries, nationalities and languages; Culture, customs, faiths and celebrations |

## The matrix

"2p" lists the two-part slots. Everything else in that part is single-part.

| Set | Topic 1 (A/B) | Topic 2 (C/D/E) | Role play (area) | Register | RP 2p | T1 2p | T2 2p |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 001 | A · Travel and transport | C · The natural world, the environment… | A · a missed train: buying a new ticket at the station | vous | rp3, rp4, rp5 | Q3, Q5 | Q4, Q5 |
| 002 | B · In the home | C · Communications and technology | B · planning an outing with a French friend | tu | rp3, rp5 | Q3, Q4 | Q3, Q5 |
| 003 | B · Clothes and accessories | D · Education | C · asking at a tourist office | vous | rp4, rp5 | Q4, Q5 | Q3, Q4 |
| 004 | A · Food and drink | E · Countries, nationalities and languages | D · first day of a work placement in a sports shop | vous | rp3, rp4, rp5 | Q3, Q5 | Q4 |
| 005 | B · Self, family and friends | C · The built environment | E · a French friend's family celebration | tu | rp3, rp4 | Q3, Q4 | Q3, Q5 |
| 006 | A · The human body and health | D · Work | A · ordering a meal in a restaurant | vous | rp3, rp5 | Q4, Q5 | Q3, Q4 |
| 007 | B · Leisure time | E · Culture, customs, faiths and celebrations | B · shopping for clothes with a French friend | tu | rp3, rp4, rp5 | Q3, Q5 | Q4, Q5 |
| 008 | A · Food and drink | C · People and places | C · a friend organising a park clean-up | tu | rp4, rp5 | Q3, Q4 | Q3, Q5 |
| 009 | B · Self, family and friends | C · The natural world, the environment… | D · first day at a French school, with a classmate | tu | rp3, rp4 | Q4, Q5 | Q3, Q4 |
| 010 | B · Leisure time | D · Work | E · a guided tour on holiday in Quebec | vous | rp3, rp4, rp5 | Q3, Q5 | Q4, Q5 |

### Balance, derived from the table

- **Topic 1 sub-topics:** Food and drink 2 (004, 008), Self, family and friends 2 (005, 009),
  Leisure time 2 (007, 010), Travel and transport 1, The human body and health 1, In the home 1,
  Clothes and accessories 1. Area A = 4 slots, B = 6.
- **Topic 2 sub-topics:** The natural world… 2 (001, 009), Work 2 (006, 010), People and places 1,
  Communications and technology 1, The built environment 1, Education 1, Countries, nationalities
  and languages 1, Culture, customs, faiths and celebrations 1. Area C = 5 slots, D = 3, E = 2.
- **Area pairs:** A+C 2, A+D 1, A+E 1, B+C 3, B+D 2, B+E 1 — all six legal pairs are used.
  No sub-topic pair repeats.
- **Role-play areas:** A 2 (001, 006), B 2 (002, 007), C 2 (003, 008), D 2 (004, 009),
  E 2 (005, 010).
- **Register:** *vous* 5 (001, 003, 004, 006, 010), *tu* 5 (002, 005, 007, 008, 009).
- **Two-part role-play tasks:** 3 in 001, 004, 007, 010; 2 in the other six.

A role play never shares its sub-topic with the same set's topic conversations, so a candidate
isn't tested on the same material twice in one sitting.

## Time frames and structures

There are no fixed templates any more (the old P0–P2 templates put past or future in Q2, which
the notes' scripts never do). Instead, per topic:

- **Q1–Q2**: short, single-part, present-tense factual questions with no alternative
  (`foundation`, or `core` for Q2).
- **Q3–Q5**: between them, at least one `past` and at least one `future` or `conditional`
  question, plus an opinion with a reason (machine check: `q3-q5-time-frames`). Q3–Q4 are `core`,
  Q5 `higher`. Vary the order across topics.
- **Role play rp3–rp5**: between them, a past, a future or conditional, and a reason. Role-play
  tasks carry no `expectedTimeFrame` (it would change hashed fields), so this is a human check
  (content-authoring §16).

The four structures that don't arise on their own — `imperfect`, `simple-future`, `comparison`,
`negation` — must each be genuinely elicited in at least 3 sets. `authoring:check`'s
`corpus-structure-coverage` line is the count.

## ID allocation

`questionSetId`: `original-practice-0NN`, `NN` = `01`..`10`, kept across the rewrite (D11): the
Daily Challenge and duel foreign keys depend on them. Question ids: `rp1`–`rp5`, `t1q1`–`t1q5`,
`t2q1`–`t2q5`. A content revision under a kept id is recorded by the seed's `content_versions`
snapshot.

## Verification

`npm run authoring:check` must be clean, and its coverage block must show:

- `corpus-pair-coverage`: only the six legal pairs (A+C, A+D, A+E, B+C, B+D, B+E).
- `corpus-roleplay-area-coverage`: 2 per area.
- `corpus-structure-coverage`: every `TargetStructure` in ≥3 sets.
