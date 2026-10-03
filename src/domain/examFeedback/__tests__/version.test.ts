/**
 * Version pin for the post-marking exam report. The prompt for a fixed
 * envelope is hashed: any change to the prompt text, the target-descriptor
 * selection or the transcript layout fails here until EXAM_FEEDBACK_VERSION is
 * bumped and the hash updated in the same commit.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildExamFeedbackPrompt } from '../prompt';
import { EXAM_FEEDBACK_VERSION } from '../version';
import { buildFixtureEnvelope } from './envelopeFixture';

const PROMPT_HASH = '996029595347abe488aa374c957644e3513b7a6dbe3063f78985f2eea99685b6';

describe('exam feedback version pin', () => {
  it('EXAM_FEEDBACK_VERSION is exam-feedback-v0.1', () => {
    expect(EXAM_FEEDBACK_VERSION).toBe('exam-feedback-v0.1');
  });

  it('the rendered prompt for the fixture envelope matches the pinned hash', () => {
    const hash = createHash('sha256').update(buildExamFeedbackPrompt(buildFixtureEnvelope())).digest('hex');
    expect(hash, `prompt changed — bump EXAM_FEEDBACK_VERSION (currently "${EXAM_FEEDBACK_VERSION}") and update PROMPT_HASH`).toBe(PROMPT_HASH);
  });
});
