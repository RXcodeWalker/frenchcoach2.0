# 0011 — The Junior track is separate from 0520 and mark-free

Date: 2026-10-14
Status: Accepted

## Decision

Grades 4–7 learners (A1 and below) get a **Junior track**: a separate, mark-free speaking-practice
product surface. The behavior is specified in `docs/systems/junior-track.md`; this record holds the
rules that must not drift.

1. **Junior never touches `src/domain/igcse/`, and never feeds IGCSE aggregates.** No file under
   `src/domain/igcse/`, `scripts/scoring/` or `server/` may import or name Junior modules
   (`src/domain/junior/`, `src/data/junior/`, `src/features/junior/`), and Junior imports nothing
   from the scored pipeline. Junior writes no `Session`, XP event, topic mastery, Learn evidence or
   exam-derived aggregate.
2. **It is not a generic rubric engine.** Junior has no rubric, bands or marks; it matches a
   learner's words against a closed, authored target sentence. ADR 0001 (Cambridge 0520 only, no
   `ExamBoard` abstraction) is unaffected and stays intact.
3. **No marks, bands, grades, scores or numbers anywhere in Junior feedback** (the same stance as
   0005 for examiner-voice feedback), and **no pronunciation verdicts** until a calibration on real
   recordings of children passes (see the spec's gated section).
4. **A sticker rewards finishing a mission, never accuracy.** The rewards function does not receive
   outcomes as input, so accuracy cannot reach rewards by construction; a test asserts an all-"none"
   and an all-"got it" mission earn the same sticker.
5. **No model-written text in front of children, and no LLM call per turn.** Checking is
   deterministic against the learner-chosen target sentence.
6. **A turn is recorded honestly.** After two "none" results the mission moves on, but the turn stays
   "none"; it is never upgraded to "got it".

## Why

A 9–12-year-old at A1 cannot use Learn's loop (open question, wait, long report, new page), and
grafting a "junior mode" onto the 0520 engine would blur two things that must stay apart: a
sourced, audited exam scorer and an encouragement-first practice track. Keeping Junior outside
`src/domain/igcse/` (the one-way boundary pattern of 0009 and 0010) makes it structurally unable to
move a mark, and keeping its feedback number-free and its rewards outcome-blind removes the two ways
a children's product most easily goes wrong: shaming a quiet or mis-recognised child, and rewarding
accuracy the recogniser, not the child, may have decided.

## Consequences

- A change that makes Junior import from, write to, or be read by the scored pipeline or any IGCSE
  aggregate, adds a mark/score/number to Junior feedback, or lets outcomes reach `rewards.ts`,
  contradicts this decision.
- Junior reuses the existing recorder and consent gate unchanged; under-13 consent for Junior is not
  separately designed here and remains governed by 0006 as it applies to those components today.
- Pronunciation verdicts for Junior are a new decision gated on calibration; they do not follow from
  this record.
- Does not amend 0001; it records why Junior is not a violation of it.
