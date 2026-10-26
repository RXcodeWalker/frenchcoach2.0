# Implementation decisions — Design System v2 redesign

Decisions made while rebuilding the designs in the real app, where the
handoff left a gap or clashed with the codebase. Newest phase last.

## Phase 1 — tokens and foundations

- **Token drop-in applied verbatim**, plus one extra token, `--ease-slide`
  (`cubic-bezier(.34,1.35,.64,1)`), which the README lists but the drop-in
  omits. `src/screens/learn/__tests__/tokenContrast.test.ts` (AA in both
  themes) still passes against the new values.
- **Light is the default.** `index.html`'s pre-paint script and `AppContext`
  now treat a missing `frenchCoach_darkMode` as light. Anyone who had
  explicitly toggled dark keeps it (`'true'` is still honoured).
- **`font-numeral` is kept as a class name** (25 call sites) but now means
  Bricolage 500 with tabular figures — the mono face is retired, as the design
  system says. `font-display` likewise maps to Bricolage.
- **Fonts:** index.html loads only Bricolage Grotesque (variable opsz/wdth/wght)
  and Libre Baskerville. Inter, Instrument Serif, IBM Plex Mono and Newsreader
  are no longer loaded. The exam's `.exam-serif` slot (Exam mode only) is now
  Libre Baskerville instead of Instrument Serif / Newsreader — "no third
  typeface". This changes the exam paper voice's serif face; nothing else in
  Exam mode was touched.
- **`.btn-primary` is flattened, not deleted.** The design system says delete
  it; nine call sites live in screens outside this redesign (feedback panel,
  session complete, exam results, duels). Deleting it would leave unstyled
  buttons there, so the class now *is* the v2 primary (solid `--action`,
  colour-step hover, press .97, no gradient/glow/scale-on-hover). `pulseGlow`
  and the other unused keyframes (`shake`, `ping`, `slideIn`, `modalIn`,
  `levelUpBurst`) are deleted.
- **Motion:** the eight named motions live in
  `src/components/motion/variants.ts`. `fadeUp` stays exported as an alias of
  `enter` so the ~25 existing imports adopt the new motion without a rename
  sweep. The route transition is now a plain fade (cards inside carry the
  rise) and keeps `AnimatePresence mode="wait"` — Learn's `?topic=` deep link
  depends on the exit animation.
- **"Remove any other motion" is scoped to the shell and the five launch
  screens** (Home, Learn, Exam entry, Progress, Profile) plus shared
  components. Hidden screens (launch scope, `src/config/launchScope.ts`) still
  carry their own `animate-pulse`/`animate-bounce` loops; sweeping ~25 hidden
  screens would be churn on code no learner can reach. Feedback and
  SessionComplete are left alone as instructed.
- **Legacy light-mode patches stay** (`html:not(.dark) .text-white` etc.). They
  only exist for hidden/legacy screens that still use colour-named classes;
  the redesigned screens use role tokens and never rely on them.

## Phase 2 — shared UI

- **Top bar stays per screen** (`<TopContextBar>` rendered by each screen, as
  before) rather than moving into `MainLayout`: Learn needs to swap title,
  subtitle and back button per state, and hidden screens already render their
  own. Progress and Profile gain one in their phases. It is sticky over a
  `bg-bg` strip so content never shows above the card, matching the
  prototype's fixed bar.
- **Avatar:** initials in a circle (`UserAvatar`). An equipped shop avatar or
  frame still renders through `CosmeticPreview` (shop is hidden at launch, so
  this is rare) — that keeps the existing behaviour, although the shop's
  avatars are emoji.
- **Celebrate / streak motions live in the top bar.** It remembers the XP and
  streak it last showed (module scope); when they have grown on the next screen
  that shows the bar, the XP counts up from the old total and the streak number
  rolls with the flame wiggle. First paint after load never animates.
- **Button sizes:** lg 48, md 44 (the touch minimum), sm 40. Disabled buttons
  use the track fill and `--ink-subtle` instead of 40% opacity. A new `danger`
  variant is the correction-filled confirm used by the delete dialog.
- **Segmented control** is a new shared component (`ui/Segmented.tsx`) with the
  sliding indicator; options are `aria-pressed` buttons in a labelled group,
  as in the prototype.
- **Topic icons/hues:** `src/features/topics/topicVisuals.ts` maps every topic
  key to a lucide icon and an OKLCH hue (the design system's table for the 16
  core topics; the 8 gated advanced topics got hues between them). `Topic.icon`
  (emoji) stays in the data for screens outside the redesign. Chip colours are
  computed in CSS from `--h` (`.topic-chip`), so they follow the theme without JS.
  lucide-react is 0.344, so a few names differ from the prototype
  (`Palmtree`, `Home`, `BarChart3`, `Loader2`).
- **Mobile dock hides during a Learn session** via a small shell context
  (`useHideDock`), as in the 2a mobile frame.
- **Reduced motion:** `MotionConfig reducedMotion="user"` at the app root, so
  `enter` becomes a fade and transforms are dropped; count-ups show the final
  value.
- **Count-ups render the settled number under Vitest** (`import.meta.env.MODE
  === 'test'`) so tests read real values, not a frame of the animation.

## Phase 3 — Home

- **Desktop vs compact is decided in JS** (`useIsDesktop`, the md/768px line
  where the rail replaces the dock), because the two layouts differ in
  content, not just size. Rendering both and hiding one with CSS would
  duplicate every number for screen readers and tests.
- **Greeting uses the username** ("Salut, lea_m.") — the app has no first
  name. A guest or a learner without a username sees "Salut."
- **Level bar** uses the real five-level ladder (`levelProgress` added to
  `progressionService.ts`, next to `levelFor`): "Level N · X XP to Level N+1",
  "Top level" at Beast Mode.
- **"Up to +N XP"** is computed from the canonical formula:
  `LEARN_ANSWERS_PER_DAY × computeXPGain(10, streak)` — the most a full
  session can earn today (boosters not included). The prototype's "+90" was
  sample data.
- **Today's plan** comes from the coach's session blend: Warm up (at your
  level) → Review (when spaced-review items are due, else "Build on it") →
  Stretch (named after the coach's first focus skill when there is one).
  There is no per-step data model behind it; it describes how a session is
  built.
- **Coach's pick** is the daily plan's topic when it names one ("Today's
  focus"), else the weakest-scoring topic ("Weakest topic"), and opens that
  topic's setup (`/learn?topic=`). On mobile it is the "Focus:" strip at the
  bottom of the mission card, as in the compact frame.
- **This week** reads `getDailyStats(7)`; a day with no scored session shows
  the dashed baseline (bar) or "—" (cell), never 0.
- **Recent activity** now shows real XP: `AppContext` was mapping every stored
  session's XP to 0 on load, so the list read "+0 XP". It now carries
  `xpEarned`, `practiceOnly` and `examMarks` through. Exam rows read "/40" and
  use a graduation-cap chip.
- The **weekly review** banner is kept (below the coach's pick) and restyled
  with tokens; Quick access and the stat tiles that the old Home carried are
  gone from Home (Profile and Progress hold those numbers now).

## Phase 4 — Learn flow

- **Difficulty labels stay "Easier / Right for me / Harder"**, not the
  prototype's "Comfortable / Balanced / Push". The live spec
  (`docs/systems/learn-adaptive-difficulty.md`, Batch 2 amendment) renamed
  them on purpose and `SessionStartScreen.test.tsx` pins it; the design used
  the older names. The control itself is the designed segmented control.
- **The level read-out keeps the real wording** (`measuredLevelDisplay`, e.g.
  "Starting point: Exam level (A2) · We'll adjust as you answer") instead of
  the prototype's bare "A2".
- **Setup summary**: questions = today's session length (the launch limit),
  "about N min" at 4 minutes a question (the prototype's figure), and
  "up to +N XP" from `computeXPGain` — participation XP only when the marking
  level is below Exam standard, and hidden in the Examiner style (examiner
  answers earn no XP).
- **The in-screen back button is gone**; the top bar carries back ("Back to
  topics" on setup, "Leave session" in a session), as in the prototype.
  `onBack` stays on `SessionStartScreen`'s props for callers.
- **Stepped processing is driven by real state**: *Transcribing* while the
  Whisper double-check runs or before the stream reports a phase; *Checking
  grammar* while the stream is `generating`; *Scoring* once sections stream
  in. The Examiner style's third step reads *Writing comments* (it never
  scores) and it shows *Checking grammar* until its comments arrive. The
  transcript-confirm card now appears only once there is something to
  confirm (its own "Double-checking…" state was the same information).
- **Feedback is untouched** (`FeedbackExperience`, `LearnExaminerFeedback`,
  the Predict card that fills the wait, `SayItAgainCard`), as are
  `SessionComplete`/`SessionSummary`. The recovery-drill card, the examiner
  Continue button and the "Feedback unavailable" toast sit in Learn.tsx, so
  they were restyled with tokens.
- **The live waveform is new** (`LevelBars` in `RecordingPanel.tsx`): 40 3px
  bars following `micLevel.levelRef`, written to the DOM per frame. The exam's
  `ScrollingWaveform` is unchanged.
- **Mobile session** follows the compact frame: the question is a centred
  stage, the recorder is a sticky dock at the bottom, and the app dock hides.
- **Topic tiles** show real progress from `topicMastery` (answered of the
  topic's question count, average or "Not started"); "Coach's pick" badges the
  active recommendation's topic. Locked advanced topics are recessed with a
  lock icon and their reason — no opacity. "Random Question" became "Random
  question" (sentence case, as designed; the test was updated).
- **Sticky top bar fix:** `MainLayout`'s root had `overflow-hidden`, which
  made it the sticky container, so the bar scrolled away. It is now
  `overflow-x-clip`.
