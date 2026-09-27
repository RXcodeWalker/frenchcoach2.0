/**
 * S4 version-drift guard for the L2 scoring prompt. Hashes rendered prompt
 * output for the canonical fixture transcript, not source text, so this only
 * fires when the actual prompt sent to the model changes.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import { buildQualityOfLanguagePrompt, buildRolePlayCommunicationPrompt } from '../prompt';
import { SCORING_PROMPT_VERSION } from '../version';
import { PRACTICE_TRANSCRIPT } from './fixtures';

// scoring-prompt-v0.6: two prompts, two pins.
const SCORING_PROMPT_FIXTURE_HASH = '59d9574804c4a858577d538e13352c20decc5e7d5c4bd3f85a417f27932c4a62';
const QOL_PROMPT_FIXTURE_HASH = 'f1da2708391b9d3115bd250ea4746817c9ecf2937bb23a3029bce0c676558273';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('scoring prompt version pin', () => {
  it('buildRolePlayCommunicationPrompt(PRACTICE_TRANSCRIPT, evidence) hash matches SCORING_PROMPT_FIXTURE_HASH', () => {
    const evidence = buildEvidenceProfile(PRACTICE_TRANSCRIPT);
    const actual = sha256(buildRolePlayCommunicationPrompt(PRACTICE_TRANSCRIPT, evidence));
    expect(
      actual,
      `scoring prompt output changed — bump SCORING_PROMPT_VERSION (currently "${SCORING_PROMPT_VERSION}") and update SCORING_PROMPT_FIXTURE_HASH together in this commit`,
    ).toBe(SCORING_PROMPT_FIXTURE_HASH);
  });

  it('buildQualityOfLanguagePrompt(PRACTICE_TRANSCRIPT) hash matches QOL_PROMPT_FIXTURE_HASH', () => {
    const actual = sha256(buildQualityOfLanguagePrompt(PRACTICE_TRANSCRIPT));
    expect(
      actual,
      `Quality of Language prompt output changed — bump SCORING_PROMPT_VERSION (currently "${SCORING_PROMPT_VERSION}") and update QOL_PROMPT_FIXTURE_HASH together in this commit`,
    ).toBe(QOL_PROMPT_FIXTURE_HASH);
  });
});
