French 2.0 — Architecture Audit & Refactor Roadmap 0. What I read
Active app at src/ (10 source files, ~2,325 LOC). Routing is reducer-driven (no React Router). Stack: React 18 + Vite + TypeScript + Tailwind + Framer Motion + Supabase (declared, unused) + canvas-confetti. There's also a near-identical, older copy of the project at french2.0/project/ — confirmed divergent via diff.

A. Detailed architecture report
Current shape

src/
├── App.tsx 103 lines — root + decorative aurora + XP toast + screen switch
├── main.tsx React entry
├── index.css ~218 lines — design system, animations
├── context/AppContext.tsx 112 lines — single global reducer, mock data inlined
├── components/ 3 files: Navigation (144), ProgressRing (78), XPAnimation (30)
├── screens/ 6 files: Home (363), Learn (518), ExamMode (374),
│ Explore (162), Progress (305), Profile (182)
├── data/gameData.ts 169 lines — TOPICS, LEVELS, ACHIEVEMENTS, SAMPLE_QUESTIONS,
│ EXAM_QUESTIONS, ROLEPLAY_SCENARIOS, getLevelInfo
├── lib/supabase.ts 68 lines — DEAD CODE, never imported
└── types/index.ts Solid central types
Component hierarchy
App → AppProvider → AppContent → (conditionally hides SideRail) + <Screen> switch + XPAnimations + XP toast. Each screen is a self-contained mega-component with its own local state, mock data, and inlined sub-views (e.g. Learn renders 5 different "states" via if/return blocks).

Routing
A Screen union string in AppState (AppContext.tsx:7) flipped via SET_SCREEN. No URL, no history, no deep links, no exam-mid-flow recoverability. ExamMode even hijacks the layout with position: fixed to fake "fullscreen" (ExamMode.tsx:249) because there is no concept of route layouts.

State management
One global useReducer for everything that's actually shared (profile, achievements, sessions, XP, sound, screen).
Half the action types are dead: DISMISS_XP_MODAL, ADD_SESSION, UNLOCK_ACHIEVEMENT, SET_PROFILE are handled in the reducer but never dispatched anywhere (AppContext.tsx:19-23).
All "interesting" state (recording, timers, waveforms, exam progress, current question, learn phase) is local inside each screen — making session resumption, persistence, and analytics impossible without rewriting.
state.showXPModal is flipped to true on ADD_XP but DISMISS_XP_MODAL is never dispatched, so the toast in App.tsx:75-91 appears on first XP gain and stays visible forever. This is a real bug, not a refactor smell.
Data flow
100% mock. Five sources of truth coexist:

initialProfile + mockSessions in AppContext.
MOCK_DAILY duplicated identically in Home.tsx:18-26 and Progress.tsx:8-16.
MOCK_FEEDBACK inlined in Learn.tsx:11-27.
SKILLS + SKILL_TREE hardcoded inside Progress.
Hardcoded scores ('7.8', 'avgScore') sprinkled across screens.
Dependency org
Imports are clean and flat ('../data/...', '../context/...'). No circular concerns. lucide-react, framer-motion, canvas-confetti are pulled in by every screen — none are barrel-imported or wrapped.

B. Prioritized issue list
🔴 Critical (block scaling / cause real bugs)
Two divergent copies of the project. french2.0/project/src shadows src/ with different content (10 differing files confirmed by diff). It also ships its own package.json, dist/, configs. Risk: someone edits the wrong tree; ESLint/TS may scan both.
XP toast never dismisses (App.tsx:75, AppContext.tsx:72) — DISMISS_XP_MODAL exists but is never dispatched. Real user-facing bug.
No persistence layer wired. lib/supabase.ts is imported nowhere; the schema in supabase/migrations/ exists but isn't connected. Every reload wipes everything. The whole app is a UI prototype around mock data.
No routing. A reducer-driven screen switch means: no back button, no shareable URLs, no per-route code splitting, can't reuse layout per area, exam state can't survive a refresh.
Five places define the same score → color ladder (>=8 emerald, >=6 amber, else red) at Learn.tsx:193,444, ExamMode.tsx:93,165,204. Future "what counts as 'good'?" change will be hunted across files.
The 7-day SVG line+area chart is duplicated verbatim between Home.tsx:206-252 and Progress.tsx:138-175 — including the gradient defs, path math, and Mock data.
Mic + waveform + recording + timer logic is duplicated between Learn.tsx:69-89,348-422 and ExamMode.tsx:58-71,326-368 with cosmetic-only differences. This is the single biggest piece of business logic in the app and there are two copies.
🟠 Medium (significant maintainability/scalability tax)
Oversized screens. Learn (518), ExamMode (374), Home (363), Progress (305). Each renders 3–5 distinct "modes" via inline if (state === 'X') returns — they're really 3–5 components glued together.
formatTime duplicated in Learn and ExamMode (Learn.tsx:115, ExamMode.tsx:91).
Animation variants (fadeUp, stagger) re-declared in Home, Progress, Profile.
No Card / Button / Pill / StatTile / Section primitives. The glass/glass-elevated/glass-subtle classes are sprinkled across hundreds of <motion.div> and <motion.button> tags with copy-pasted whileHover/whileTap. Brand tweaks now require touching ~50 places.
Screen catalog data inside Explore. FEATURES is a 30-item product catalog hard-coded inside a render component. Should be data.
Topic + question filtering inlined. SAMPLE_QUESTIONS.filter(q => q.topicKey === topic.key) happens during render in Learn — fine now with 6 questions, painful at 450.
Dead reducer actions (ADD_SESSION, UNLOCK_ACHIEVEMENT, SET_PROFILE) — keep them only if there's a near-term plan.
Decorative aurora background renders 4 absolutely-positioned <div>s in App.tsx, then re-renders each time any state changes. Cheap individually, but it's noise that should live in a <Backdrop /> component.
canvas-confetti invoked from screens directly. No "celebrate(reason)" abstraction; it'll get re-tuned in 6 places.
🟢 Low (housekeeping)
Six top-level redesign markdown files (COMPONENT_REFERENCE, IMPLEMENTATION_CHECKLIST, QUICK_START, README_REDESIGN, REDESIGN_SUMMARY, UI_UX_IMPLEMENTATION_GUIDE). Bolt.new artifact bloat — move to docs/.
package.json name is still "vite-react-typescript-starter".
.gitignore only ignores node_modules/ and .env — dist/ is committed inside the duplicate project tree.
Component file Navigation.tsx exports SideRail (mismatched name).
Animation keyframes are declared both in index.css and tailwind.config.js — pick one.
state.soundEnabled is toggled but never read by any sound code (no sound code exists).
Inconsistent phrasing — "session", "practice", "learn", "lesson" used loosely. Quote text strips French accents inconsistently (AppContext.tsx:39 says "Parle-moi de ton ecole" while gameData.ts:50 says "Parle-moi de ton école.").
C. Ideal folder structure (sized for this app)
Don't go full enterprise. This is a single-developer SPA with ~6 screens and one reducer. Target shape:

src/
├── app/
│ ├── App.tsx thin: Provider + Router + layout
│ ├── routes.tsx route table (one place)
│ └── providers.tsx AppProvider + future QueryClient/Theme/Auth
│
├── pages/ one folder per route, each owns its sub-pieces
│ ├── home/
│ │ ├── HomePage.tsx
│ │ ├── HeroMission.tsx
│ │ ├── AISuggestion.tsx
│ │ ├── DailyQuote.tsx
│ │ └── QuickAccess.tsx
│ ├── learn/
│ │ ├── LearnPage.tsx dispatcher / phase router
│ │ ├── TopicGrid.tsx
│ │ ├── QuestionCard.tsx
│ │ ├── RecordingPanel.tsx shared with exam, see /features
│ │ ├── FeedbackPanel.tsx
│ │ └── SessionComplete.tsx
│ ├── exam/
│ │ ├── ExamPage.tsx
│ │ ├── ExamIntro.tsx
│ │ ├── ExamRunner.tsx prep + question phases
│ │ └── ExamResults.tsx
│ ├── explore/
│ │ ├── ExplorePage.tsx
│ │ └── FeatureCard.tsx
│ ├── progress/
│ │ ├── ProgressPage.tsx
│ │ ├── OverviewTab.tsx
│ │ ├── SkillsTab.tsx
│ │ ├── SkillTreeTab.tsx
│ │ └── HistoryTab.tsx
│ └── profile/
│ ├── ProfilePage.tsx
│ ├── PreferencesSection.tsx
│ └── AIFeedbackSection.tsx
│
├── features/ cross-page domain logic
│ ├── recording/
│ │ ├── useRecording.ts single source for mic/timer/waveform state
│ │ ├── RecordButton.tsx
│ │ └── Waveform.tsx
│ ├── xp/
│ │ ├── useXPToast.ts auto-dismiss, queueing
│ │ └── XPAnimations.tsx
│ ├── sessions/
│ │ └── useSessions.ts add/list/recent — replaces direct dispatch
│ └── celebration/
│ └── celebrate.ts confetti presets, sound hook
│
├── components/ pure, presentational, no app state
│ ├── ui/
│ │ ├── Card.tsx glass/glass-elevated/glass-subtle variants
│ │ ├── Button.tsx primary/ghost/icon variants
│ │ ├── Pill.tsx
│ │ ├── StatTile.tsx
│ │ ├── ProgressBar.tsx
│ │ ├── ProgressRing.tsx (already exists, keep)
│ │ └── ScoreBadge.tsx
│ ├── layout/
│ │ ├── PageShell.tsx max-w + padding wrappers (currently inlined)
│ │ ├── SideRail.tsx (move from components/)
│ │ ├── MobileDock.tsx (split out of Navigation)
│ │ └── Backdrop.tsx the aurora blobs
│ └── motion/
│ └── variants.ts fadeUp, stagger, pageVariants in one place
│
├── state/
│ ├── AppContext.tsx reducer only
│ ├── selectors.ts memoized derived data
│ └── types.ts
│
├── domain/ pure business logic, no React
│ ├── scoring.ts scoreColor(), bandFromScore(), CEFR mapping
│ ├── levels.ts getLevelInfo, LEVELS (move from gameData)
│ ├── time.ts formatTime, formatDuration
│ └── achievements.ts unlock rules
│
├── data/ static content + fixtures
│ ├── topics.ts
│ ├── questions.ts SAMPLE_QUESTIONS + EXAM_QUESTIONS
│ ├── achievements.ts
│ ├── features.ts the Explore catalog
│ ├── roleplay.ts
│ └── mocks/ ALL mock fixtures live here, isolated
│ ├── mockSessions.ts
│ ├── mockDaily.ts
│ └── mockFeedback.ts
│
├── services/ side-effects to outside world
│ ├── supabase/
│ │ ├── client.ts (move from lib/supabase.ts)
│ │ ├── profiles.ts
│ │ └── sessions.ts
│ └── speech/ future: STT integration
│
├── styles/
│ └── index.css
│
└── types/
└── index.ts
Why this shape:

pages/ mirrors routes — when you add Pronunciation Lab, it's one folder, not "where do all these files go?".
features/ for cross-page logic — recording/ is needed by Learn, Exam, and (future) Pronunciation. It belongs nowhere else.
components/ui is purely presentational — no useApp, no business rules. Reusable, testable.
domain/ is the pure-function vault — scoreColor(), formatTime(), getLevelInfo(). No React, no JSX. Easy to unit test, easy to call from anywhere.
data/mocks/ quarantines mock data — when you wire Supabase, deleting data/mocks/ is one move and TS will tell you everywhere that referenced them.
services/ is the only place that knows about external systems. Pages don't import Supabase directly; they call services/sessions.ts.
D. Migration strategy (incremental, safe order)
Don't do this in one PR. Six phases, each independently shippable, each green at the end.

Phase 0 — Repo hygiene (1 sitting, ~1h, zero behavior risk)
Delete or archive french2.0/project/ (verify it's not the active build first).
Move six _*REDESIGN/UI_UX*_ markdown files to docs/.
Add dist/ to .gitignore.
Rename package.json from "vite-react-typescript-starter".
Fix the XP toast bug (dispatch DISMISS_XP_MODAL on a setTimeout in App.tsx:75). One-line fix, real bug.
Phase 1 — Extract domain primitives (very safe)
Pure-function, no UI changes:

Create domain/scoring.ts → scoreColor(n), scoreBand(n). Replace inline ternaries.
Create domain/time.ts → formatTime(s). Remove duplicates.
Move getLevelInfo/LEVELS from data/gameData.ts to domain/levels.ts.
Move MOCK_DAILY, MOCK_FEEDBACK to data/mocks/.
Phase 2 — UI primitives (presentational only)
components/ui/Card.tsx (variants: subtle | default | elevated).
components/ui/Button.tsx (primary | ghost | icon) absorbing motion.button + whileHover/whileTap defaults.
components/ui/StatTile.tsx, Pill.tsx, ScoreBadge.tsx.
components/motion/variants.ts for fadeUp/stagger.
Layout: PageShell.tsx (the min-h-screen pb-24 md:pb-8 max-w-\*-mx-auto px-4 ... repeated in every screen).
Migrate one screen at a time. Profile is shortest — start there.

Phase 3 — Extract the recording feature (highest leverage)
features/recording/useRecording.ts returns { isRecording, time, waveData, start, stop }.
features/recording/Waveform.tsx and RecordButton.tsx.
Consume from Learn and Exam. This kills ~150 lines of duplication.
Phase 4 — Split mega-screens
For each oversized screen, extract its phases:

Learn.tsx → LearnPage orchestrator + TopicGrid + QuestionCard + FeedbackPanel + SessionComplete.
ExamMode.tsx → ExamIntro + ExamRunner + ExamResults.
Progress.tsx → tabs as separate components.
Home.tsx → HeroMission, WeeklyChart (shared with Progress!), RecentActivity, etc.
This is a mechanical move: cut JSX into a new file, pass props in, no logic changes.

Phase 5 — Routing
Add React Router. Replace state.screen reducer with useNavigate. Routes:

/ (home), /learn, /learn/:topic (deep-link bonus), /exam, /exam/run, /explore, /progress, /progress/:tab, /profile.
Keep the Screen union as a legacy adapter for ~one PR if needed.
ExamMode's "fullscreen" hack becomes a layout route.
Risk note: this is the only phase that can visibly change behavior (browser back, reload). Worth it but do it in its own PR.

Phase 6 — Wire Supabase (when you're ready for real data)
Move lib/supabase.ts to services/supabase/client.ts.
Add services/supabase/profiles.ts, sessions.ts.
Introduce TanStack Query (or your choice) for cache + loading states.
Replace data/mocks/\* consumers one at a time. Delete data/mocks/ when last reference is gone.
Dependency risks across phases
Phase 3 can ship before Phase 4 (extract hook, leave callers in mega-screens).
Phase 5 should land after Phase 4 (smaller pages = simpler route components).
Phase 6 must come after Phase 1 (selectors won't work cleanly until mock data is centralized).
E. Specific recommendations
Components: introduce 6 primitives only — Card, Button, Pill, StatTile, ProgressBar, ScoreBadge. Resist the urge for a design-system library. 6 covers ~90% of the repeated JSX.

Hooks: useRecording, useXPToast (with auto-dismiss), useCountdown (used by exam timer + future features), useStaggeredReveal (wraps the fadeUp/stagger pattern). Keep this list short.

Services: services/supabase/{client,profiles,sessions,achievements}.ts plus a future services/speech/. Pages never touch supabase directly.

Utilities (domain/): scoring, time, levels, achievements, cefr. These should be pure, dependency-free, and unit-testable.

Data organization: split gameData.ts (it's a junk drawer) into data/topics.ts, data/questions.ts, data/achievements.ts, data/features.ts, data/roleplay.ts. Move all MOCK\_\* to data/mocks/.

State management: keep useReducer for now — you don't need Redux/Zustand at this size. But:

Add a state/selectors.ts (e.g., selectAvgScore, selectUnlockedAchievements) so screens stop re-deriving the same values.
When async lands, add TanStack Query alongside the reducer (reducer keeps UI state, Query handles server state).
Move the four "dead" reducer actions out until there's a real caller, OR wire them now (recommended: wire ADD_SESSION when Phase 4 lands so practice/exam completion actually persists into recentSessions).
Reusable UI structure: every screen currently starts with the same wrapper <div className="min-h-screen pb-24 md:pb-8"><motion.div className="max-w-Xxl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"...>. Extract <PageShell maxWidth="5xl"> and stop copying it.

F. Quick wins (high impact, low risk)
Fix the XP toast bug — one setTimeout + dispatch({type:'DISMISS_XP_MODAL'}) in App.tsx.
Delete or archive french2.0/project/ after confirming you're not building from it.
Extract scoreColor() and formatTime() — 30 minutes, removes ~10 ternaries and 2 duplicates.
Extract the 7-day chart into components/WeeklyChart.tsx — saves ~50 lines and unifies styling. Both Home and Progress consume.
Extract MOCK_DAILY to data/mocks/mockDaily.ts — kills the second duplication.
Move FEATURES array out of Explore into data/features.ts — turns a 162-line file into ~80.
Move six _\_REDESIGN.md files into docs/ — root becomes navigable.
Add dist/ and .DS_Store to .gitignore.
Define a single motion/variants.ts with fadeUp and stagger — three screens stop re-declaring them.
Rename Navigation.tsx exports so file name matches SideRail (or split into SideRail.tsx + MobileDock.tsx).
G. Danger zones (changes likely to break behavior)
Touching the framer-motion layoutId props in Navigation (nav-glow, nav-indicator, mobile-nav-glow, mobile-nav-dot). These IDs power the shared-element animation. Renaming or splitting the file without preserving them will visibly break the active-tab glow transition.
Decomposing ExamMode's timer effect (ExamMode.tsx:35-54). The useEffect depends on both examState and currentIndex, mutates timerRef.current, and transitions phases inside the interval callback. Splitting this naively will create double-fire timers, leak intervals, or skip the prep→question transition.
The position: fixed "fullscreen exam" (App.tsx:24,57 hides the SideRail when screen === 'exam'; ExamMode.tsx:249 renders fixed inset-0 z-40). Moving to React Router requires replacing this with a route layout or you'll get the side rail bleeding through during exams.
AppContext initial state is the only "user". Removing mockSessions or changing initialProfile shape breaks every screen until selectors absorb defaults.
canvas-confetti calls inside completion handlers are coupled to the same dispatch({type:'ADD_XP'}) calls. If you split celebrate() out, make sure XP still fires before navigation/state change unmounts the screen.
recordingTime lives in two places in ExamMode — the prep/question countdown also uses setTimeLeft via the same timerRef. The recording timer reuses timerRef too (ExamMode.tsx:60-61). Extracting useRecording without auditing the shared ref will silently clobber the question countdown.
The aurora blobs in App.tsx are GPU-cheap individually but stacked with backdrop-filter: blur(20px) on every glass card. If you add more layers during refactor, mobile Safari will jank. Don't add more blur-3xl decorations.
Tailwind content glob is ./src/\*\*/_.{js,ts,jsx,tsx}. If you add a top-level pages/ or features/ folder outside src/, classes there will be JIT-purged. Keep everything under src/.
TL;DR
You have a UI-rich, demo-quality app sitting on top of mock data, with three real architectural debts: (1) duplicated mega-screens, (2) duplicated business primitives (recording, scoring, charting, formatting), (3) no separation between routing/UI/domain/data. The good news: it's small (~2.3k LOC), the types are clean, and the design system already lives in CSS. A 6-phase refactor — hygiene → primitives → UI library → recording feature → screen split → router → Supabase — moves you from "Bolt prototype" to "maintainable app" without ever rewriting the look.

Start with Phase 0 + the Quick Wins. Most of them are <30 minutes each and they remove the noise that makes the rest of the work feel scary.
