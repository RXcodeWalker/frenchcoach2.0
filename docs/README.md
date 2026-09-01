# Documentation map

Depth 2. Four live categories, one archive.

| Directory | Answers | Does NOT hold | Change rate | Authoritative for |
|---|---|---|---|---|
| `systems/` | "How does this fit together, and what must it do?" | Catalogues; anything one file's header already says | Rarely | **Intended behavior + rationale.** Not "what the code does today" |
| `guides/` | "How do I do X correctly?" | Rationale (→ systems); one-off notes | On process change | The procedure |
| `decisions/` | "Why is it this way; what was rejected?" | Implementation detail; status | Append-only, never edited | The decision |
| `archive/` | "What did we used to think?" | Anything current | Frozen | **Nothing** |

## Current documents

- `systems/shop-economy.md` — the shop/economy specification (promoted from `shop-plan.md`; §-numbered, cited by ~221 code sites — do not renumber)
- `systems/learn-adaptive-difficulty.md` — the adaptive-difficulty specification (promoted from `learn-adaptive-difficulty-plan.md`; §-numbered, do not renumber)
- `systems/topology.md` — the three runtime surfaces, deploy wiring, env vars, known unknowns
- `systems/assessment-engine.md` — the three-layer scoring pipeline and the three-scorer situation
- `systems/data-model.md` — the Supabase privilege rule, economy invariant, session-binding pattern, and gotchas (not a table/RPC catalogue)
- `guides/content-authoring.md` — content-authoring rules for the question bank
- `guides/corpus-matrix.md` — corpus coverage rules
- `guides/learn-demands.md` — Learn demand-tagging rules
- `guides/development.md` — commands, the three test suites, the Assessment-Engine change procedure
- `decisions/0001-cambridge-0520-only.md` through `0005-examiner-feedback-emits-no-marks.md` — ADRs
- `archive/` — historical documents; see `archive/README.md`

## Authority model

Not a ranked list — a routing table by question type, plus explicit conflict procedures.

### Which artifact answers which question

| Question | Authority | Notes |
|---|---|---|
| **What does the system do right now?** | The running code | Tests *evidence* this; they do not define it. |
| **What is it supposed to do?** | `docs/decisions/` (constraints) and `docs/systems/` (specs) | Where a spec and an ADR conflict, the ADR wins — it is the narrower, deliberate decision. |
| **What are the security / data-access rules?** | The deployed Supabase schema; `backend/supabase/migrations/` is its only in-repo record, read in date order; `backend/supabase/tests/*.test.mjs` is the executable spec of RPC contracts | `data-model.md` explains the model; it is never the source for a specific policy or grant. |
| **What are the Cambridge rubric values?** | The official Cambridge Teacher/Examiner Notes booklet, as transcribed in `src/domain/igcse/rubric.ts` with `exactSource(...)` citations | Any number lacking a source is `UNVALIDATED` by definition. No other file — in any language — is a rubric source. |
| **What routes / feature states / storage keys exist?** | `src/config/routes.ts`, `src/config/featureFlags.ts`, `src/services/persistence/storage.ts` | Machine-enforced. Docs link to them, never restate them. |
| **What are the content-authoring rules?** | `docs/guides/*` and their checkers | If guide and checker disagree, the checker is a bug — file it, don't route around it. |
| **What was actually verified, and when?** | `verification-log.md` | Records history. Never evidence that something is *currently* true. |
| **What did we used to think?** | `docs/archive/` | Authoritative for **nothing**. |

### Conflict procedures — the operational part

1. **Code contradicts an ADR or a spec → that is a defect, not documentation drift.** Do not silently update the doc to match the code. Report it and ask.
2. **A test contradicts a spec or ADR → the test is wrong.** A passing test proves the code does X; it never proves X is correct. Golden-transcript tests are the one qualified case: a change in their *shape* is a signal you changed behavior — investigate before updating.
3. **A doc contradicts the code on current behavior → the doc is wrong.** Fix the doc in the same session.
4. **Two docs disagree → the more specific and more recent wins**, and one of them must then be corrected. Live docs never disagree for long; if they do, that is the bug.
5. **Anything in `docs/archive/` disagrees with anything → the archive loses, always**, without investigation.
6. **The authority is missing entirely → ask.** Do not reconstruct it from git history of deleted documents.

### Two rules that keep docs from rotting

- **Docs link; they do not restate.** A value appearing in both a doc and the code is a future contradiction. Cite **stable anchors** — file paths, exported symbol names, config keys, npm script names, migration filenames — **not line numbers**, which move on every edit.
- **Prefer executable enforcement where a rule is deterministic and machine-verifiable** (`authoring:check`, `learn:check`, `score:golden`, the eslint import boundaries). Do **not** invent a checker to justify a document's existence; procedure docs like `guides/development.md` legitimately have none.

## Citation decoder

Some source comments cite design documents that no longer exist (`docs/architecture/NN-*.md`,
`roadmap.md`, `S0`–`S17`) or were never committed (`i-*.md`, "the overhaul plan"). Where the rule
mattered it has been restated inline or captured in `docs/decisions/`. Any remaining such citation
is **historical**: it records that a decision was made, not what it was. Do not reconstruct these
documents, including from git history — use the code, its tests, and `docs/decisions/`; if the
rationale isn't there, ask.

**Exception:** a bare `docs §N` in `src/domain/learn/**` refers to `docs/systems/learn-adaptive-difficulty.md`.
A bare `Shop plan §N` (or `docs §N` in shop/economy code) refers to `docs/systems/shop-economy.md`.
Both are live specs, not dead citations — do not "repair" them.
