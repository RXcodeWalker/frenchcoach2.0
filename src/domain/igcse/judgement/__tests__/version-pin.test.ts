/**
 * S4 version-drift guard for the L2 scoring prompt. Hashes rendered prompt
 * output for the canonical fixture transcript, not source text, so this only
 * fires when the actual prompt sent to the model changes.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildJudgementPrompt } from '../prompt';
import { SCORING_PROMPT_VERSION } from '../version';
import { PRACTICE_TRANSCRIPT } from './fixtures';

const SCORING_PROMPT_FIXTURE_HASH = '2fabd7c6ec2d9d44821fcaff149eead213c7391a86beee5a79e06326aaa2ec62';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('scoring prompt version pin', () => {
  it('buildJudgementPrompt(PRACTICE_TRANSCRIPT) hash matches SCORING_PROMPT_FIXTURE_HASH', () => {
    const actual = sha256(buildJudgementPrompt(PRACTICE_TRANSCRIPT));
    expect(
      actual,
      `scoring prompt output changed — bump SCORING_PROMPT_VERSION (currently "${SCORING_PROMPT_VERSION}") and update SCORING_PROMPT_FIXTURE_HASH together in this commit`,
    ).toBe(SCORING_PROMPT_FIXTURE_HASH);
  });
});
