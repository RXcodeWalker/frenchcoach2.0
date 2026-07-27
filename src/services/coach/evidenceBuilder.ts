// ── Coach MVP: evidence builder ────────────────────────────────────────────────
// Thin public entry point. The actual observation → EvidenceEvent projection
// logic lives in evidenceProjection.ts (Phase 2: consumes an EvidenceProfile-
// shaped Observation log via deriveNodeOutcome, not FeedbackV2 prose directly —
// see i-am-building-an-cosmic-cascade.md §10.4). Kept as a separate module so
// existing imports (sessionOrchestrator.ts) don't need to change.

export type { BuildEvidenceArgs } from './evidenceProjection';
export { buildEvidence } from './evidenceProjection';
