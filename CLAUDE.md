# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run typecheck    # Type-check without emitting (tsconfig.app.json)
npm run lint         # ESLint
npm run preview      # Preview production build locally
```

No test suite is configured.

## What This Is

A French language speaking-practice app for IGCSE/A-Level learners. Users record spoken responses to French questions, receive AI feedback on grammar/vocabulary/fluency, earn XP, unlock achievements, and track skill mastery across 14 grammar categories. All state is localStorage-backed; the backend (AI feedback endpoint) is optional with a graceful offline fallback.

## Architecture

### State & Data Flow

Global state lives in a single `useReducer` in [src/context/AppContext.tsx](src/context/AppContext.tsx). On mount, `buildInitialState()` hydrates from three localStorage services:
- `analyticsService` → session history, streak, daily stats (`frenchCoach_v2`)
- `progressionService` → XP, level, achievements (`frenchCoach_progression`)
- `diagnosticEngine` → skill mastery profile (`frenchCoach_sde`)

Each screen owns its local state (recording, timer, step machine). Shared state is dispatched up via context actions (`ADD_XP`, `ADD_SESSION`, `UPDATE_SKILL_PROFILE`, etc.).

### Services Layer (`src/services/`)

| Service | Purpose |
|---|---|
| `api/apiClient.ts` | POST `/api/feedback` → falls back to `coachService` if offline |
| `coaching/coachService.ts` | Offline regex-based grammar evaluator (~34 rules); computes 4 scores (0–10) |
| `coaching/diagnosticEngine.ts` | Maps grammar errors → 14 skill categories with exponential decay (14-day half-life) |
| `analytics/analyticsService.ts` | Records sessions, computes streak, builds 7-day chart data |
| `progression/progressionService.ts` | XP formula: `10 + (score/10×15) + (streak×2)`; 5 levels; 12 achievements |
| `supabase/` | Dead code — not wired up anywhere |

### Screens (`src/screens/`)

- **Learn.tsx** — Topic picker → question → mic recording → feedback panel → session complete (state machine in a single component; ~518 LOC)
- **ExamMode.tsx** — Loads `EXAM_SETS` from raw JSON, enforces per-question time limits, auto-scores
- **Progress.tsx** — 3-tab dashboard: overview stats, skill profile (mastery per category), session history
- **Explore.tsx** — Roleplay scenario catalog (scenarios are JSON state machines in `src/data/scenarios/`)
- **Home.tsx** — Dashboard with hero section, daily cards, 7-day chart (~363 LOC)

Each big screen has a matching sub-directory (e.g., `src/screens/learn/`) with extracted sub-components.

### Routing

React Router v7. Two layouts in [src/App.tsx](src/App.tsx):
- `MainLayout` — wraps most routes with `<Navigation>` sidebar + animated `<Outlet>`
- `ExamLayout` — fullscreen, no sidebar

### Styling & Animation

Tailwind CSS 3.4. Custom animations (`blob`, `fade-in`, `shake`, `glow`) defined in [src/index.css](src/index.css). Framer Motion variants centralized in [src/components/motion/variants.ts](src/components/motion/variants.ts). Light/dark mode uses the Tailwind `dark:` class strategy with a `dark` class on `<html>` controlled by [src/context/AppContext.tsx](src/context/AppContext.tsx).

### Data

- `src/data/questions.ts` — 8 topics, 60+ questions with metadata (difficulty, model answers, key vocab)
- `src/data/raw/` — JSON source files (papers, roleplays, IGCSE master list)
- `src/data/scenarios/` — 30+ roleplay JSON state machines
- `src/data/mocks/` — Fake stats/feedback for UI development

## Key Types

Defined in [src/types/index.ts](src/types/index.ts). The most important ones:

- `Session` — recorded practice attempt with score, XP, feedback, transcript
- `Feedback` — structured AI output: `scores`, `grammar.critical[]`, `vocabulary[]`, `style[]`, `fillers[]`, `cefrLevel`
- `SkillProfile` — `{ [skillId]: { score: 0–1, mastery, lastSeen, feedbackCount } }`
- `UserProfile` — XP, level, streak, session counts

## Known Issues

- XP toast never auto-dismisses
- `src/services/supabase/` is dead code (not imported)
- Mic recording + timer logic is duplicated between Learn and ExamMode
- Color-to-score mapping is defined in multiple places; canonical version is `src/domain/scoring.ts`
