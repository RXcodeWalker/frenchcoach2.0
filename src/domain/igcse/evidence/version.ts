/**
 * S4: bump whenever a detector in evidence/*.ts changes in a way that changes
 * buildEvidenceSubset's output — paired with EVIDENCE_DETECTOR_FIXTURE_HASH in
 * __tests__/version-pin.test.ts, which fails loudly if the two drift apart.
 *
 * Phase 1 (i-am-building-an-cosmic-cascade.md §10.7): bumped alongside
 * ENVELOPE_SCHEMA_VERSION in the same commit because buildEvidenceProfile's
 * output (the new EvidenceProfile wrapper) is now what's snapshotted into the
 * envelope, even though buildEvidenceSubset's own output is unchanged.
 */
export const EVIDENCE_DETECTOR_VERSION = 'detectors-v0.3';
