# Archive

Historical documents. **Authoritative for nothing.**

Anything in this directory records what the team used to think, plan, or believe was true at a
point in time. If an archived document disagrees with anything else in the repo — code, another
doc, an ADR — the archive loses, always, without investigation (see the conflict procedures in
`docs/README.md`).

Documents land here only after a gate: their durable, still-true content must already have been
promoted into `docs/systems/`, `docs/guides/`, or `docs/decisions/` before the move. No agent
should ever need to read an archived document to understand current system behavior. If you find
yourself doing that, the promotion gate was missed — treat it as a documentation defect.

Do not edit files in this directory except to prepend the non-authoritative header noted above, or
to fix a broken link. Do not restore archived content to active status by moving it back out;
if something here turns out to still matter, write it fresh into the appropriate live directory
and cite this file only as historical provenance.
