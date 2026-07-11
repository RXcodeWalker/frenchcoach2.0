/**
 * S4: bump whenever a detector in evidence/*.ts changes in a way that changes
 * buildEvidenceSubset's output — paired with EVIDENCE_DETECTOR_FIXTURE_HASH in
 * __tests__/version-pin.test.ts, which fails loudly if the two drift apart.
 */
export const EVIDENCE_DETECTOR_VERSION = 'detectors-v0.2';
