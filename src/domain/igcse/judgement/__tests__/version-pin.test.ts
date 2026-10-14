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
import { PRACTICE_TRANSCRIPT, PRACTICE_TRANSCRIPT_WITH_UNCERTAIN_WORDS } from './fixtures';

// scoring-prompt-v0.6.1: two prompts, two pins. Main call unchanged since
// v0.6 (turnId ambiguity fix only touched the QoL prompt).
const SCORING_PROMPT_FIXTURE_HASH = '59d9574804c4a858577d538e13352c20decc5e7d5c4bd3f85a417f27932c4a62';
const QOL_PROMPT_FIXTURE_HASH = 'e9b7700da7304c59c68fc836117d3df0d55f29292c8432db673c1faa5d786853';
// scoring-prompt-v0.7 (stage 6): the two pins above did not move (no answer
// has an "Uncertain words" line); these pin the lines, the benefit-of-the-doubt
// rules and the re-ask's "Not errors" section.
const UNCERTAIN_MAIN_PROMPT_HASH = '5437fb089760479d952feae2faafe9f3f4d6dd106f7e92d7dba59b5f4ce48154';
const UNCERTAIN_QOL_PROMPT_HASH = '0d4736ea76184bff77c72d08f814824e33d93b6264022b58928feabf0cd4b46f';
const QOL_REASK_PROMPT_HASH = '7b01352c88d026e73be718f578a8be070c231d16b192c165e9c103002a03274a';

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

  it('stage 6: both prompts with "Uncertain words" lines, and the QoL re-ask, match their pins', () => {
    const transcript = PRACTICE_TRANSCRIPT_WITH_UNCERTAIN_WORDS;
    const hint = `bump SCORING_PROMPT_VERSION (currently "${SCORING_PROMPT_VERSION}") and update the stage 6 pins together`;
    expect(sha256(buildRolePlayCommunicationPrompt(transcript, buildEvidenceProfile(transcript))), hint).toBe(
      UNCERTAIN_MAIN_PROMPT_HASH,
    );
    expect(sha256(buildQualityOfLanguagePrompt(transcript)), hint).toBe(UNCERTAIN_QOL_PROMPT_HASH);
    const notErrors = [
      { source: 'topic1' as const, turnId: 'q2', quote: 'Je préfère le sport', kind: 'grammar' as const, correction: 'Je préfère les sports' },
    ];
    expect(sha256(buildQualityOfLanguagePrompt(transcript, { notErrors })), hint).toBe(QOL_REASK_PROMPT_HASH);
  });
});
