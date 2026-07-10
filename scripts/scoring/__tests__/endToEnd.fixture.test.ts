/**
 * S4 exit criterion: one recording flows recording -> transcript -> L1 signals
 * -> L2 score -> envelope -> diff row with zero manual steps. This test
 * exercises the full pipeline (TranscriptStore.load -> toSpeakingTranscript ->
 * buildEvidenceSubset -> scoreSpeaking -> buildScoringEnvelope -> EnvelopeStore.save
 * -> buildDiffRows) against fixtures only, with zero network I/O.
 */

import { describe, expect, it, vi } from 'vitest';
import { createFixtureTranscriptStore } from '../../../src/domain/igcse/stt/providers/fixtureTranscriptStore';
import { createFixtureEnvelopeStore } from '../../../src/domain/igcse/envelope/providers/fixtureEnvelopeStore';
import { toSpeakingTranscript } from '../../../src/domain/igcse/stt/project/toSpeakingTranscript';
import { buildDiffRows } from '../../../src/domain/igcse/comparison/diff';
import type { SessionQuestionSet, SessionTranscript } from '../../../src/domain/igcse/stt/types';
import { scoreAttempt } from '../scoreAttempt';
import { createGenericFakeJudge } from './fixtures';

import structGolden from '../../../src/domain/igcse/stt/__tests__/fixtures/structurally-complete.golden.json';
import structQuestions from '../../../src/domain/igcse/stt/__tests__/fixtures/structurally-complete-questions.json';

const SESSION_ID = 'structurally-complete-001';

describe('S4 exit criterion: recording -> transcript -> L1 -> L2 -> envelope -> diff row', () => {
  it('flows end-to-end over fixtures with zero manual steps and zero network I/O', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in this test'));

    const questionSet = structQuestions as SessionQuestionSet;
    const transcriptStore = createFixtureTranscriptStore({ [SESSION_ID]: structGolden });
    const envelopeStore = createFixtureEnvelopeStore({});

    const judge = createGenericFakeJudge(() => {
      const session = structGolden as unknown as SessionTranscript;
      return toSpeakingTranscript(session, questionSet);
    });
    let lastCallMetadata: { provider: 'gemini'; model: string; responseId?: string } | undefined;
    const createJudge = () => {
      const wrapped: typeof judge = async (req) => {
        const r = await judge(req);
        lastCallMetadata = { provider: 'gemini', model: 'fixture-judge', responseId: 'resp-fixture' };
        return r;
      };
      return { judge: wrapped, getLastCallMetadata: () => lastCallMetadata };
    };

    // recording -> transcript -> L1 -> L2 -> envelope, one function call
    const envelope = await scoreAttempt({ transcriptStore, createJudge }, { sessionId: SESSION_ID, questionSet });

    // envelope -> persisted
    await envelopeStore.save(envelope);
    const reloaded = await envelopeStore.load(envelope.attemptId);
    expect(reloaded).toEqual(envelope);

    // envelope -> diff row (no teacher marks in this fixture — null fields, never fabricated)
    const diffRows = buildDiffRows(envelope);
    expect(diffRows.length).toBe(envelope.rolePlayTasks.length + 2);
    for (const row of diffRows) {
      expect(row.sessionId).toBe(SESSION_ID);
      expect(row.attemptId).toBe(envelope.attemptId);
      expect(row.teacherMark).toBeNull();
      expect(row.delta).toBeNull();
      expect(typeof row.justification).toBe('string');
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
