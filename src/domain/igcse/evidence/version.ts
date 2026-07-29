/**
 * S4: bump whenever a detector in evidence/*.ts changes in a way that changes
 * buildEvidenceSubset's output — paired with EVIDENCE_DETECTOR_FIXTURE_HASH in
 * __tests__/version-pin.test.ts, which fails loudly if the two drift apart.
 *
 * Phase 1 (i-am-building-an-cosmic-cascade.md §10.7): bumped alongside
 * ENVELOPE_SCHEMA_VERSION in the same commit because buildEvidenceProfile's
 * output (the new EvidenceProfile wrapper) is now what's snapshotted into the
 * envelope, even though buildEvidenceSubset's own output is unchanged.
 *
 * Phase 3 (§10.7 Phase 3): bumped again because the registered detector fleet
 * grew from 5 (legacy) to 25 (5 legacy + 20 new) — buildEvidenceSubset's own
 * output is STILL byte-identical (see __tests__/version-pin.test.ts, which is
 * unchanged), but buildEvidenceProfile's full output (observations/
 * detectorRuns/detectorVersions/features) is not, so its own version-pin
 * (__tests__/buildEvidenceProfile.version-pin.test.ts) is what this bump
 * guards.
 *
 * Workstream E (fix-plan §Workstream E): bumped again. E1 replaces
 * cefr-vector's single invented-weighted `cefr_indicator` observation with
 * three raw component observations (lexical_density/complexity_ratio/
 * tense_range); E2 adds observationSchemaVersion/featureProjectionVersion to
 * EvidenceProfile. buildEvidenceSubset's own output is STILL byte-identical
 * (I2 — EVIDENCE_DETECTOR_FIXTURE_HASH unchanged); only buildEvidenceProfile's
 * full output changes, so again it's EVIDENCE_PROFILE_FIXTURE_HASH that moves.
 */
export const EVIDENCE_DETECTOR_VERSION = 'detectors-v0.5';
