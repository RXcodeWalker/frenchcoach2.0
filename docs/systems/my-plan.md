# My Plan

`/plan` (flag `myPlan`, `live` since 2026-11-25, rollback `coming-soon`). One screen that shows the learner one honest path from today to their exam. It replaced three coming-soon stubs — French Roadmap (`/roadmap`), Mastery Journey (`/mastery`) and Fluency Heatmap (`/fluency-heatmap`) — whose paths now redirect to `/plan`. It is reached from its Explore tile, Home's week strip ("Full plan") and Progress ("See your plan to the exam").

Code: the pure model `src/features/myPlan/planModel.ts`, the screen `src/screens/MyPlan.tsx`, its pieces in `src/screens/plan/`.

## §1 It is a reader, never a second coach

Every part comes from a module that already decides it, so the plan cannot disagree with Home:

| Section | Source |
|---|---|
| Countdown and stage | `coachBrain.ts`'s `daysUntil` / `examPhase` (local calendar days) |
| Your next step | `decideCoachBrief`'s move — the same one as Home and Progress (`NextStepCard`) |
| This week | `buildWeekPlan` — the same seven days as Home's strip |
| The road to your exam | the coach's phases (`PHASE_STARTS_DAYS_BEFORE`, `PHASE_FOCUS`) as dates, with Exam Sims on `weekPlan`'s cadence |
| Where you stand | counted Exam Sims (`examSummary`, `examAreaStanding`) and the learner model's language skills (`readSkill`, grouped by the coach's `WEAK_*`/`STRONG_*` thresholds) |
| When you followed the plan | the coach outcome log (`measuredChange` of followed, measured episodes) |
| Last week | the stored weekly review (`getLastWeeklyReview`; read-only — Home generates it) |
| Your practice | stored sessions per local day (Learn, exam, role-play) |

A new section reads an existing decision; it never adds a picker, a threshold the coach doesn't use, or a write. The screen writes nothing except the content-free `plan_viewed` event.

## §2 Honesty rules (pinned by tests)

1. **No predicted grade, mark or readiness figure** anywhere. Cambridge sets grade boundaries per series; this app does not have them (`planModel.test.ts`, `MyPlan.test.tsx`).
2. **No trend under `MIN_TREND_SAMPLES` (3) on each side** of a comparison — the parent view's number. Exam totals: the newest half of counted Exam Sims against the half before, so 6 counted sims before any "rising/falling"; below that the marks are listed with how many more are needed. Skills: 6 recent outcomes before "improving/slipping/steady".
3. **Counted Exam Sims only** (ADR 0007): Coached, typed, resumed and early-start exams never enter a figure; how many were left out is said.
4. **Every number is copied** from a stored mark, count or model reading. The practice calendar shades by how much was practised, never by score.
5. **No exam date, no guessed road**: the countdown asks for a date (Profile) instead.

## §3 The road

Stages from today to exam day, dropping those already over: build (more than 84 days), sharpen (84–29), exam month (28–8), final week (7–1), exam day — the coach's own `examPhase` boundaries, so "You are here" is the phase the coach is acting on. Exam Sims: this week's is the week plan's; after that, three days before the exam and every 7 days back from it, never before the 7-day window reopens and never within two days of the exam; none while Junior exam practice is locked. It is the room the weekly limit leaves, not a promise.

## §4 Design

Design System v2: role tokens only, the named motions (`enter`, `fill`), no emoji, gradient, glow, looping motion or text under 12px, and never the reward (XP) colour (`src/screens/plan/__tests__/designRules.test.ts`). The only primary button is today's move.
