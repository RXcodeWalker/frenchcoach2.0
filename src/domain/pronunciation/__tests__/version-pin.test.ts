/**
 * Version-drift guard for the PronunciationAssessment contract. Hashes the
 * golden fixture itself (not source text), so this only fires when the
 * observable shape actually changes — mirrors
 * src/domain/igcse/evidence/__tests__/version-pin.test.ts.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PRONUNCIATION_ASSESSOR_VERSION } from '../version';
import { PRONUNCIATION_GOLDEN_ASSESSMENT, PRONUNCIATION_WHISPER_HEURISTIC_ASSESSMENT } from './fixtures';

const PRONUNCIATION_FIXTURE_HASH = '4d3d6aac7d3ce7fde2f64840d836103dba2498b7869c5330771f003e1c13a047';

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

describe('pronunciation assessment version pin', () => {
  it('golden + whisper-heuristic fixture hash matches PRONUNCIATION_FIXTURE_HASH', () => {
    const actual = sha256([PRONUNCIATION_GOLDEN_ASSESSMENT, PRONUNCIATION_WHISPER_HEURISTIC_ASSESSMENT]);
    expect(
      actual,
      `pronunciation contract shape changed — bump PRONUNCIATION_ASSESSOR_VERSION (currently "${PRONUNCIATION_ASSESSOR_VERSION}") and update PRONUNCIATION_FIXTURE_HASH together in this commit`,
    ).toBe(PRONUNCIATION_FIXTURE_HASH);
  });
});
