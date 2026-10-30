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

## Phase 5 — Progress

- **No exam target.** The design's dashed "Target 32" line and "N more to
  reach your target" need a target the app doesn't store (there is no
  target field in the coach profile, onboarding or Supabase). Rather than
  invent one, the chart has no target line and the insight sentence only
  says how far the total has moved since the first counted Exam Sim. Adding a
  target is a small product decision (where it's set, whether it syncs) —
  flagged for the owner.
- **Learn average** (at-a-glance) is the mean of every scored Learn answer
  (`learnAverage` in `progressSummary.ts`) — `Session.score` is always Exam
  standard, never the marked level, so "At Exam standard" is true. It is "—"
  until a scored answer exists.
- **Consistency grid** uses the same UTC date keys as the existing
  `daysPractisedWithin` (`practiceDays` helper), so its count agrees with the
  rest of the summary. "best N days" is left out: the app keeps no reliable
  longest-streak value (`longest_streak` is set to the current streak).
- **Past attempts:** each Learn row now carries its `topicKey` (added to the
  `PastAttempt` read model) for the chip and French name. Exam rows are titled
  "Exam Sim" and tagged "Counted in your Exam figures" / "Practice · not
  counted"; the PastAttempts test was updated for the new tags and a filter
  test added. Paging ("Show more") applies within the active filter.
- **Next step** text comes from `nextStep()` unchanged, so topic names there
  are the English labels it already produced.
- The old `LearnProgress` card was split into **Consistency** and **Topics**
  (it keeps `data-testid="progress-learn"` on Consistency); the "Topics
  mastered" stat folded into a "Mastered" tag on topic rows.

## Phase 6 — Profile

- **AI feedback stays read-only.** The old Profile showed the three engines
  as radios that did nothing (Offline always looked selected, while the app
  actually used Groq). Learn overhaul Batch 2 decided the learner does not
  pick an engine, so making the radios switch `preferredEngine` would be a
  product change. The group now shows the engine really in use ("In use"
  badge), the rows are `aria-disabled`, and a note says the app picks the
  engine and falls back automatically. The prototype's "Recommended" badge on
  Offline is not used — it would recommend the weakest engine. Wiring
  `SET_AI_ENGINE` (it exists) is a one-line change if the owner wants the
  choice back.
- **Achievements use lucide icons** (`features/profile/achievementDisplay.ts`),
  unlocked first, then locked ones closest to unlocking. Locked tiles are
  recessed, never faded. Progress ("c/max") is shown only where the app keeps
  an honest count — sessions, streak, XP, topics practised, first exam, an 8+
  score; the rest say "Locked". Hidden achievements stay out of the grid until
  unlocked (the count still says "of 20"). "Unlocked {date}" shows the date
  only when one is stored; today's achievements carry no unlock date, so they
  read "Unlocked".
- **Learning goals** show only what exists: the exam board (from the active
  goal's type), the exam date with a days-to-go pill, the goal and weekly
  minutes if set. There is no "Exam Sim target" (see Phase 5); without any
  goal a one-line empty state shows.
- **Identity:** initials avatar unless a shop avatar/frame is equipped;
  "learning since" is the coach profile's creation month; the nameplate
  rarity colour is kept (shop is hidden at launch). The guest badge and the
  "saved on this device only" line are kept.
- **Age band and guardian flow** keep every step, restyled into the Account &
  data group: the row shows the band and consent status, the action and the
  email / sent / copy-link states sit under it.
- **Delete dialog** is portalled to `<body>` (the route wrapper is a stacking
  context, so it couldn't cover the rail), focuses Cancel, closes on Escape or
  a scrim click, and uses the new `danger` button.
- **Replay tour** is now a settings row (`ReplayTourButton`), and the Learner
  track switch (Junior, behind its flag) is unchanged inside its own group —
  it still carries its two emoji, as it lives in the Junior feature.

## Phase 7 — polish

- **Checked at 390 and 1280, light and dark,** on `/`, `/learn`, a topic
  setup, `/progress` and `/profile` (Playwright, seeded local data): no
  horizontal scroll, no visible text below 12px, no runtime errors. Clicked
  through Home → Learn → topic → session (record, stop, confirm, feedback) →
  Progress → Profile.
- **Celebrations rebuilt** (`CelebrationModals.tsx`, `App.tsx`): the level-up
  modal (confetti, glowing looping trophy, "+5% XP" and "Advanced Labs" perks
  that don't exist), the achievement toast (emoji, confetti, a "+250 XP
  reward" that is never awarded) and the XP toast (9px uppercase "You're
  crushing it!") are now one v2 toast each, centred above the dock, with
  honest copy. Only one shows at a time; the top bar's XP pill counts up
  alongside.
- **Session toasts** (halfway, difficulty change, answer streak) use the same
  toast pattern (`SessionToast.tsx`), with a Flame icon instead of emoji.
- The crash screen (`AppErrorFallback`) lost its croissant emoji.
- `Button`'s `danger` label uses `text-action-ink` — `text-white` is still
  patched to dark ink in light mode by a legacy rule.

## Couldn't match (or chose not to)

- **Difficulty labels** stay Easier / Right for me / Harder (live spec), not
  Comfortable / Balanced / Push.
- **Exam target** (Progress target line, "N more to reach your target",
  Profile's "Exam Sim target" row) — no target exists in the data.
- **"best N days"** on the streak line — no reliable longest-streak value.
- **AI feedback radios** are read-only and show the engine really in use, not
  a selectable "Recommended: Offline".
- **Achievement unlock dates** — not stored; tiles say "Unlocked".
- **Out of scope, still on the old style:** feedback (`FeedbackExperience`,
  examiner feedback, Say-it-again, pronunciation cards and badges),
  `SessionComplete`/`SessionSummary` (confetti, emoji), Exam mode screens
  (warm-paper voice, untouched apart from the serif face), the Junior track,
  and every hidden (launch-scope) screen. They pick up the new tokens and
  font automatically but keep their own layouts and some legacy motion.

## Scenarios (role-play flow)

- **Scope:** the screens a learner reaches from Explore → Scenarios — preparation
  (`ScenarioPrepScreen`), play (`VisualNovelView`, shared with Story mode) and the
  debrief in `RoleplaySession`. The Scenario Architect (AI Labs) is not redone.
- **No immersive overlay.** Play used to be a `fixed inset-0` dark scene with a
  gradient, floating emoji and bouncing dots. It is now a normal screen under
  `MainLayout`: `TopContextBar` (back, mute toggle), the character, their line,
  a "Your move" card and the recorder. Desktop puts the mission list and coaching
  notes in a right column; mobile hides the dock (`useHideDock`), docks the
  compact recorder at the bottom and opens the notes in a sheet.
- **`ScenarioBackground` is deleted** (gradient, noise, looping emoji). The
  character is a static portrait chip; their reaction is a one-line mood caption
  instead of the scale/rotate expression motions, which are not among the eight
  named motions. The `expression` prop is kept for Story mode.
- **Prep uses `Segmented`** (Briefing / Study list / Flashcards) and one primary
  "Start role play". Flashcards no longer flip in 3D: tap "Show translation".
- **"You could have said"** in the live coaching panel is a model answer, so it
  uses `font-exam`; everything else is Bricolage.
- **Back returns to the scenario list.** Explore's Modes/Scenarios switch is now
  the `?view=scenarios` search param, so a scenario's back button (and its
  debrief exit) lands on the Scenarios view, not Modes. The Scenario Architect's
  session sends its scenario back to the architect page, which shows it again.
- **Vocabulary articles** go through `features/roleplay/vocabDisplay.ts`: most
  deck entries already write the noun with its article, a few don't, so the
  article is added only when missing ("le pain", never "le le pain").
- **Scenario Architect** (setup and session) is on the same v2 layout as the
  scenarios: top bar with back, flat cards, the shared recorder, no bouncing dots.


## Rapid Fire

- **Scope:** `/rapid-fire` (Explore → Words & Grammar) rebuilt on the v2 tokens:
  `TopContextBar`, `PageShell`, `Button`, `Stat`, `TopicChip`, `CountUp`. Flag
  `rapidFire` is now `live` (it was `coming-soon`); rollback is setting it back.
- **No XP, no session, no streak (owner, 2026-10-30).** The old screen paid out
  through `completeMinigameSession`. The new screen takes nothing from
  `AppContext`; points are a game score only, labelled "Points", never styled as
  XP (no reward colour). `features/rapidFire/__tests__/noXp.test.ts` fails if
  the screen or its folder imports an XP, session or app-state API.
- **Rules live in `features/rapidFire/run.ts`** (a pure reducer, the screen owns
  the clock and the shuffle): 60 s, 3 hearts, a wrong answer or skip costs 2 s,
  every 5 in a row adds 2 s (banked time capped at 75 s), every 10 wins a heart
  back, combo multiplier from `DEFAULT_STREAK_TIERS` (up to ×5). Difficulty ramps
  on correct answers, not on the streak, so one slip doesn't drop a strong
  player back to easy words. The clock stops while a correction is showing or
  the run is paused; Escape pauses (it never leaves mid-run); switching tabs
  pauses.
- **Marking (`judge.ts`):** accents, case, punctuation and hyphen-vs-space are
  ignored (typing é on a phone is slow) but a missed accent is shown, not
  penalised. The article must be right: "le pomme" is wrong, not a typo. One
  typo (two on answers of 13+ letters; swapped neighbours count as one) is
  "Almost": free, no points, the streak holds, the fix is shown.
- **Word bank (`wordBank.ts`):** built from data the app already has (Learn
  `keyVocab`, Emoji Master nouns, minigame phrases). Learn's glossary entries
  aren't typable as written ("fascinant(e)", "le/la proviseur(e)",
  "utile/inutile"), so `parseVocab` expands them into accepted spellings, splits
  antonym pairs, and drops entries that can't be answered from the English
  alone. The old Basics/Objects/School/Food pools became Mixed, Phrases,
  Everyday objects and all sixteen core topics. Gated advanced topics are not
  offered. Object words keep their article (the old screen stripped it).
- **Correction uses the `correct` motion** (strike the typed form, drop in the
  fix, underline); the combo chip uses `enter`, the personal-best pill
  `celebrate`, the score `fill` (count-up). Removed: the shake, overdrive glow,
  floating "+XP", pulsing timer, hover scale and gradients.
- **Personal bests** per word set are kept locally (`rapidFireBests`, versioned,
  like Emoji Master's). Drills and abandoned runs never touch them.
- **Practise missed words** runs a drill: the words missed, skipped or
  near-missed come round again until each has been typed right once.
- **Not done:** no sound effects, no analytics events, no leaderboard.

## Word Drop

- **Rebuilt as a v2 game, with no role in XP (owner, 2026-10-30).** The old
  screen awarded XP, wrote a `Session` and ran dark-theme styling. The new one
  (`screens/WordDrop.tsx` + `features/wordDrop/`) never imports progression,
  analytics, `AppContext`, the coach or sync, and never calls `awardXP`,
  `ADD_SESSION` or `recordSession`; `wordDrop.isolation.test.ts` pins it. So a
  round also adds nothing to the streak, mastery, review or evidence. Its one
  write is a personal best per direction and pace plus the last setup
  (`bestStore.ts`, key `wordDropBests`, local only). If the owner later wants
  Word Drop to pay XP, that is a new decision, not a re-wiring of this file.
- **Real vocabulary, not a 33-word list.** The pool is every playable
  `keyVocab` pair in the Learn bank (about 2,450 words over the 16 core topics).
  `wordPool.ts` drops frames ("je trouve que…"), alternatives ("utile/inutile")
  and long phrases, and turns a multi-sense gloss into every accepted answer.
- **Both directions.** French→English, or English→French (accents optional,
  articles optional, `fascinant(e)` takes either ending).
- **Forgiving matching.** Live typing clears on an exact answer unless it could
  still become a longer one; Enter also accepts a typo or two on longer words.
  A wrong Enter costs nothing.
- **The loop that teaches.** A missed word returns "Again" after five spawns;
  the results list what still got past, with a French voice (`HearButton`, only
  with a real French voice) and a drill of just those words.
- **Pacing.** Waves every eight clears (faster, tighter, more words at once),
  a multiplier every five in a row, a heart back every ten. A hint (first
  letter and length) appears once a word is low. The round pauses when the tab
  is hidden, with Escape, or from the top bar.
- **Motion.** The fall is the game itself, driven per frame; everything else
  uses the named motions: `correct` (a missed word is struck through and its
  answer drops in), `streak`, `fill` (wave bar), `celebrate` (new best),
  `enter`. No shake, glow, confetti or hover scale. Under reduced motion a card
  steps down in rows instead of gliding.
- **Flag.** `wordDrop` is now `live` and the Explore tile was already there.
- **Dropped from the old screen:** "Fun Mode" (random speed changes) and the
  BETA badge.


## Shop

- **Scope:** `/shop` (Explore → Shop) rebuilt on the v2 tokens: `TopContextBar`
  (back to Explore), `PageShell`, `Card`, `Segmented`, `Button`, `Modal`,
  `CountUp`. The screen is `screens/Shop.tsx`; its parts are in
  `features/shop/` (`ShopHeader`, `ShopItemCard`, `ItemDetail`, `ItemTile`,
  `RequirementBar`, `CollectionBar`, and the pure `itemState.ts`). The economy,
  the RPCs and the catalogue are untouched — this is presentation and flow only.
  `shopDesignRules.test.ts` bans raw palette colours, hex, gradients, glow/blur,
  looping motion, hover/tap scale, `layoutId` flights and text under 12px there.
- **A purchase is confirmed.** The old card bought on one tap. Now the card's
  price button opens the item dialog (`Modal`: a centred dialog on desktop, a
  bottom sheet under 640px, portalled to `<body>` so it covers the dock and
  rail), which shows balance, price and "After buying", with one primary
  button. A failed purchase keeps the dialog open with the plain reason; a
  successful one closes it and says what happened in a status line. Short on
  gems: the button reads "Not enough gems" and the dialog says how many
  sessions away it is — never a top-up prompt. A guest sees a sign-in note and
  cannot buy.
- **Locked is recessed, never faded.** The old Locker dimmed unowned items to 50%
  opacity; they are now `surface-recessed` cards at full contrast with a lock
  badge, the requirement and a real progress bar (`progress` role, `fill`
  motion, no gradient). A locked item's dialog links to the practice that
  advances it (`practiceLinkFor`: Exam, Explore for role plays, else Learn),
  as Shop plan §8 asks.
- **Identity is grouped** into Avatars, Frames and Nameplates (it was one flat
  grid). **Locker** shows "N of M collected", an All / Owned / Not yet filter
  (compact `Segmented`), owned items first, and the gem ledger, which now says
  "Sign in…" for a guest instead of "No transactions yet".
- **Rarity uses role tokens.** `RARITY_COLOR` (text) and `RARITY_RING` (ring) are
  CSS variables — common ink-muted/hairline, rare progress, epic action,
  legendary reward — so Profile and Rankings nameplates follow the theme too.
  Rarity is one word and a hairline ring, as the plan says.
- **Motion:** the gem balance counts with `fill` (`GemBalance` → `CountUp`),
  cards use `enter`, tabs use `Segmented`'s `slide`. Removed: the balance
  shake, the `y: -2` hover lift, the shared-`layoutId` "equip flies home"
  flight (not one of the eight motions; the header look simply updates) and the
  popLayout reflow. A failure is an inline message, not a shake.
- **Header look fixed.** The header rendered the default 👤 emoji and ignored the
  equipped avatar (it passed `avatarEmoji={null}`). It now resolves the avatar's
  icon from the catalogue, and with nothing equipped shows the initials avatar.
  `UserAvatar` had the same latent bug (it passed the item id as the emoji) and
  resolves the icon too; `CosmeticPreview` shows initials, not 👤, when there is
  no avatar. The catalogue icons (emoji) stay: they are item artwork, like Emoji
  Master's prompts, not interface chrome.
- **Copy:** the Explore tile was "XP Shop — Spend XP on themes and power-ups";
  the shop sells for gems and has no themes, so it is "Shop — Spend gems on
  streak safety and your look".
- **Not done:** drag-to-dismiss on the mobile sheet (Escape, the scrim and Cancel
  close it), the "Now available" ribbon for newly unlocked items (needs a stored
  "seen" set), and the TopContextBar gems pill from Shop plan §13.
