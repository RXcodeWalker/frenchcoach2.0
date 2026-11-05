# 0015 — Teacher access to student data is granted by class membership

Date: 2026-11-03
Status: Accepted

## Decision

1. **A teacher sees a student's data only because the student joined their class.** Joining with the
   class code is the one and only grant; leaving or removal ends it immediately. There is no teacher
   search, no roster import and no admin-assigned access in v1.
2. **From the join date onward only.** A teacher never sees practice from before the student joined
   (a rejoin restarts the window).
3. **Teacher reads go through class-scoped `SECURITY DEFINER` functions** that check ownership and active
   membership and return narrow shapes. No RLS policy on the learner's own tables is widened for teachers.
4. **Local-only learner data is never shared**: notebook, speaking log, Pronunciation Lab history.
5. **A teacher's mark sits beside the AI's mark, never over it**, in its own table, and reaches the
   student only when the teacher shares it. It is not calibration data without a further owner decision.
6. **Only server-recorded counted attempts (Exam Sim, not edited or typed) feed a teacher's mark
   summaries** (ADR 0007).

## Why

Schools will only trust a tool whose access rule a student can understand in one sentence ("your teacher
sees your practice from today, until you leave"). A grant the student performs themselves needs no
teacher verification to be safe for the student — the remaining risk (a stranger handing out codes) is
contained by invite-only teacher accounts. Function-only reads keep the schema's history of
policy/grant gaps (data-model.md §4) away from cross-user access.

## Rejected

- **A broad RLS policy "teachers can select members' sessions"** — one policy across several tables,
  easy to get subtly wrong and hard to audit; functions return exactly the columns a screen needs.
- **Showing history from before joining** — surprising for the student, and not needed for Q1–Q4.
- **Self-serve teacher accounts** — deferred until a pilot has shown cost and abuse are manageable.
- **Writing teacher marks into the envelope** — would break ADR 0009's "nothing after marking changes a mark".

Spec: `docs/systems/teacher-dashboard.md`.

## Amendment (2026-11-05): co-teachers and several classes per student

Owner request. Two changes, the rest stands:

1. **A class can have co-teachers** (up to 5 teachers in all). The second grant path is the class owner
   sharing a co-teacher code; it can only be redeemed by an account that is already a teacher (invite-only
   still holds), and the owner can revoke it or remove the co-teacher at any time. The student's grant is
   unchanged: joining a class gives *that class's teachers* access, from the join date. Archiving and
   managing teachers stay with the owner. Marks remain per teacher.
2. **A student may be in up to 5 classes.** Joining one no longer leaves another. Each class's teachers see
   only that class's window; leaving is per class.

Rejected: a shared "school" account that sees every class (no such need yet), and silent co-teacher access
granted by an admin (the owner should decide who sees their students).

