/**
 * S4 version-drift guard for the L1 evidence detectors. Hashes rendered output
 * for the canonical golden fixture, not source text, so this only fires when
 * observable behavior actually changes.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildEvidenceSubset } from '../buildEvidence';
import { EVIDENCE_DETECTOR_VERSION } from '../version';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from './fixtures';

const EVIDENCE_DETECTOR_FIXTURE_HASH = '8b0577c4cd1117c0d5822555a470d66aa742650e66af61eb9addabf6910904f6';

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

describe('evidence detectors version pin', () => {
  it('buildEvidenceSubset(EVIDENCE_GOLDEN_TRANSCRIPT) hash matches EVIDENCE_DETECTOR_FIXTURE_HASH', () => {
    const actual = sha256(buildEvidenceSubset(EVIDENCE_GOLDEN_TRANSCRIPT));
    expect(
      actual,
      `evidence detector output changed — bump EVIDENCE_DETECTOR_VERSION (currently "${EVIDENCE_DETECTOR_VERSION}") and update EVIDENCE_DETECTOR_FIXTURE_HASH together in this commit`,
    ).toBe(EVIDENCE_DETECTOR_FIXTURE_HASH);
  });
});
