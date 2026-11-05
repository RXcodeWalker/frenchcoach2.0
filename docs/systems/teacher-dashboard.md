# Teacher dashboard

Live specification (built 2026-11-03 from `docs/plans/teacher-dashboard.md`). §-numbered and cited
from code as `teacher-dashboard.md §N` — do not renumber. The access rule is ADR 0015.

## §1 What it is

A teacher area for Cambridge 0520 speaking teachers, who conduct and mark component 3 themselves. It
answers four questions, most frequent first:

| | Question | Where |
|---|---|---|
| Q1 | Who is practising, and who isn't? | Class → **This week**, and the Monday email |
| Q2 | What should I teach on Monday? | Class → **Insights** |
| Q3 | Did they do what I set? | Class → **Homework** |
| Q4 | Can I trust this AI mark? | Student → attempt review, with the teacher's own marks |

Not in it (deliberately): XP, gems, leaderboards, predicted grades (A*–G — no sourced thresholds,
Core rule 3), messaging, LMS sync, audio playback (recordings are not kept), Junior classes.

Owner decisions taken as the plan recommended: teachers are **invite-only** (D1), homework has its own
capped allowance (D3), a teacher mark reaches the student only after **Share** (D4), audio is not kept
(D5), class slips show coverage instead of a paid categorisation pass (D6), a teacher sees activity
**from the join date onward only** (D7), and teacher marks are stored separately and never fed to the
judge or a calibration set without a new owner decision (D8).

## §2 Access model (security — not deferred)

- **Joining is the only grant.** A student joins with the class's 6-character code (`join_class`), sees
  exactly what the teacher will see, and can leave at any time (`leave_class`). Access ends the moment
  they leave or are removed. One active class per student.
- **Teacher reads are `SECURITY DEFINER` functions only** (`teacher_class_roster`, `teacher_class_sessions`,
  `teacher_student_sessions`, `teacher_class_exams`, `teacher_exam_attempt`, `teacher_assignment_progress`).
  Each checks the caller owns the (non-archived) class and returns rows of **active** members created at
  or after that member's `joined_at`. No RLS policy on `sessions`, `scoring_envelopes`,
  `session_transcripts` or `exam_feedback_reports` was widened for teachers.
- Every new function revokes `EXECUTE` from `PUBLIC, anon, authenticated` before granting it, and every
  new table has explicit grants (data-model.md §1, §4). `assignment_allowance` is `service_role` only.
- A teacher is a `teacher_profiles` row, created only by `redeem_teacher_invite` with a code from
  `teacher_invites` (admins insert those; RLS `is_admin()`). Never `app_metadata.role` alone.
- The behaviour spec is `backend/supabase/tests/plain_pg/teacher_dashboard_test.sql` (plain Postgres,
  local only).

## §3 Surfaces

- **Teacher area** `/teach/*` (`src/screens/teach/`): its own layout (`TeachLayout` — no learner nav, no
  XP bar, no sound), desktop-first, signed-in only, exempt from the learner onboarding survey
  (`OnboardingCheck`). `/teach` (become a teacher → classes → new class), `/teach/class/:id` with tabs
  This week · Insights · Homework · Students & code, `/teach/class/:id/student/:studentId`,
  `/teach/class/:id/attempt/:attemptId`.
- **Learner side**: Profile → **Your class** (`features/homework/ClassCard.tsx`: join/leave, shared
  teacher marks, the way into `/teach`), `/join` and `/join/:code` (`screens/JoinClass.tsx`), and Home's
  **Set by your teacher** card (`features/homework/HomeworkCard.tsx`). Every learner surface hides itself
  when the class service can't be read.
- Flag `teacherDashboard` (`live`; rollback `coming-soon`) gates `/teach`, `/join` and both cards.

## §4 The numbers

All in the pure `src/domain/teacher/classInsights.ts` (the screens and the Monday email share it).

- **Only counted attempts feed a mark summary**: `exam_attempt_meta.counts_toward_progress = true` and not
  Coached (ADR 0007). An attempt without a server record is shown as practice. The server records it at
  `POST /score` from `?mode=&counts=` and can only lower the claim (Coached, an edited transcript or any
  typed answer force `false` — `server/examAttemptMeta.ts`). The record sits beside the envelope, never
  inside it; nothing about it reaches `scoreAttempt()`.
- **This week**: Monday 00:00 → Monday 00:00 in the class's time zone; rows sorted least active first.
- **Common slips** rank error categories by **distinct students**, from post-marking reports
  (`exam_feedback_reports`, which only exist once a student opened their report), and always show
  coverage ("from N of M marked mock exams"). Examples: one per student, names hidden by default.
- **Area medians** use each student's latest counted attempt; area maxima come from `rubric.ts`.
- **No trend under 3 counted attempts** (`TREND_MIN_ATTEMPTS`); counted marks are drawn as dots, never a
  smoothed line. Topic averages are `null`, never a fabricated 0.
- A mark-free surface stays mark-free: Examiner-style Learn answers carry no score anywhere.

## §5 Homework

- Kinds: **Learn topic** (topic + 1–5 answers — Learn builds `quick` sessions of 5), **Role-play card**,
  **Mock exam** (Exam Sim). Whole class or selected students, with a due date.
- A homework link is the ordinary screen URL plus `?assignment=<uuid>` (`features/homework/homework.ts`).
  A screen treats it as homework only after the learner's own `my_assignments()` confirms it; a mock
  exam is then forced to Exam Sim like Daily Challenge.
- **Allowance** (never the learner's own limits): a Learn homework answer charges
  `assignment_learn_answer` (backend reads `X-Assignment-Id`, set by `homeworkContext.ts` only while
  Learn is on the homework topic); a homework mock charges `assignment_exam` and skips the weekly-exam
  check (`server/examAttemptMeta.ts`). The `assignment_allowance` RPC owns every rule — membership,
  targeting, closed 14 days after the due date, the cap (Learn: answers + 2; mock: 1). Grants carry the
  key prefix `asg:<id>:` so the RPC counts them. Anything unexpected falls back to the normal limits.
- **Completion is derived, never stored**: `teacher_assignment_progress` counts homework allowance grants
  (Examiner-style answers included — they write no Session), sessions carrying `assignment_id`, and
  `exam_attempt_meta` rows. Late = done after the due date.
- The teacher area never reads the learner's local-only data (notebook, speaking log, Pronunciation Lab
  history): `src/domain/teacher/__tests__/teacherIsolation.test.ts`.

## §6 The Monday email

`scripts/scheduledJobs/sendTeacherDigest.ts`, hourly via `.github/workflows/teacher-digest.yml`. Sends
when it is Monday 07:00–08:59 in the class's time zone, to the teacher's account email, if the class has
`digest_enabled` and the teacher hasn't opted out. Claim-before-send on `teacher_digest_log(class_id,
week_start)`: at most one attempt per class per week. Three lines (who practised and who didn't, counted
mocks and median, the top slip with its coverage) and a link — never a transcript or answer. Needs
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY` (skips without it), optional `APP_BASE_URL`.

## §7 Teacher marks

The attempt review shows what the marker read (`envelope.transcriptSnapshot`), the AI's marks with
justifications and counted errors, and lets the teacher agree or adjust each criterion with a comment.
Saved as a `TeacherMarkSet` (`domain/igcse/comparison/teacherMark.ts`) through `save_teacher_mark` into
`teacher_marks` — **never** into or over `scoring_envelopes` (ADR 0009 parity). The student sees it in
Profile only when the teacher shares it (`my_shared_teacher_marks`). Teacher marks are not calibration
data until the owner decides so (plan D8, Core rule 5).

## §8 Analytics

Through `track()` only, declared props: `teacher_class_created`, `class_joined` (`via`, `switched_class`),
`class_left`, `teacher_dashboard_viewed` (`tab`, `students`), `assignment_created` (`kind`, `targeted`),
`teacher_mark_saved` (`agreed`, `delta`, `shared`), `class_exported`, `homework_opened` (`kind`). Never a
name, code, transcript or comment. All per teacher action — negligible volume.

## §9 Deploy order and rollback

1. Apply backend migration `20261103091000_teacher_dashboard.sql` (tables, functions, the
   `assignment_exam` / `assignment_learn_answer` quota rows — FK targets, so **before** the backend).
   **Done: applied to production 2026-11-03** (`verification-log.md`).
2. Deploy the FastAPI backend (it names `assignment_learn_answer`).
3. Deploy the scoring service (`server/`) and the frontend. `sessionSync` retries a row without the new
   `sessions` columns if the database lacks them, so a frontend deployed first never stops sync.
4. Create teacher invites: `insert into teacher_invites (code, max_uses, note) values ('PILOT-XYZ', 1, 'Ms D');`
5. Optional: add `RESEND_API_KEY` (already used by notifications) for the Monday email.

Rollback: flag `teacherDashboard` → `coming-soon` hides every surface; the tables can stay.

## §10 Known limits

- Recordings aren't kept, so attempt review is transcript-only.
- Slip categories exist only for attempts whose report a student opened.
- Learn transcripts are synced truncated to 2,000 characters.
- Display names are usernames; a student without one shows as "Unnamed student".
- Consent / data-protection for school use is deferred by owner directive (CLAUDE.md); it becomes blocking
  at the first school that procures this.
