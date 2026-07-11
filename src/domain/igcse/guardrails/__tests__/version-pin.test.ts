/**
 * S5 version-drift guard for the L3 guardrails. Hashes {config, output}
 * together (not output alone) so a threshold edit in config.ts always
 * changes the hash — even when it doesn't flip a golden fixture's trigger —
 * forcing a GUARDRAILS_VERSION bump in the same commit.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildEvidenceSubset } from '../../evidence/buildEvidence';
import { DEFAULT_DURATION_CONFIG } from '../config';
import { runGuardrails } from '../runGuardrails';
import { GUARDRAILS_VERSION } from '../version';
import { CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT } from './synthetic';

const GUARDRAILS_FIXTURE_HASH = '0ea98a83c910b1c4c94ecc3fbae95a90194235670fb1541e3ce0f7bf363de692';

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

describe('guardrails version pin', () => {
  it('runGuardrails(CLEAN_LONG_TRANSCRIPT) output + config hash matches GUARDRAILS_FIXTURE_HASH', () => {
    const evidence = buildEvidenceSubset(CLEAN_LONG_TRANSCRIPT);
    const report = runGuardrails(CLEAN_ASSESSMENT, evidence, CLEAN_LONG_TRANSCRIPT);
    const actual = sha256({ config: DEFAULT_DURATION_CONFIG, report });

    expect(
      actual,
      `guardrail output changed — bump GUARDRAILS_VERSION (currently "${GUARDRAILS_VERSION}") and update GUARDRAILS_FIXTURE_HASH together in this commit`,
    ).toBe(GUARDRAILS_FIXTURE_HASH);
  });
});
