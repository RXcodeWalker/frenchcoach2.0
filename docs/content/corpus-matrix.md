# S11 Corpus Matrix — Original Practice Sets 001–010

Authoring plan for the 10-set / 150-item original question bank. `001` already exists
(architecture-proof set); this matrix assigns the 9 new sets so the corpus has full,
non-repeating coverage. See `docs/content/authoring-guide.md` for the wording/quality rules
each row's content must satisfy.

Topic areas (syllabus, `04-frontend-pipeline.md` §6.4): **A** Everyday activities,
**B** Personal and social life, **C** World around us, **D** World of work,
**E** International world.

## Pair coverage

Each set carries two topic areas (`topic1` + `topic2`). With 5 areas there are `C(5,2) = 10`
unordered pairs. `001` covers A+C, so the 9 new sets cover the remaining 9 pairs exactly
once — every pair appears in the corpus once and only once.

| Set | Pair | Role-play area | Scenario archetype | Time-frame templates (topic1 / topic2) | Rare-structure target |
| --- | --- | --- | --- | --- | --- |
| 001 *(exists)* | A+C | A | transactional purchase (train ticket) | — | conditional (t2q5) |
| 002 | A+B | A | social arrangement | P1 / P0 | imperfect |
| 003 | A+D | D | work-experience enquiry | P0 / P1 | negation |
| 004 | A+E | E | travel disruption | P2 / P0 | comparison |
| 005 | B+C | B | appointment booking | P0 / P2 | simple-future |
| 006 | B+D | B | problem / complaint | P1 / P2 | negation |
| 007 | B+E | E | lost property abroad | P2 / P1 | imperfect |
| 008 | C+D | C | information request | P0 / P1 | comparison |
| 009 | C+E | C | service encounter | P1 / P0 | simple-future |
| 010 | D+E | D | reservation / booking | P2 / P2 | conditional |

## Role-play area balance

Role-play area must appear exactly **2 times** across the 10 sets (001 already gives A one):

| Area | Sets | Count |
| --- | --- | --- |
| A | 001, 002 | 2 |
| B | 005, 006 | 2 |
| C | 008, 009 | 2 |
| D | 003, 010 | 2 |
| E | 004, 007 | 2 |

## Topic-slot balance

Each set contributes 2 topic slots (topic1's area, topic2's area). Every area must be a
topic-slot exactly **4 times** across the corpus (20 slots total):

| Area | Appears as topic1/topic2 in | Count |
| --- | --- | --- |
| A | 001(topic1), 002(topic1), 003(topic1), 004(topic1) | 4 |
| B | 002(topic2), 005(topic1), 006(topic1), 007(topic1) | 4 |
| C | 001(topic2), 005(topic2), 008(topic1), 009(topic1) | 4 |
| D | 003(topic2), 006(topic2), 010(topic1) + 004? | see below |
| E | 004(topic2), 007(topic2), 009(topic2), 010(topic2) | 4 |

D appears at: 003(topic2), 006(topic2), 010(topic1) = 3. Fourth D slot: 004's role-play is E
but 004's pair is A+E, so D isn't in 004. Re-deriving from the pair table directly is safer
than bookkeeping prose — see the authoritative per-set assignment below.

### Authoritative per-set topic assignment

| Set | Pair | topic1 area | topic2 area | Role-play area |
| --- | --- | --- | --- | --- |
| 001 | A+C | A | C | A |
| 002 | A+B | A | B | A |
| 003 | A+D | A | D | D |
| 004 | A+E | A | E | E |
| 005 | B+C | B | C | B |
| 006 | B+D | B | D | B |
| 007 | B+E | B | E | E |
| 008 | C+D | C | D | C |
| 009 | C+E | C | E | C |
| 010 | D+E | D | E | D |

Slot counts from this table: **A** = 001,002,003,004 topic1 → 4. **B** = 002 topic2,
005/006/007 topic1 → 4. **C** = 001 topic2, 005 topic2, 008/009 topic1 → 4. **D** = 003
topic2, 006 topic2, 008 topic2, 010 topic1 → 4. **E** = 004 topic2, 007 topic2, 009 topic2,
010 topic2 → 4. All five areas land on exactly 4 topic slots. Role-play counts: A=2 (001,
002), B=2 (005,006), C=2 (008,009), D=2 (003,010), E=2 (004,007). Both balance constraints
hold simultaneously — use the table above as ground truth; the prose earlier in this section
is scratch work, not a second source.

## Difficulty distribution

Per topic (5 questions): **1 foundation / 3 core / 1 higher** as the default shape, applied
per-set — corpus-wide that's ~20% foundation / 60% core / 20% higher across the 180 new
topic-question+role-play-task tag instances. `001` is 9/10 `core` in its topic questions;
**new sets must not repeat that flatness** — hit the 1/3/1 shape per topic deliberately.

## Time-frame templates

Three progression templates (defined in the authoring guide §8):

| Template | Q1 | Q2 | Q3 | Q4 | Q5 |
| --- | --- | --- | --- | --- | --- |
| P0 | present | present | past | present (opinion) | future |
| P1 | present | past | present (opinion) | future | conditional |
| P2 | present | future | past | conditional | present (opinion) |

Every template satisfies the hard lint constraint (past + future per topic). Assignment
(from the main table's "Time-frame templates" column) spans all three templates across the
18 new topics, and specifically lands `conditional` (present only in P1 Q5 and P2 Q4) in:

002-topic1(P1), 005-topic2(P2), 006-topic1(P1)... — **target: conditional in ≥8 of the 20
topics total** (001 has it once, in t2q5). Count when authoring; if short after assigning
templates as listed, swap an adjacent set's template for a P1/P2 variant rather than
hand-inserting `conditional` into a P0 topic (which would break that template's
internal consistency across sets — keep template assignment the single source of truth for
which topics carry `conditional`).

## Grammar structure coverage

Closed list of 10 (`src/data/exam/bank/types.ts`): `present`, `perfect`, `imperfect`,
`near-future`, `simple-future`, `conditional`, `opinion`, `justification`, `comparison`,
`negation`.

`present`, `perfect`, `opinion`, `justification` arise naturally in nearly every topic (Q1/Q2
present, Q3 perfect via past template slot, Q4 opinion+justification) and need no special
placement. `near-future` and `conditional` are template-driven (P1/P2 Q4/Q5, or explicit
future/conditional slots). The **rare-structure target** column in the main table places the
four structures that would otherwise be under-exercised — `imperfect`, `simple-future`,
`comparison`, `negation` — at least once each in 2–3 sets, so that **every `TargetStructure`
appears in ≥3 sets** corpus-wide (rule from the S11 plan §1):

| Structure | Placed in (rare-structure target column) | Count |
| --- | --- | --- |
| imperfect | 002, 007 | 2 (+ any incidental uses elsewhere — author to hit ≥3) |
| negation | 003, 006 | 2 (+ incidental) |
| comparison | 004, 008 | 2 (+ incidental) |
| simple-future | 005, 009 | 2 (+ incidental) |
| conditional | 010 (+ template-driven appearances, see above) | ≥8 topics corpus-wide |

Each rare structure has a deliberate anchor in 2 sets from the target column; authors should
use at least one more incidental natural occurrence elsewhere in the corpus (e.g. a `higher`
Q4/Q5 phrased with a comparison, or a negation in a role-play refusal task) to comfortably
clear the "≥3 sets" bar rather than landing exactly on it. `authoring:status`'s coverage
report (built on the validator's existing `target-structure-coverage` info diagnostic,
aggregated corpus-wide) is the source of truth — treat this table as a starting allocation,
not a hard ceiling.

## Scenario archetypes

10 distinct archetypes, one per set, none repeating 001's train-ticket purchase:

| Set | Archetype | Sketch |
| --- | --- | --- |
| 001 | Transactional purchase | Buying a train ticket |
| 002 | Social arrangement | Arranging to meet a friend for an outing |
| 003 | Work-experience enquiry | Asking about a work-experience placement |
| 004 | Travel disruption | Dealing with a delayed/cancelled train or flight |
| 005 | Appointment booking | Booking a doctor/dentist appointment |
| 006 | Problem / complaint | Reporting a fault with a hotel room or purchase |
| 007 | Lost property abroad | Reporting something lost while travelling |
| 008 | Information request | Asking a tourist office for local information |
| 009 | Service encounter | Ordering at a café/restaurant with a specific request |
| 010 | Reservation / booking | Booking a table or activity slot |

## ID allocation

`questionSetId`: `original-practice-0NN`, `NN` = `02`..`10`. Question ids within each set
follow `001`'s convention: `rp1`–`rp5`, `t1q1`–`t1q5`, `t2q1`–`t2q5`. IDs are never
renumbered or reassigned to different content once seeded (authoring guide §11).

## Verification

`npm run authoring:status` (once all 10 sets are authored and checked) must report:

- All 10 unordered pairs present exactly once.
- Role-play area counts: A=2, B=2, C=2, D=2, E=2.
- Topic-slot counts: A=4, B=4, C=4, D=4, E=4.
- Every `TargetStructure` in ≥3 sets; `conditional` in ≥8 of the 20 new+existing topics.
- 10 distinct archetypes (`review.notes` or an archetype tag — tracked manually until/unless
  a machine-checkable field is added; not a schema change for M1).
