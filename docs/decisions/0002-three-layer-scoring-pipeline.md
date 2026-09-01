# 0002 — Three-layer scoring pipeline, never collapsed

Date: 2026-09-01
Status: Accepted

## Decision

The Assessment Engine is always: deterministic evidence extraction (`src/domain/igcse/evidence/`)
→ constrained LLM judgement (`judgement/`) → deterministic guardrails (`guardrails/`) → persisted
`ScoringEnvelope` (`envelope/`). This is never collapsed into pure-deterministic scoring or
unrestricted-LLM scoring.

## Why

No single in-code comment states this constraint in those terms — it is `CLAUDE.md`'s own Core
Architectural Rule #2, and this ADR is now that rule's durable home. The shape of the code
corroborates it: each layer has its own `version.ts` pin and its own `__tests__/version-pin.test.ts`
(see `docs/systems/assessment-engine.md`), and `guardrails/runGuardrails.ts` is explicitly pure and
I/O-free, applying its evidence-ceiling adjustment to the envelope rather than mutating the
judgement layer's output — keeping the LLM's original proposed mark in the audit trail instead of
overwriting it. That design only makes sense if the three layers stay separate and separately
auditable.

Collapsing to pure-deterministic scoring would lose the judgement layer's ability to assess
open-ended spoken responses against qualitative descriptor language. Collapsing to unrestricted-LLM
scoring would lose the deterministic evidence and guardrail checks that keep individual marks
traceable and bounded — the entire reason this pipeline was audited in the first place.

## Consequences

- A change that merges two layers, or has one layer reach into another's internals rather than
  through its public surface (e.g. bypassing `envelope/index.ts`), is a violation of this decision,
  not a refactor.
- Each layer's `version.ts` must be bumped when that layer's output shape or values change — this
  is how the never-collapsed boundary stays enforceable rather than aspirational.
- `backend/evaluator_service.py` (the legacy Python scorer) does not follow this pipeline at all —
  it is a single unaudited LLM prompt. That is one of the reasons it is legacy and unreached, not a
  precedent to extend. See `docs/decisions/0003-node-engine-is-the-authoritative-scorer.md`.
