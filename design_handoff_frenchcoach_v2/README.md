# Handoff: Français AI v2 redesign (Home, Learn, Progress, Profile)

## Overview
This is a redesign of the FrenchCoach / Français AI app (repo `RXcodeWalker/frenchcoach2.0`, branch `main`) on Design System v2. It covers:
- Home
- the Learn flow, from topics to setup to the recording session (feedback is designed separately)
- Progress
- Profile

Light theme is the primary theme. Dark mode works from the same role tokens.

## About the design files
The files in `designs/` are **design references built in HTML**: working prototypes that show the intended look and behaviour. They are not production code. Recreate them in the existing codebase (React + TS + Tailwind + framer-motion + lucide-react), keep using the real services and state, and follow the repo's existing patterns. All numbers in the prototypes are sample data.

To view them, open `designs/Home and Learn.dc.html` in a browser. It is a canvas of every frame:
- **2a:** Home and Learn
- **3a:** Progress
- **3b:** Profile

Each frame comes in a desktop (1280×800) and a mobile (390×844) version and is fully clickable. `designs/Design System v2.dc.html` is the source of truth for tokens, type, motion and components. It also contains a ready-made `src/index.css` token drop-in.

## Fidelity
The designs are **high fidelity**: final colours, type, spacing and interactions. Match them closely.

## Global rules (from project CLAUDE.md)
- **Fonts:** Bricolage Grotesque for everything.
  - Body text: 300.
  - Captions under 14px: 400.
  - Labels, titles and display text: 600.
  - Numerals: 500 with `font-variant-numeric: tabular-nums`.
  - Libre Baskerville only in Exam mode and in quoted model answers.
- **Banned:** emoji, gradients, glow or blur on controls, scale on hover, and any text under 12px.
- **One primary button per screen.**
- **Colour by role:**
  - action: violet
  - progress: green
  - reward: amber
  - streak: orange
  - correction: red
  - info: teal
- **Topic hue** appears only in the topic's icon chip. Chip colours: light background `oklch(0.955 0.03 h)` with icon `oklch(0.50 0.13 h)`; dark background `oklch(0.30 0.045 h)` with icon `oklch(0.80 0.11 h)`.
- **Motion:** only the 8 named motions (listed under Interactions below).

## Design tokens (light; dark values are in the design system file)
- **Surfaces:** bg `#F6F5F1`, surface `#FFFFFF`, surface-recessed `#F1F0EC`, surface-raised `#FFFFFF`
- **Lines:** hairline `rgba(28,25,20,.09)`, hairline-strong `rgba(28,25,20,.16)`, track `rgba(28,25,20,.08)`
- **Ink:** ink `#1C1A17`, ink-muted `#56524B`, ink-subtle `#6E6A62`
- **Action:** action `#7C3AED`, hover `#6D28D9`, press `#5B21B6`, action-text `#6D28D9`, action-soft `rgba(124,58,237,.08)`, action-ink `#FFFFFF`
- **Progress:** `#12805A`, text `#0C6646`, soft `rgba(18,128,90,.09)`
- **Reward:** `#C27C0E`, text `#8A5508`, soft `rgba(194,124,14,.10)`
- **Streak:** `#D4561C`, text `#B2430F`
- **Correction:** `#D63241`, text `#B3202F`, soft `rgba(214,50,65,.07)`
- **Info:** text `#0E6683`, soft `rgba(14,102,131,.08)`
- **Other:** focus `#7C3AED`, scrim `rgba(28,25,20,.36)`
- **Shadows:** card `0 1px 2px rgba(28,25,20,.05)`, overlay `0 16px 40px -12px rgba(28,25,20,.22)`
- **Radius:** controls 8, cards 12, pills 999.
- **Spacing:** 4, 6, 8, 12, 16, 20, 24, 32, 40, 48.
- **Page padding:** `clamp(24px,4cqw,40px) clamp(16px,3cqw,32px) 48px`, with max-width 1120 (Home 920).
- **Type scale:** display 60/1.0 -0.035em · h1 40/1.05 -0.025em · h2 30 or 22 at 600 · section heading 16/600 · body 15/1.6 at 300 · secondary 14 and 13 · eyebrow 12/600 uppercase 0.06em · big numerals 52, 32 or 28 at 500 tabular
- **Durations:** state 120ms · enter 240–420ms · overlay / slide 320ms · fill 700ms · celebrate 900ms
- **Easings:** ease `cubic-bezier(.2,0,.2,1)` · out `cubic-bezier(.16,1,.3,1)` · spring `cubic-bezier(.34,1.56,.64,1)` · slide `cubic-bezier(.34,1.35,.64,1)`

## Shell
- **Desktop:** an 88px left rail holding the logo and 5 nav items (Home, Learn, Exam, Progress, Profile). Each item is 64px tall with an icon (20px) above a 12/600 label. The active item gets an action-soft pill that slides between items. The rail sits beside a 56px top bar card showing the page title and subtitle, a streak pill, an XP pill and an avatar that links to Profile.
- **Mobile:** the top bar is the same, minus the avatar. A bottom dock holds the same 5 items, each 56px tall, with a sliding pill.

## Screens

### Home (frame 2a)
- **Greeting:** "Salut, Léa." on the left. A level bar on the right (8px, reward colour) labelled "Level N · X XP to Level N+1".
- **Mission card:** a 96px daily-goal ring in the progress colour; eyebrow "Today's mission", a title and meta text; pills "Up to +90 XP" (reward-soft) and a streak line (streak outline); buttons Start session (primary) and Take a timed test (secondary); a recessed "Today's plan" strip below, with 3 steps.
- **Coach's pick card:** your weakest topic, with skill chips.
- **This week:** a 7-day bar chart coloured by score (≥8 progress, ≥6 reward, otherwise correction), placed alongside Recent activity.
- **Mobile (compact):** a smaller ring (74px), the plan shown as 3 mini tiles, a week strip of score cells, and single-line activity rows.

### Learn: Topics, Setup, Session
- **Topics:** a grid of topic tiles, each with a hue chip, answered progress and average.
- **Setup:** stats, the coach reason and focus chips; segmented controls: Difficulty (Comfortable / Balanced / Push), Feedback style (Coach / Examiner) and Marking (A1 / A2 / Exam / B1 / B2); a summary: number of questions, about N minutes, up to +XP; a primary Start button.
- **Session:** segmented progress across the top; the question card, with text-to-speech, vocab chips, a hint and a "why this question" note; the recorder (64px record button, live waveform, timer, a length meter that turns green at 30s, with messages at under 10s, 10–30s, 30–60s and over 60s); processing is stepped: Transcribing, then Checking grammar, then Scoring. **Feedback is out of scope** (the prototype shows a placeholder).

### Progress (frame 3a)
1. **Header.** h1 "Progress" with the subtitle "Your exam marks, your Learn practice and what to do next."
2. **Next step card.** The screen's only primary button: 48px action-soft icon box, eyebrow "Your next step" in action-text, title at 22/600 and detail text, a primary button with an arrow; data from `nextStep()` in `progressSummary.ts`.
3. **At a glance.** 4 tiles (auto-fit, min 160px): label (13 subtle), 32px tabular value counting up from 0 (fill, 700ms ease-out), unit, note with icon. Latest Exam Sim (/40, "+N on your last" in progress-text) · Learn average (/10, "At Exam standard") · Topics practised (N/total) · Due for review (action-text note).
4. **Exam and Consistency row.** Exam `flex 1.5 1 440px`, consistency `flex 1 1 300px`. Exam: latest mark at 52px plus an insight ("Up X marks since your first Exam Sim on D. Y more to reach your target of T."); bar chart of the last 6 counted attempts, 136px tall, latest solid progress, earlier progress-soft with a 1px progress inset, growing from 0; dashed action target line labelled "Target T"; date row; "By scored area" bars (Role play /10, Communication /15, Quality of language /15) with the weakest in correction colour and a "Weakest" pill; a note on uncounted practice attempts. Consistency: "N/14 days practised"; a 7-column grid of the last 14 days with weekday letters, practised days progress-soft/progress-text, today with a 1.5px action ring; a streak line; "Grammar to work on" bars from `learn.weakSkills`.
5. **Topics card.** Practised topics, weakest first; each row: 36px hue chip, French and English names, "answered N of M" bar with "N due for review", tone pill (52×32), chevron; clicking opens that topic's setup; footer "N topics not started yet" + secondary "Browse topics".
6. **Past attempts.** Segmented filter (All / Learn / Exam, 240px); rows: date · chip · title and tag · score · rotating chevron; Learn expands to question, italic `lang="fr"` transcript and feedback; Exam expands to area marks plus a practice note; keep "Show more" paging.

### Profile (frame 3b)
Two columns: left `flex 1.45 1 460px`, right `flex 1 1 320px`; stacked on mobile.

**Left:** identity card (72px action-soft avatar with initials — keep CosmeticPreview if equipped; name 32/600; "@username · learning since …"; secondary "Change username" opening an inline recessed form with a 44px input, Save primary only while valid, Cancel; validation `^[A-Za-z][A-Za-z0-9_]{2,19}$`; `RENAME_REASON_COPY` for server errors; 10px reward level bar) · stats (Day streak, Sessions, Average /10, Total XP; 28px count-up) · achievements ("N of M unlocked" + bar, "Next up", tiles min 140px unlocked first, lucide icons not emoji, locked without opacity, "Show all N / Show fewer") · learning goals (board, date with info-soft countdown, goal type, target; secondary "Update goals" → `/onboarding?from=profile`; daily-goal stepper `DAILY_GOAL_MIN`–`MAX` dispatching `SET_DAILY_GOAL`).

**Right:** grouped settings, eyebrow above a card of 60px rows (32px recessed icon box, 14/600 label, 13 subtle description, control). Preferences (Sound effects, Dark mode, Replay tour) · Notifications (Streak reminders, Daily goal reminders, existing permission logic) · AI feedback (radio: Offline · instant "Recommended", Groq AI, Gemini Flash; Speech recognition "fr-FR") · Account & data (Age band + guardian flow, Export, Privacy policy, Blocked learners, Content Admin for admins, Log in for guests, Sign out, Delete my account → modal with scrim, 400px raised card, Cancel, correction-filled "Delete permanently"). Social privacy and Learner track stay behind their existing flags. Toggle: 40×24 pill, 18px white knob sliding 16px.

## Interactions and motion (the only 8 allowed)
- **enter:** fade + rise 12px (.98→1), 420ms spring, staggered 50ms; reduced motion: 200ms fade.
- **slide:** nav pills, segmented indicators, toggle knobs, chevrons. 320ms slide easing.
- **press:** `scale(.97)` on `:active`, 80ms.
- **fill:** bars, rings, count-ups. 700ms ease-out.
- **celebrate / streak:** after a session the XP pill counts up, the streak number rolls, the flame wiggles.
- **record / correct:** the waveform while recording; strike-through then fix on corrections.
- **Hover:** background or border colour change only, 120ms.

## State notes
- **Progress:** filter, open attempt id, paging count; everything else derived from `progressSummary`.
- **Profile:** keep all existing state; new local UI state is the rename-form flag, achievements-expanded flag and delete-modal flag.

## Assets
Icons: lucide (`lucide-react`), names visible in the HTML (`<l-icon name="…">`). Fonts: Google Fonts, Bricolage Grotesque and Libre Baskerville. No images.
