/**
 * Phase 3 (§10.7 Phase 3, §10.6): version-drift guard for buildEvidenceProfile's
 * FULL output (the 25-detector fleet — legacy + Phase-3), separate from the
 * existing buildEvidenceSubset version-pin (which stays byte-identical and
 * unchanged — see __tests__/version-pin.test.ts). Hashes rendered output for
 * the canonical golden fixture, not source text, so this only fires when
 * observable behavior actually changes.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildEvidenceProfile } from '../buildEvidence';
import { EVIDENCE_DETECTOR_VERSION } from '../version';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from './fixtures';

const EVIDENCE_PROFILE_FIXTURE_HASH = '5e06e7991f410c1d64708295618e2498173bc512e83b9c601cb3a5171f754c23';

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

describe('buildEvidenceProfile version pin (Phase 3 fleet)', () => {
  it('buildEvidenceProfile(EVIDENCE_GOLDEN_TRANSCRIPT) hash matches EVIDENCE_PROFILE_FIXTURE_HASH', () => {
    const actual = sha256(buildEvidenceProfile(EVIDENCE_GOLDEN_TRANSCRIPT));
    expect(
      actual,
      `buildEvidenceProfile output changed — bump EVIDENCE_DETECTOR_VERSION (currently "${EVIDENCE_DETECTOR_VERSION}") and update EVIDENCE_PROFILE_FIXTURE_HASH together in this commit`,
    ).toBe(EVIDENCE_PROFILE_FIXTURE_HASH);
  });
});
