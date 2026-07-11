/**
 * S5: bump whenever a guardrail in guardrails/*.ts (or its config) changes in
 * a way that changes runGuardrails's output — paired with
 * GUARDRAILS_FIXTURE_HASH in __tests__/version-pin.test.ts, which fails
 * loudly if the two drift apart.
 */
export const GUARDRAILS_VERSION = 'guardrails-v0.1';
