/**
 * Pronunciation analysis ships without touching any scoring version (plan §3c
 * item 4). If one of these fails in an exam-pronunciation change, the change
 * reached the scored pipeline — that is a scoring change, not a feedback one,
 * and needs the Assessment-Engine change procedure instead.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SCORING_PROMPT_VERSION } from '../../igcse/judgement/version';
import { GUARDRAILS_VERSION } from '../../igcse/guardrails/version';
import { RUBRIC_VERSION } from '../../igcse/rubric';
import { ENVELOPE_SCHEMA_VERSION } from '../../igcse/envelope/types';
import { EVIDENCE_DETECTOR_VERSION } from '../../igcse/evidence/version';
import { SESSION_ENGINE_VERSION } from '../../igcse/session/version';
import { EXAM_FEEDBACK_VERSION } from '../../examFeedback/version';
import { buildEvidenceProfile } from '../../igcse/evidence/buildEvidence';
import { buildQualityOfLanguagePrompt, buildRolePlayCommunicationPrompt } from '../../igcse/judgement/prompt';
import { PRACTICE_TRANSCRIPT } from '../../igcse/judgement/__tests__/fixtures';
import { buildExamFeedbackPrompt } from '../../examFeedback/prompt';
import { buildFixtureEnvelope } from '../../examFeedback/__tests__/envelopeFixture';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

describe('exam pronunciation leaves every scoring version unchanged', () => {
  it('version constants', () => {
    expect({
      SCORING_PROMPT_VERSION,
      GUARDRAILS_VERSION,
      RUBRIC_VERSION,
      ENVELOPE_SCHEMA_VERSION,
      EVIDENCE_DETECTOR_VERSION,
      SESSION_ENGINE_VERSION,
      EXAM_FEEDBACK_VERSION,
    }).toEqual({
      SCORING_PROMPT_VERSION: 'scoring-prompt-v0.6.1',
      GUARDRAILS_VERSION: 'guardrails-v0.6',
      RUBRIC_VERSION: 'rubric-v0.1',
      ENVELOPE_SCHEMA_VERSION: 'envelope-v0.4',
      EVIDENCE_DETECTOR_VERSION: 'detectors-v0.6',
      SESSION_ENGINE_VERSION: 'session-engine-v4',
      EXAM_FEEDBACK_VERSION: 'exam-feedback-v0.1',
    });
  });

  it('judge prompts (main + Quality of Language) render byte-identically', () => {
    expect(sha256(buildRolePlayCommunicationPrompt(PRACTICE_TRANSCRIPT, buildEvidenceProfile(PRACTICE_TRANSCRIPT)))).toBe(
      '59d9574804c4a858577d538e13352c20decc5e7d5c4bd3f85a417f27932c4a62',
    );
    expect(sha256(buildQualityOfLanguagePrompt(PRACTICE_TRANSCRIPT))).toBe(
      'e9b7700da7304c59c68fc836117d3df0d55f29292c8432db673c1faa5d786853',
    );
  });

  it('the post-marking report prompt renders byte-identically', () => {
    expect(sha256(buildExamFeedbackPrompt(buildFixtureEnvelope()))).toBe(
      '996029595347abe488aa374c957644e3513b7a6dbe3063f78985f2eea99685b6',
    );
  });
});
