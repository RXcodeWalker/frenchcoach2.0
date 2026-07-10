/**
 * The seam test that justifies the whole S3 design: load a fixture SessionTranscript
 * through the real TranscriptStore port, project it, and feed it to L1's evidence
 * builder. Proves S4's batch harness can run end-to-end with zero audio, and fails
 * loudly if anyone later couples S3 to scoring.
 */

import { describe, it, expect } from 'vitest';
import { createFixtureTranscriptStore } from '../providers/fixtureTranscriptStore';
import { toSpeakingTranscript } from '../project/toSpeakingTranscript';
import { buildEvidenceSubset } from '../../evidence/buildEvidence';
import type { SessionQuestionSet } from '../types';

import structGolden from './fixtures/structurally-complete.golden.json';
import structQuestions from './fixtures/structurally-complete-questions.json';

describe('seam: fixture store -> projection -> buildEvidenceSubset', () => {
  it('produces a well-formed EvidenceProfileSubset from a fixture alone (no audio, no network)', async () => {
    const store = createFixtureTranscriptStore({ 'structurally-complete-001': structGolden });

    const session = await store.load('structurally-complete-001');
    const speakingTranscript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    const evidence = buildEvidenceSubset(speakingTranscript);

    expect(evidence).toBeDefined();
    expect(evidence.timeFrameAlignmentByQuestion.length).toBeGreaterThan(0);
  });
});
