# 0007 — Only Exam Sim marks count toward progress

Date: 2026-09-24
Status: Accepted

## Decision

An exam attempt's `/40` report is always shown, whichever mode it ran in, but only an attempt run
under real-exam conditions — Exam Sim: microphone only, no live examiner commentary, no transcript
editing — counts toward progress (the roadmap's exam-derived skill average, its IGCSE milestone
nodes, and any other exam-session average). Coached Practice still produces a full `/40` envelope
so the candidate gets feedback, but that Session is tagged `practiceOnly: true` and excluded from
those aggregates.

`src/services/exam/attemptStatus.ts`'s `countsTowardProgress({ coached, transcript })` is the single
place this is decided: an attempt doesn't count if the session ran coached, if the candidate edited
their transcript (`transcript.userCorrected`), or if any candidate utterance was typed
(`inputMode === 'text'`). The last two are defence-in-depth — Exam Sim's own UI (mic-only composer,
read-only transcript review) makes them impossible to trigger *from* Exam Sim by construction — but
they still guard a session started before this decision existed and resumed afterward.

Competitive runs (Daily Challenge, Duels) are always forced to Exam Sim
(`resolveCoachedMode(requestedCoached, isCompetitiveRun)` in the same module), regardless of
whatever the picker was set to, since a coached/typed/edited attempt would make compared scores
incomparable.

## Why

Coached Practice's live examiner commentary, typed answers, and editable transcript are valuable
for practice, but each one is something the real Component 3 speaking test doesn't allow — commentary
mid-test, keyboard input, or post-hoc correction of what was actually said. A `/40` produced under
those conditions is not the same measurement as a real-exam attempt, so blending the two into one
"exam average" (the roadmap gate, the IGCSE milestone nodes) would silently reward practicing under
easier conditions instead of the real skill the milestone is meant to gate on.

The alternative — only ever scoring Exam Sim, and not scoring Coached Practice at all — was
rejected: Coached Practice's whole value is showing the candidate a mark and a report to practice
against, and withholding that would make the mode far less useful.

## Consequences

- `Session.practiceOnly` (`src/types/index.ts`) and `StoredSession.practiceOnly`
  (`src/services/analytics/analyticsService.ts`) must both keep carrying this flag — any change that
  drops it silently un-does the filtering below.
- `roadmapService.ts`'s exam-derived skill average and its `igcse`/`igcseScore` milestone nodes must
  keep filtering on `!session.practiceOnly`. A new exam-derived aggregate must do the same.
- `ExamResults.tsx`'s "Practice mark — doesn't count" banner and mode badge, and `HistoryTab.tsx`'s
  "practice" tag, both read `countsTowardProgress`/`Session.practiceOnly` rather than re-deriving
  this logic — don't add a second copy of the check.
- If Coached Practice ever needs to count (e.g. a future calibration pass validates it), that is a
  new, separate decision — not a loosening of this one.
