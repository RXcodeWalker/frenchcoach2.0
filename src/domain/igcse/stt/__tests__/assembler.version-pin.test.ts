/**
 * Version-drift guard for the ASR assembler. The golden transcripts are asserted
 * equal to assembleSession's output by assembleSession.golden/fixtures tests, so
 * hashing them (version fields stripped) pins the assembler's observable
 * behaviour: when it changes, the goldens change, this hash moves, and the
 * message below says what to bump.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { STT_ASSEMBLER_VERSION, STT_SCHEMA_VERSION } from '../version';
import adversarial from './fixtures/adversarial-session.golden.json';
import clean from './fixtures/clean-session.golden.json';
import cleanTopic from './fixtures/clean-topic-conversation.golden.json';
import short from './fixtures/short-duration.golden.json';
import structural from './fixtures/structurally-complete.golden.json';

const ASSEMBLER_OUTPUT_HASH = 'd32c45769e8518834eddfeba63fb8e290b2a9d243c9a4c81e2d9891c200168bf';

function withoutVersions(doc: Record<string, unknown>): Record<string, unknown> {
  const { schemaVersion: _s, assemblerVersion: _a, ...rest } = doc;
  void _s;
  void _a;
  return rest;
}

describe('STT assembler version pin', () => {
  it('assembler output on the golden fixtures matches ASSEMBLER_OUTPUT_HASH', () => {
    const actual = createHash('sha256')
      .update(JSON.stringify([adversarial, clean, cleanTopic, short, structural].map((d) => withoutVersions(d))))
      .digest('hex');
    expect(
      actual,
      `assembler output changed — bump STT_ASSEMBLER_VERSION (currently "${STT_ASSEMBLER_VERSION}") and update ASSEMBLER_OUTPUT_HASH together in this commit`,
    ).toBe(ASSEMBLER_OUTPUT_HASH);
  });

  it('the goldens carry the current schema and assembler versions', () => {
    for (const doc of [adversarial, clean, cleanTopic, short, structural]) {
      expect(doc.schemaVersion).toBe(STT_SCHEMA_VERSION);
      expect(doc.assemblerVersion).toBe(STT_ASSEMBLER_VERSION);
    }
  });

  it('versions are the ones this schema shipped with', () => {
    expect({ STT_SCHEMA_VERSION, STT_ASSEMBLER_VERSION }).toEqual({
      STT_SCHEMA_VERSION: 'session-transcript-v2',
      STT_ASSEMBLER_VERSION: 'stt-assembler-v2',
    });
  });
});
