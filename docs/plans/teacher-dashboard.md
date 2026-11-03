# Teacher dashboard — plan

Status: **plan only, nothing built.** Written 2026-11-03 against the code as it stands on that date.
Owner decisions needed before Stage 1 are in §9 (D1–D8), each with a recommendation.

---

## 1. The bet (what makes this worth building)

A Cambridge 0520 speaking teacher **is the examiner**: they conduct and mark component 3 themselves,
and a sample goes to Cambridge for moderation. They already know the rubric better than any dashboard
can explain it. What they lack is *time*: a class of 25 cannot each get a mock speaking exam every
week, and nobody hears what students say when they practise at home.

So the dashboard is **not** a reporting screen with lots of charts. It answers four questions a teacher
actually has, in this order of how often they ask them:

| # | Teacher question | How often | Stage |
|---|---|---|---|
| Q1 | **Who is practising, and who isn't?** | Every week | 1 |
| Q2 | **What should I teach on Monday?** (what the class keeps getting wrong) | Every week | 2 |
| Q3 | **Did they do what I set?** | Per piece of homework | 3 |
| Q4 | **Can I trust the AI mark on this attempt?** | When a mark surprises them | 4 |

Everything else (charts of XP, leaderboards, gems, badges, chat, LMS sync) is cut from v1 — see §8.

### Design principles

1. **Push beats pull.** Teachers will not open a dashboard daily. The most-used surface will be a
   **Monday-morning email digest** (Q1 + Q2 in five lines, with a link). The dashboard is where you
   go *after* the email makes you curious. Resend is already wired for notifications
   (`scripts/scheduledJobs/sendNotifications.ts`), so this is cheap.
2. **Every number is honest about how much evidence is behind it.** "Predicted 27/40" from one
   attempt is a lie. Show "27/40 — 1 counted attempt" and refuse to show a trend below 3 counted
   attempts. Show coverage on class patterns ("based on 14 of 18 exam attempts").
3. **The dashboard never changes a mark.** Same rule as the post-marking report (ADR 0009). A
   teacher's own mark is stored beside the AI's, never over it (§6).
4. **A teacher sees only what the student already sees, plus who-did-what.** If a surface is mark-free
   for the student (Learn's Examiner voice, the Junior track), it is mark-free in the dashboard too.
5. **Desktop-first.** Teachers plan on laptops. Students are mobile-first; the teacher area is the
   opposite (still usable on a phone, but tables and a wide layout are the default).

---

## 2. What the app already gives us (and what it doesn't)

Grounded in the code on 2026-11-03.

### Already server-side and usable

| Data | Where | Gives the teacher |
|---|---|---|
| `sessions` rows (one per answered question/attempt, 90-day sync window) | `services/sync/sessionSync.ts` → `sessions` table | Activity, topic, score, word count, duration, CEFR level, critical-issue count, one-line feedback summary, transcript (cut to 2,000 chars) |
| `scoring_envelopes` (one per marked exam attempt) | `server/index.ts` | The /40 with the three areas (role play /10, communication /15, quality of language /15), QoL errors with quotes and corrections, excused sound-alike errors |
| `session_transcripts` | `server/index.ts` | The full exam transcript |
| `exam_feedback_reports` (service key only) | `server/feedbackRoute.ts` | Error **categories** (`tense`, `verb_form`, `auxiliary`, `agreement`, `gender`, `preposition`, `word_order`, `vocabulary`, `other` — `examFeedback/shared/errorCategories.ts`), but **only when the student opened the report** |
| `coach_evidence` | `services/sync/coachSync.ts` | Skill-node evidence from Learn |
| `profiles` | — | Display name, streak-adjacent fields, `age_band`, `consent_status` |
| `TeacherMarkSet` type + diff | `domain/igcse/comparison/teacherMark.ts`, `diff.ts` | A validated teacher-mark shape and an AI-vs-teacher comparison — **built for calibration, never wired to a UI**. Stage 4 reuses it. |
| `invite_codes` table + redemption RPC | migration `20260914090000` | A working code mechanism to copy for class join codes |

### Gaps that block an honest dashboard (fix in Stage 0)

1. **The server cannot tell a counted Exam Sim attempt from a Coached one.** `Session.practiceOnly`,
   `examMarks` and `scoringSessionId` are dropped by `sessionToRow` (a known gap in CLAUDE.md), and
   `earlyStart`/`resumed` are local-only. Without this, a student's Coached practice — typing
   allowed, transcript editable — shows up as a real mark. **This is the single most important fix;
   without it the "predicted mark" is wrong.**
2. **No audio is kept.** Exam recordings live only in browser memory (`examAudioStore`). A teacher
   can read a transcript but cannot listen. Storing audio is a cost and storage decision (D5); v1 is
   transcript-only and says so on screen.
3. **Error categories exist only for opened reports** (above). Class patterns must show coverage, or
   Stage 2 adds a cheap categorisation pass (D6).
4. **Guests have no account**, so they can't join a class. Joining a class requires signing in.
5. **Local-only data stays local.** The notebook, the speaking log and the Pronunciation Lab history
   are pinned local by privacy tests (`notebookPrivacy`, `speakingLogPrivacy`, `labStorePrivacy`).
   The dashboard **never** reads them. Don't relax those tests to feed the dashboard.
6. **Usage limits collide with homework.** 3 AI-marked Learn answers/day and one exam per rolling
   7 days (`ai_quota_limits`, `server/examAllowance.ts`). A teacher who sets a mock exam on Tuesday
   cannot have students blocked because they used their weekly exam on Sunday. Stage 3 handles this
   with assignment-bound allowance (§5.3) — and that has an AI-cost consequence (D3).

---

## 3. Shape of the solution

```
Student app (unchanged screens)          Teacher area  /teach/*  (new layout, own nav)
  Profile → "Join a class" (code)          Classes → Class
  Home → "Set by your teacher" card          ├─ This week   (Q1)
        (Stage 3)                            ├─ Insights    (Q2)
                                             ├─ Homework    (Q3)
                                             └─ Student → Attempt review (Q4)
          │                                        │
          ▼                                        ▼
   existing sync (sessions, envelopes…)   SECURITY DEFINER read RPCs  (class-scoped)
                     │                             │
                     └──────────►  Supabase  ◄─────┘
                                       ▲
              GitHub Actions weekly job: teacher digest email (Resend)
```

- **No new service.** Teacher reads are Supabase RPCs called from the frontend, like the rest of the
  app. Aggregation logic lives in a pure, tested module (`src/domain/teacher/`), fed by RPC rows, so
  the same functions drive the screen and (ported or shared via `scripts/`) the digest.
- **Teacher area is its own route tree** (`/teach/*`) with its own layout — not a new tab in the
  student nav (`launchScope.ts` stays as is). A teacher account can still use the student app.
- **Design System v2** throughout (role tokens, Bricolage, the eight motions). Tables are new
  components in `components/` built on the existing tokens.
- **Don't build on `StudyGroups.tsx`.** It is a mock screen on `data/mocks/mockGroups` with a
  different model (peer groups, discovery). Leave it hidden; classes are a separate concept.

---

## 4. Security model (not deferred — read before Stage 1)

Per CLAUDE.md, privacy/consent work is deferred by owner directive; **security is not**. A teacher
reading a student's data is a cross-user read, which is exactly where this schema has been burned
before (`docs/systems/data-model.md` §4).

1. **Access comes from the student's act of joining, nothing else.** A teacher can read a student's
   data only while there is an `active` row in `class_members` for a class that teacher owns. The
   student joins with a code; the student can leave at any time (access ends immediately); the
   teacher can remove a student.
2. **Reads are `SECURITY DEFINER` RPCs returning narrow shapes**, never a new broad RLS policy on
   `sessions`/`scoring_envelopes`. Each RPC checks `auth.uid()` owns the class and the student is an
   active member, and returns only the columns the screen needs. This keeps the student's own RLS
   untouched and avoids the "policy looks live but grant is revoked" class of bug.
3. **Every new function and table carries the explicit grant footer** (`REVOKE … FROM PUBLIC, anon,
   authenticated`, then `GRANT … TO authenticated` only where client-facing), and every new table
   gets an explicit `GRANT` (`auto_expose_new_tables` is off). Executable specs go in
   `backend/supabase/tests/teacher_*.test.mjs`, run against a local stack only.
4. **Teacher identity:** a `teacher_profiles` row, created only by redeeming a teacher invite code
   (D1). Never `app_metadata.role` alone (same lesson as the admin allow-list).
5. **Data window:** a teacher sees a student's activity **from the join date onward** only, never
   their history before joining (D7 — recommended; it's also the less surprising behaviour for a
   student).
6. Sentry/PostHog rules apply unchanged: new events through `track()` with declared props (ids,
   counts, enums — never a student name or transcript).

---

## 5. Stages

Each stage ships on its own, behind a feature flag `teacherDashboard` (`coming-soon` until Stage 1
passes its checks; rollback = `coming-soon`). Each stage is usable by a real teacher on its own —
don't start the next until one pilot teacher has used the previous one for a week.

### Stage 0 — Fix the data the dashboard will stand on (prerequisite, no teacher UI)

- Add nullable columns to `sessions`: `practice_only boolean`, `exam_marks jsonb` (the three area
  marks), `scoring_session_id text`, `conduct_mode text` (`examSim`|`coached`). Write them from
  `sessionToRow`; read them back in `rowToStoredSession` (this also closes the CLAUDE.md "restored
  session loses them" gap — update that Known Trap when done).
- Server side, record on the envelope row whether the attempt was Exam Sim and counted, so the
  teacher RPC can trust the server copy rather than a client-written `sessions` row
  (client-written rows are claimable; `scoring_envelopes` are server-written). Recommended: a
  `counts_toward_progress boolean` + `conduct_mode` column on `scoring_envelopes`, sent with
  `POST /score` and stored by `server/index.ts`. **This touches `server/` — follow the
  Assessment-Engine change procedure** (it does not change a mark, but it's in the scored path).
- Tests: `sessionSync` round-trip keeps the new fields; a Coached attempt is never `counts=true`.

### Stage 1 — Classes + "This week" + Monday digest (answers Q1) — the MVP

**Teacher:**
- Redeem a teacher invite code → becomes a teacher.
- Create a class (name, exam year e.g. "June 2027"). Gets a 6-character join code (unambiguous
  alphabet, no 0/O/1/I), shown big for projecting on a whiteboard, with a copy-link button
  (`/join/ABC123`). Regenerate/disable code.
- **This week** table, one row per student, sorted with *least active first* (the students who need
  a nudge are at the top, not buried):
  `Name · last active · answers this week · speaking minutes this week · exam attempts (counted) ·
  latest counted /40 (n attempts)`. Week = Monday–Sunday in the teacher's time zone.
- Remove a student. See pending (joined but never practised).

**Student:**
- Profile → "Join a class" → code → confirm screen ("Ms Dupont will see your practice activity,
  answers and exam marks from today. You can leave any time.") → joined. One class at a time in v1.
- Profile shows the class and a "Leave class" button.
- `/join/:code` deep link → sign-in if needed → same confirm.

**Digest email (weekly, Monday 07:xx teacher-local, GitHub Actions like the notifications job):**
> **Year 11 French — last week**
> 18 of 24 practised · 6 didn't (Aisha, Ben, …)
> 9 counted mock exams · class median 24/40
> Most common slip: **tense** (in 11 of 14 marked exams) → [Open Insights]

Sent only if the class has ≥ 1 member. One-click unsubscribe. Uses the claim-before-send pattern
from `sendNotifications.ts`.

**Schema (backend repo):** `teacher_profiles`, `classes` (owner, name, exam_year, join_code,
code_active), `class_members` (class_id, student_id, status `active|left|removed`, joined_at,
left_at). RPCs: `redeem_teacher_invite`, `create_class`, `rotate_class_code`, `join_class`,
`leave_class`, `remove_class_member`, `teacher_class_week(class_id, week_start)`.

**Done when:** a pilot teacher creates a class, 5+ real students join from their phones, the table is
correct against their own counts for one week, and the digest arrives on Monday.

### Stage 2 — Insights + student page (answers Q2)

**Class Insights** — three panels, each one sentence + evidence, no decorative charts:
1. **Common slips** — error categories ranked by *how many students* made them (not raw count — one
   student repeating an error 30 times shouldn't dominate), each with 3 real example quotes and
   corrections from envelopes/reports (student names hidden by default, toggle to show). Coverage
   line: "from 14 of 18 marked exams."
2. **Area weakness** — class median for role play /10, communication /15, QoL /15 over counted
   attempts, and which area is furthest below its band's "Good" range (rubric bands from
   `rubric.ts`, never restated numbers).
3. **Topics** — Learn topics practised vs avoided, and topic averages (`number | null`, never a
   fabricated 0).

**Student page:** counted /40 history (dots, not a smoothed line, until ≥ 3 attempts), area marks per
attempt, Learn topics covered, most frequent slips, recent attempts list → Stage 4 review. A clear
"Practice (Coached) — not counted" label on Coached attempts.

**Rules:** only `counts_toward_progress` attempts feed any mark summary (ADR 0007). Nothing shows a
grade (A*–G) — Cambridge grade thresholds aren't in `rubric.ts` and would be guesswork
(Core rule 3). Show the /40 and band labels only.

**D6** decides whether to fill the category gap with a small categorisation pass at marking time.

### Stage 3 — Homework (answers Q3)

- Teacher sets an assignment: **Learn topic set** (topic + number of answers, e.g. "Holidays, 5
  answers"), **Role-play card** (one of the 21 drill cards), or **Mock exam** (Exam Sim, optionally
  a specific exam set). Due date. Whole class or selected students.
- Student Home shows a "Set by Ms Dupont · due Fri" card that opens the exact activity.
- Status grid: student × assignment → `not started / in progress / done (on time | late)`.
- **Assignment-bound allowance (§2 gap 6):** copy the session-binding pattern
  (`docs/systems/data-model.md` §3). `start_assignment_attempt` reserves an `asg-<uuid>` session id
  and grants that attempt its own allowance (a mock exam doesn't consume the weekly exam; a Learn
  set doesn't consume the daily 3). The scoring/feedback route accepts the grant only with that
  session id — so a student can't turn homework allowance into unlimited practice. Cost is real:
  see D3.
- A homework mock exam is Exam Sim, counted like any other (it is a real attempt), unless started
  early/resumed — the existing `countsTowardProgress` rules apply unchanged.

### Stage 4 — Attempt review and teacher marks (answers Q4)

- Open any exam attempt: transcript (through `examFeedback/shared/displayRespell.ts`, so shown =
  marked), the AI's three area marks with band descriptors, the post-marking report, the excused
  sound-alike notes.
- Teacher can **Agree** or **Adjust** each area mark, with an optional comment → stored as a
  `TeacherMarkSet` (`domain/igcse/comparison/teacherMark.ts`) in a new `teacher_marks` table,
  **never** in or over `scoring_envelopes`. The envelope is untouched; the AI mark stays the AI mark.
- The student page shows both when they differ ("AI 26 · Teacher 29").
- Whether the student sees the teacher's mark is D4.
- **This is also the app's missing calibration signal.** The verification log records that real
  teacher-graded transcripts never materialised. A teacher marking alongside the AI produces exactly
  that. But per Core rule 5, *whether* these marks may enter a calibration set (and which are held
  out for validation) is an owner decision (D8) — the dashboard just stores them separately and
  never feeds them to the judge automatically.
- No audio in v1 unless D5 says otherwise; the screen says "Recording not kept" plainly.

### Stage 5 — Export (small, high value at report time)

- CSV per class: student, counted attempts, latest/best/median /40, area marks, homework completion.
- Print view of a student page for parents' evening.

---

## 6. Invariants this plan introduces (add to CLAUDE.md when each lands)

- A teacher reads student data only through class-scoped `SECURITY DEFINER` RPCs, only for active
  members, only from `joined_at` onward. No broad RLS policy on student tables for teachers.
- Teacher marks live in `teacher_marks`, never in `scoring_envelopes` or the envelope JSON, and
  never reach the judge prompt or calibration without an explicit owner decision.
- Mark summaries in the teacher area use only server-recorded `counts_toward_progress` attempts.
- The teacher area never reads the notebook, speaking log or Pronunciation Lab history.
- The teacher area never shows a mark for a surface that is mark-free for the student (Learn
  Examiner voice, Junior). Junior students are out of scope for v1 (they write no Session anyway).
- Write an ADR at Stage 1: "Teacher access to student data is granted by class membership."

---

## 7. How we'll know it works

North star: **% of class members with ≥ 1 speaking practice in the week** (from the same RPC as
"This week"). Secondary: teacher opens the digest/dashboard weekly; homework completion rate;
counted mocks per student per month; teacher–AI mark agreement rate (Stage 4).

PostHog events (declared in `telemetryService.ts`, props are ids/counts/enums only):
`teacher_class_created`, `class_joined` (`{ via: code|link }`), `class_left`,
`teacher_dashboard_viewed` (`{ tab }`), `teacher_digest_clicked`, `assignment_created`
(`{ kind }`), `assignment_completed` (`{ kind, on_time }`), `teacher_mark_saved`
(`{ agreed: boolean, delta }`). Volume is tiny (per teacher action, not per answer).

---

## 8. Deliberately not in v1 (and why)

| Cut | Why |
|---|---|
| Class leaderboards / XP / gems in the teacher view | Teachers prepare students for an exam; XP is a motivation tool, not evidence. Rankings demotivate the bottom half — the students the teacher most needs to reach. |
| Predicted grade (A*–G) | No sourced grade thresholds in `rubric.ts`; Core rule 3 forbids guessing. |
| Google Classroom / MIS roster sync | High value later for adoption, but join codes work for a pilot. Revisit after 3+ schools. |
| Teacher ↔ student messaging | Schools have their own channels; moderation burden. |
| Multiple classes per student, co-teachers, school admin | Add when a real school asks. Schema leaves room (class has one owner; add `class_teachers` later). |
| Audio playback | Storage cost + decision (D5). |
| Junior classes | Junior is mark-free and writes no Session; needs its own design. |
| A redesign of the student app | The student experience stays as is apart from Join/Leave and the homework card. |

**Deferred by owner directive (not a task):** consent and data-protection work for school use
(e.g. school-as-guardian for under-13s). Existing consent gates are unchanged. Flagging once,
because a real school procurement will ask about it before signing — it becomes blocking at the
first paid school, not before.

---

## 9. Owner decisions

| # | Decision | Recommendation |
|---|---|---|
| D1 | Who can become a teacher? | **Invite-only** (owner hands out teacher codes, reusing the invite-code pattern). Controls AI cost and stops strangers handing out codes to children. Open self-serve later. |
| D2 | Pilot target | **One real teacher with one real class before Stage 2.** Every stage after 1 is shaped by what they actually open. |
| D3 | Who pays for homework AI calls (Stage 3 bound allowance)? | Free during the pilot with a per-class weekly cap (e.g. one mock + 15 Learn answers per student per week). This is the natural paid tier later ("school plan"). Decide the cap before Stage 3. |
| D4 | Does the student see the teacher's mark? | **Yes, after the teacher clicks "Share with student"** — teachers want to check before a number goes out. |
| D5 | Keep exam audio for teacher review? | **Not in v1.** Revisit after the pilot asks for it; it's a storage/cost decision (Supabase storage, retention period). |
| D6 | Fill the error-category gap? | **Yes in Stage 2**: generate categories at marking time for attempts by class members only (bounded cost), or accept coverage-labelled patterns if cost matters more. |
| D7 | Teacher sees history before the join date? | **No.** From join date onward only. |
| D8 | May teacher marks enter a calibration/validation set? | **Decide later, explicitly.** Store them separately from day one so the option stays open; never auto-feed. |

---

## 10. Order of work (for the build sessions)

1. Stage 0 — data fixes (one frontend + one backend + `server/` change, with tests).
2. Owner answers D1–D3, D7. Recruit the pilot teacher.
3. Stage 1 — schema + RPCs + tests (backend), teacher area shell + This week + join flow (frontend),
   digest job. Flag `coming-soon` → `live` for the pilot.
4. One week with the pilot class. Fix what they hit.
5. Stage 2 → Stage 3 → Stage 4 → Stage 5, each followed by pilot use before the next.
