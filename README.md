# French Coach

A local-first web app for practising spoken French (IGCSE/A‑Level focus). It pairs a Vite + React frontend with a FastAPI backend for AI-assisted feedback, an offline regex-based coaching engine, and a gamified progression system.

## Features

- Single-page frontend (Vite + React + TypeScript) with screens: Home, Learn, Explore (roleplays), ExamMode, Progress, Profile and Shop. See `src/App.tsx`.
- Learn flow: topic picker → question → mic recording → feedback panel → session complete (single-screen state machine).
- ExamMode: structured IGCSE exam sets, per-question timing and full-exam grading (`backend/evaluator_service.py`).
- Roleplay scenarios driven by JSON machines in `src/data/scenarios/`.
- Offline coaching engine: deterministic regex-based grammar rules and scoring (`src/services/coaching/coachService.ts`).
- Diagnostic engine: maps errors to a 14-skill profile with 14-day half-life decay (`src/services/coaching/diagnosticEngine.ts`).
- API client with multi-engine fallback (Groq / Google Gemini → offline) and audio upload support (`src/services/api/apiClient.ts`).
- FastAPI backend exposing feedback, transcription and exam endpoints (`backend/main.py`).
- Local-first persistence: localStorage-backed analytics, progression and diagnostics (keys documented in `src/services/persistence/storage.ts`).
- Gamification: XP, gems, levels and achievements (canonical formula in `src/domain/xp.ts`).
- Speech transcription support using `faster-whisper` (configurable via backend `.env`).
- Tailwind CSS + Framer Motion for styling and UI animations.

## Demo / Example

Run the backend and frontend locally, then open the app and use the Learn screen to record a spoken response and receive feedback. If cloud AI keys are not configured the app falls back to the offline `coachService`.

Quick local demo (Windows example):

```powershell
# Backend (Windows)
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # edit .env to add keys if you have them
uvicorn main:app --reload --port 8000

# Frontend (repo root)
cd ..
npm install
npm run dev

# Open: http://localhost:5173  → Go to "Learn", pick a topic, record audio and view feedback
```

Backend API docs (when running): http://localhost:8000/docs

Demo site (provided): https://french.beyondthebasics.me

## Installation

Prerequisites

- Node.js (LTS) and npm installed for the frontend. The repo does not pin a Node version; use a current LTS.
- Python 3.11.x for the backend (see `backend/.python-version` — 3.11.11 recommended for audio/AI dependencies).

Frontend

```bash
npm install
npm run dev     # Vite dev server (http://localhost:5173)
```

Backend (Unix/macOS)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

Backend (Windows)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

There is also a convenience Windows script at `backend/start.bat` that bootstraps a venv and runs the server.

## Usage

- Open the frontend at `http://localhost:5173` and the backend API docs at `http://localhost:8000/docs`.
- Default frontend → backend URL is `http://localhost:8000`; override with `VITE_API_URL` in a top-level `.env` for the frontend.
- If you do not provide cloud AI keys the app will use the offline `coachService` for feedback (deterministic grammar rules).

Quick smoke test

1. Start backend and frontend (see Installation).
2. Open the app, go to Learn, pick a topic and record a short response.
3. Expect a feedback panel with structured scores and issues; if no AI keys are present, the offline evaluator will generate feedback.

## Project Structure (important files)

- `src/` — Frontend source (React components, screens, services, data).
  - `src/App.tsx` — Main router and layouts.
  - `src/context/AppContext.tsx` — Global `useReducer` and state hydration from localStorage.
  - `src/services/api/apiClient.ts` — Frontend ↔ backend API client and fallback logic.
  - `src/services/coaching/coachService.ts` — Offline coaching rules.
  - `src/services/coaching/diagnosticEngine.ts` — Skill profiling and decay logic.
  - `src/domain/xp.ts` — XP & gems formula used by progression service.
  - `src/data/questions.ts` — Question corpus and topic metadata.

- `backend/` — FastAPI backend and AI/evaluator services.
  - `backend/main.py` — FastAPI app and endpoints.
  - `backend/evaluator_service.py` — IGCSE exam grading logic and prompts.
  - `backend/requirements.txt` — Python dependencies.
  - `backend/.env.example` — Environment variable template.

- `CLAUDE.md` — Project notes, architecture summary and quick-start references.

## Technologies Used

- Frontend: React, Vite, TypeScript, Tailwind CSS, Framer Motion.
- Backend: Python, FastAPI, Uvicorn.
- AI / ML: optional cloud providers (Groq, Google Gemini) + `faster-whisper` for local transcription.
- Data & Persistence: localStorage (frontend), optional Supabase integration (client helpers and migrations included).

## Configuration

Main backend environment variables are documented in `backend/.env.example`. Notable variables:

- `GROQ_API_KEY`, `GROQ_PROJECT` — Groq LLM provider (optional).
- `GEMINI_API_KEY` — Google Gemini provider (optional fallback).
- `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE` — configure `faster-whisper` transcription.
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` — required only if you enable Supabase server-side features.
- `CORS_ORIGINS` — set allowed frontend origins (defaults include `http://localhost:5173`).
- Frontend: `VITE_API_URL` — override backend base URL used by the frontend (default `http://localhost:8000`).

Important localStorage keys (frontend): see `src/services/persistence/storage.ts` for canonical names (examples: `frenchCoach_v2`, `frenchCoach_progression`, `frenchCoach_sde`).

Missing / Optional info

- The repository does not pin a Node.js version (use a current LTS).
- Production secrets (GROQ/GEMINI keys, Supabase service key) must be supplied by the deployer; `.env.example` is the authoritative template.
- If you plan to use Supabase in production, follow the `supabase/` migrations and set the Supabase env vars; the README does not attempt to provision Supabase for you.

## Future Improvements

- Add a Dockerfile and docker-compose manifest for easier local/dev deployments.
- Centralise duplicated mic/timer logic between Learn and ExamMode.
- Add automated tests (unit/integration) and CI checks (lint/typecheck/build).
- Provide an opinionated Node.js version and a `engines` entry in `package.json`.
- Add a small `seed` script and documented Supabase migration/seed steps if using Supabase.

## Learning Outcomes

- Building an offline-first SPA with local persistence and a centralized reducer-based context.
- Implementing deterministic, rule-based NLP fallbacks alongside LLM providers.
- Audio capture workflows and server-side transcription (faster-whisper).
- Designing a skill-tracking diagnostic with exponential decay weighting.
- Integrating gamification mechanics (XP/gems/achievements) and designing progression formulas.

## Contributing

1. Fork the repo and create a feature branch.
2. Run `npm run lint` and `npm run typecheck` before opening a PR.
3. Describe changes clearly and include screenshots or recordings for UI work.
4. If adding backend features, include environment notes and migration steps.

## Why I Built This

To provide IGCSE/A‑Level learners an accessible, local-first practice tool for spoken French that combines automated AI feedback with deterministic offline coaching so learners can practice reliably even without cloud AI keys.

## Challenges Solved

- Reliability: implemented an explicit fallback chain (cloud LLMs → offline evaluator) so feedback is always available.
- Offline coaching: a deterministic regex-based `coachService` provides explainable feedback when LLMs are unavailable.
- Skill tracking: diagnostic engine with 14-day half-life handles noisy practice data and surfaces stable trends.
- Exam grading: `evaluator_service.py` encodes Cambridge IGCSE 0520 grading prompts and falls back to heuristics when a provider isn't available.

## License

This project will soon be licensed under the Apache 2.0 License. 
---

Credit: This README file was enhanced by ChatGPT.
Note: This site is still a work in progress and there is a lot of development required so it will take a while to become functional. Thanks for your patience!
