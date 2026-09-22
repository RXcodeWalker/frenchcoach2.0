/**
 * S5: bump whenever a guardrail in guardrails/*.ts (or its config) changes in
 * a way that changes runGuardrails's output — paired with
 * GUARDRAILS_FIXTURE_HASH in __tests__/version-pin.test.ts, which fails
 * loudly if the two drift apart.
 */
/**
 * v0.2 (Phase 5, §10.6): added the doubly-gated evidence-ceiling hook. The
 * GuardrailReport gained `adjustments`, and EVIDENCE_CEILINGS joined the
 * version-pin hash. No mark moves — both gates ship closed.
 *
 * v0.3 (Workstream C): `adjustments` became load-bearing. At v0.2 the field was
 * computed and then discarded by every consumer, so an `eligible` detector
 * emitted a trigger and left the mark untouched — L3's clamp was dead code.
 * buildScoringEnvelope now applies it (mark, band and total together), which
 * changes what this version means for a caller even though runGuardrails's own
 * output is byte-identical: the same report now moves marks. The pin hash is
 * widened to cover that application, so the two cannot drift apart again.
 *
 * v0.4 (exam-overhaul W1): checkInsufficientEvidence's duration sub-check now
 * also requires topicConversationDurationByConversation's combined
 * typedTurnCount to be 0 (evidence/duration.ts) before it can fire — a mixed
 * speech/text session's typed turns necessarily read 0 seconds, and without
 * this the guardrail could trip on duration alone even with ample word-count
 * evidence. runGuardrails's output on every pre-existing (all-speech or
 * all-hand-authored) fixture is unchanged — typedTurnCount is 0 for all of
 * them — but the function's behavior did change, so this is a real bump per
 * CLAUDE.md policy even though GUARDRAILS_FIXTURE_HASH does not move.
 */
export const GUARDRAILS_VERSION = 'guardrails-v0.4';
