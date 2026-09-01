# French Coach

A French speaking-practice app for IGCSE/A-Level learners. Users record spoken French, get AI
feedback, earn XP, and track skill mastery.

## Runtime surfaces

This app spans three separately-deployed pieces — see `docs/systems/topology.md` for the full
map, deploy wiring, and environment variables.

1. **`src/`** (this repo) — the Vite + React + TypeScript frontend. Deployed to Vercel.
2. **`server/`** (this repo, separate deploy) — a Node service hosting the Cambridge IGCSE French
   (0520) scoring API. Deployed to Render (`render.yaml`, `french-scoring` service).
3. **`backend/`** — a **separate git repository** (its own remote and `.gitignore`) running
   FastAPI, handling general coaching feedback, transcription, and exam endpoints. Deployed
   separately to Render, dashboard-managed. See `backend/README.md` for its own setup.

## Getting started

```bash
npm install
npm run dev          # Vite dev server, http://localhost:5173
```

The frontend alone will run, but AI feedback and exam scoring need the other two surfaces
running too (or their env vars pointed at already-deployed instances) — see `.env.example` at
the repo root and `docs/systems/topology.md`.

For the FastAPI backend, see `backend/README.md` in that repository.

## Validation commands

```bash
npm run dev            # Vite dev server
npm run build           # production build
npm run typecheck        # tsc --noEmit, src/ only
npm run typecheck:scripts  # tsc --noEmit, scripts/
npm run typecheck:server  # tsc --noEmit, server/
npm run lint            # ESLint
npm test              # vitest run
```

Full command list, what each does and doesn't cover, and the Assessment-Engine change procedure:
`docs/guides/development.md`.

## Documentation

- `CLAUDE.md` — entry point for AI coding agents working in this repo.
- `docs/README.md` — the documentation map and authority model.
- `docs/systems/` — how the app fits together and what it must do (topology, the Assessment
  Engine, the Supabase data model, the shop economy, adaptive difficulty).
- `docs/guides/` — how to perform recurring tasks (content authoring, corpus coverage, the dev
  workflow).
- `docs/decisions/` — ADRs recording why the system is built the way it is.

## License

Not yet licensed for reuse.
