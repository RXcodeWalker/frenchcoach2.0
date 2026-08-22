# Learn-mode feedback — provider-neutral transport contract

> Documents the wire shape the backend's `/api/feedback/v3` and
> `/api/feedback/stream` endpoints emit for Learn-mode coach feedback, and
> the client-side adapter that converts it to domain types
> (`CoachingIssue[]` / `TranscriptSpan[]`). This is **not** part of the
> Cambridge IGCSE 0520 scoring engine (`src/domain/igcse/`) — it is the
> richer, ungraded coaching layer used by `Learn.tsx`. See the root
> `CLAUDE.md` "Coach MVP Layer" section for how this fits into the app.

## Why a separate contract

Python has no `CoachingIssue`/`FeedbackV2` type. Rather than teach the
backend the frontend's domain types (or vice versa), the two sides agree on
a plain-JSON transport contract with its own vocabulary, versioned
independently of both. `FEEDBACK_CONTRACT_VERSION` (`backend/main.py`) is
the version the client's `mergeV2Fields` checks before trusting any field
below — a response without `schemaVersion >= 2` degrades to the legacy
`grammar.critical`/`polish` fields only.

## `corrections[]`

One entry per detected issue (grammar error or stylistic opportunity),
restating the same items `grammar.critical`/`grammar.polish` already carry
in a flatter, provider-neutral shape:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | stable id for this item within the response |
| `severity` | `"major" \| "minor"` | |
| `label` | string | short category label, e.g. "Avoir vs Être" |
| `description` | string | quotes the exact student error with `« »` |
| `explanation` | string | why it's wrong — teaches the underlying rule |
| `correction` | string | the corrected form |
| `quote` | string | exact student text that triggered this, verbatim from the transcript |
| `quoteContext` | string, optional | required when `quote` is not unique in the transcript — a few surrounding words that identify which occurrence |
| `tip` | string | memorable rule/mnemonic |
| `priority` | 0–3 | **pedagogical impact of fixing this, not a mark deduction** — severity × recurrence × whether it blocks comprehension. Never rendered as "−N marks" (see Invariants). |
| `lesson` | `MiniLesson \| null` | populated only for the top 1–2 highest-priority corrections |

## `quoteSpans[]`

Computed **server-side only**, against the canonical transcript
(`req.transcript` — the same string the response echoes back, see
Stage 1/finding A0). Never computed by the client.

| Field | Type |
| --- | --- |
| `correctionId` | string — matches a `corrections[].id` |
| `start` / `end` | number — character offsets into the canonical transcript |

### Span resolution algorithm (`backend/main.py::_build_quote_spans`)

1. Enumerate every occurrence of `quote` in the transcript, folding case and
   accents (NFD-decompose, strip combining marks, lowercase) so
   `"allé"`/`"ALLE"`/`"Allé"` all match.
2. If more than one occurrence is found, narrow using `quoteContext`: only
   occurrences that fall inside an occurrence of `quoteContext` survive.
3. **Exactly one candidate left → emit the span. Zero or more than one →
   emit no span.** Ambiguity is always resolved by dropping the span, never
   by guessing — the correction still ships in `corrections[]`, just without
   a `quoteSpans[]` entry.
4. Overlap resolution: if two resolved spans overlap, the longer one wins;
   the loser is dropped from `quoteSpans[]` (its correction is untouched).

The client (`src/services/api/apiClient.ts::mapBackendCorrections`) only
ever splices spans it was given — it never resolves an occurrence itself.

## Drop-only grounding

Every `corrections[]` item must carry evidence: a `« »`-quoted phrase in
`description`/`explanation`/`label`, or a non-empty `quote` field. Items
without evidence are dropped, never regenerated or repaired
(`_drop_unevidenced_items`, generalizing the same policy `grammar.critical`/
`polish` already use via `_drop_unevidenced_grammar_items`). This runs on
every response path — non-streaming, the stream's per-section events, and
the stream's final `complete` payload — via `_apply_coaching_quality_gate`
and `_validate_and_filter_section`.

## Rollout safety (both directions)

- **New client → old backend**: `FeedbackRequest` has no `model_config`, so
  Pydantic v2's default `extra='ignore'` silently drops any new field the
  client sends that the old backend doesn't recognize.
- **New backend → old client**: an old client's zod schema is
  `.passthrough()`, so unknown `corrections[]`/`quoteSpans[]` fields are
  simply not read; the old client keeps rendering `grammar.critical`/
  `polish` as before.
- **New backend → new client, `schemaVersion < 2`**: `mergeV2Fields` merges
  nothing from the rich fields; the client falls back to
  `grammar.critical`/`polish`.

Neither direction crashes. See `backend/main.py`'s `FEEDBACK_CONTRACT_VERSION`
comment and `apiClient.ts`'s `mergeV2Fields`.

## Fixture sync (cross-repo)

`src/services/api/__fixtures__/feedback-contract/*.json` is the
frontend-owned source of truth for representative payloads exercising this
contract (unique quote, repeated quote with/without discriminating context,
ambiguous quote). `npm run feedback:sync-fixtures` copies them byte-for-byte
into `backend/tests/fixtures/feedback-contract/`, mirroring the pattern
`syncLearnDemandsToBackend.ts` already uses for the Learn demands corpus
(see root `CLAUDE.md`'s `authoring:*`/`learn:*` commands). Both repos' test
suites hash the fixture set and fail loudly if the copies diverge:

- Frontend: `src/services/api/__tests__/feedbackContractFixtures.test.ts`
- Backend: `backend/tests/test_feedback_contract_fixtures.py`

Run the sync script (and commit + push `backend/` separately, per
`CLAUDE.md`) any time a fixture changes.

## Invariants this contract must never violate

These mirror the Learn-mode coach feedback plan's invariants (see the
architecture roadmap for the full list); the ones most relevant to this
contract:

- **No grade prediction.** `priority` is pedagogical impact, never a mark
  deduction. No component may render `priority` as "−N marks" or any other
  scored-language claim.
- **Drop-only grounding.** Every claim about the learner's own words is
  quote-verified against the canonical transcript and dropped, never
  fabricated, when unverifiable.
- **Render-time only.** `corrections[]`/`quoteSpans[]` are never persisted
  and never reach `evidenceProjection` — the coach evidence layer consumes a
  separately shaped Observation log, not this contract's prose.
- **Ambiguity drops the attachment, never guesses it.** Applies uniformly to
  `quoteSpans[]` resolution.
