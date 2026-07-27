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
 */
export const GUARDRAILS_VERSION = 'guardrails-v0.2';
