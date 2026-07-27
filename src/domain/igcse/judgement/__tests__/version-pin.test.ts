/**
 * S4 version-drift guard for the L2 scoring prompt. Hashes rendered prompt
 * output for the canonical fixture transcript, not source text, so this only
 * fires when the actual prompt sent to the model changes.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import { buildJudgementPrompt } from '../prompt';
import { SCORING_PROMPT_VERSION } from '../version';
import { PRACTICE_TRANSCRIPT } from './fixtures';

const SCORING_PROMPT_FIXTURE_HASH = 'a8576c5876c96b9f2bc6c02479c0863bb4170dd8df0298d4fd1d18e7961ff01e';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('scoring prompt version pin', () => {
  it('buildJudgementPrompt(PRACTICE_TRANSCRIPT, evidence) hash matches SCORING_PROMPT_FIXTURE_HASH', () => {
    const evidence = buildEvidenceProfile(PRACTICE_TRANSCRIPT);
    const actual = sha256(buildJudgementPrompt(PRACTICE_TRANSCRIPT, evidence));
    expect(
      actual,
      `scoring prompt output changed — bump SCORING_PROMPT_VERSION (currently "${SCORING_PROMPT_VERSION}") and update SCORING_PROMPT_FIXTURE_HASH together in this commit`,
    ).toBe(SCORING_PROMPT_FIXTURE_HASH);
  });
});
