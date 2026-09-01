# 0004 — Why `docs/systems/`, not `docs/architecture/`

Date: 2026-09-01
Status: Accepted

## Decision

The live specification directory introduced by this documentation migration is named
`docs/systems/`, not `docs/architecture/`.

## Why

`docs/architecture/` (11 files) was deleted 2026-08-31 because it assumed a validation strategy
that no longer reflects the plan. Roughly 45 source comments across the codebase still cite
`docs/architecture/<numbered-file>.md` for rules that were restated inline or moved into
`docs/decisions/` during this migration (see `docs/README.md`'s citation decoder). Reusing the
`architecture/` name for the new directory would make every one of those ~45 dangling citations
look like it might resolve to something in the new directory — inviting exactly the kind of
"reconstruct the deleted doc from a citation" mistake this migration exists to prevent. A distinct
name makes the boundary between "the old, deleted numbering scheme" and "the current, live specs"
visible at a glance.

## Consequences

- `docs/systems/` is not a like-for-like replacement of `docs/architecture/` and should not be
  treated as continuing its numbering (`01-`, `02-`, …) or its per-file scope. It holds specs and
  system explanations; ADRs live separately in `docs/decisions/`.
- A source comment citing `docs/architecture/NN-*.md` is historical only — see `docs/README.md`'s
  citation decoder. Do not "fix" such a citation by pointing it at `docs/systems/` unless the rule
  it names was actually verified to have landed there.
