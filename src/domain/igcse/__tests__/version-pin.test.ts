/**
 * S4 version-drift guard for rubric.ts. Hashes rendered output (the frozen
 * IGCSE_0520_SPEAKING object), not source text, so this only fires when
 * observable behavior actually changes — not on comments/formatting/refactors.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { IGCSE_0520_SPEAKING, RUBRIC_VERSION } from '../rubric';

const RUBRIC_CONTENT_HASH = '0579317a04412e2a30e18e4448ce121c8fcc593499bdff2cfc5c4d9812864736';

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

describe('rubric.ts version pin', () => {
  it('IGCSE_0520_SPEAKING output hash matches RUBRIC_CONTENT_HASH', () => {
    const actual = sha256(IGCSE_0520_SPEAKING);
    expect(
      actual,
      `rubric output changed — bump RUBRIC_VERSION (currently "${RUBRIC_VERSION}") and update RUBRIC_CONTENT_HASH together in this commit`,
    ).toBe(RUBRIC_CONTENT_HASH);
  });
});
