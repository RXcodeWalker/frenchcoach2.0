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
