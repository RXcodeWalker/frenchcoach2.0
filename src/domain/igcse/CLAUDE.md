# CLAUDE.md — src/domain/igcse/

This is the Assessment Engine: the audited Cambridge IGCSE French (0520) scoring pipeline. See
root `CLAUDE.md` for the three-runtime-surface context and `docs/systems/assessment-engine.md`
for the full design. This file adds only what's unique to working in this ~200-file directory.

- **Plan before implementing, even for a change that looks small.** State what you intend to
  change and why before touching `evidence/`, `judgement/`, `guardrails/`, `envelope/`, or
  `rubric.ts`, and get it confirmed — see root `CLAUDE.md`'s Development Workflow.
- **Never collapse the three layers** (deterministic evidence → constrained LLM judgement →
  deterministic guardrails). See ADR-0002.
- **Bump the relevant stage's `version.ts` pin** whenever you change that stage's behavior —
  `__tests__/version-pin.test.ts` hashes config against output and will otherwise silently drift.
- **A golden-transcript regression test changing shape is a signal you changed scoring
  behavior**, not a test to casually update to match new output.
- **On completion, append what you did and what you verified to `verification-log.md`**
  (repo root) — it's the audit trail for this subsystem.
