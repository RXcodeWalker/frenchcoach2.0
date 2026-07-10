import { describe, expect, it, vi } from 'vitest';
import { createFixtureTranscriptStore } from '../../../src/domain/igcse/stt/providers/fixtureTranscriptStore';
import { toSpeakingTranscript } from '../../../src/domain/igcse/stt/project/toSpeakingTranscript';
import type { SessionQuestionSet, SessionTranscript } from '../../../src/domain/igcse/stt/types';
import { scoreAttempt, replayEnvelope } from '../scoreAttempt';
import type { ScoreAttemptDeps } from '../scoreAttempt';
import { createGenericFakeJudge } from './fixtures';

import structGolden from '../../../src/domain/igcse/stt/__tests__/fixtures/structurally-complete.golden.json';
import structQuestions from '../../../src/domain/igcse/stt/__tests__/fixtures/structurally-complete-questions.json';

const SESSION_ID = 'structurally-complete-001';

function buildTranscriptStore() {
  return createFixtureTranscriptStore({ [SESSION_ID]: structGolden });
}

function makeDeps(): ScoreAttemptDeps {
  const transcriptStore = buildTranscriptStore();
  const questionSet = structQuestions as SessionQuestionSet;

  return {
    transcriptStore,
    createJudge: () => {
      const judge = createGenericFakeJudge(() => {
        // Recompute what the judge would see, matching scoreAttempt's own pipeline.
        const session = structGolden as unknown as SessionTranscript;
        return toSpeakingTranscript(session, questionSet);
      });
      let lastCallMetadata: { provider: 'gemini'; model: string; responseId?: string } | undefined;
      const wrappedJudge: typeof judge = async (req) => {
        const result = await judge(req);
        lastCallMetadata = { provider: 'gemini', model: 'fake-model', responseId: 'resp-fake' };
        return result;
      };
      return { judge: wrappedJudge, getLastCallMetadata: () => lastCallMetadata };
    },
  };
}

describe('scoreAttempt', () => {
  it('produces a ScoringEnvelope with the declared evidenceDetectorVersion matching current code', async () => {
    const deps = makeDeps();
    const envelope = await scoreAttempt(deps, {
      sessionId: SESSION_ID,
      questionSet: structQuestions as SessionQuestionSet,
    });

    expect(envelope.sessionId).toBe(SESSION_ID);
    expect(envelope.versions.evidenceDetectorVersion).toBeTruthy();
    expect(envelope.rolePlayTasks).toHaveLength(5);
    expect(envelope.total).toBeGreaterThan(0);
    expect(envelope.regradedFrom).toBeUndefined();
  });

  it('carries the source session questionSetId/questionSetHash into the envelope', async () => {
    const deps = makeDeps();
    const envelope = await scoreAttempt(deps, {
      sessionId: SESSION_ID,
      questionSet: structQuestions as SessionQuestionSet,
    });

    expect(envelope.questionSetId).toBe((structGolden as unknown as SessionTranscript).questionSetId);
    expect(envelope.questionSetHash).toBe((structGolden as unknown as SessionTranscript).questionSetHash);
  });

  it('propagates ProvenanceError/JudgementValidationError unchanged rather than swallowing them', async () => {
    const deps = makeDeps();
    const badJudge = async () => ({ raw: 'not json' });
    deps.createJudge = () => ({ judge: badJudge, getLastCallMetadata: () => ({ provider: 'gemini' as const, model: 'x' }) });

    await expect(
      scoreAttempt(deps, { sessionId: SESSION_ID, questionSet: structQuestions as SessionQuestionSet }),
    ).rejects.toThrow(/JSON/);
  });
});

describe('replayEnvelope', () => {
  it('reloads the transcript fresh via TranscriptStore.load rather than reusing prior snapshots', async () => {
    const deps = makeDeps();
    const loadSpy = vi.spyOn(deps.transcriptStore, 'load');

    const prior = await scoreAttempt(deps, {
      sessionId: SESSION_ID,
      questionSet: structQuestions as SessionQuestionSet,
    });
    loadSpy.mockClear();

    const replayed = await replayEnvelope(deps, prior, structQuestions as SessionQuestionSet);

    expect(loadSpy).toHaveBeenCalledWith(prior.sessionId);
    expect(replayed.regradedFrom).toBe(prior.attemptId);
    expect(replayed.attemptId).not.toBe(prior.attemptId);
  });

  it('recomputes evidence under a bumped detector version rather than copying the prior snapshot', async () => {
    const originalDeps = makeDeps();
    originalDeps.versions = { evidenceDetectorVersion: 'detectors-v0.1' };
    const prior = await scoreAttempt(originalDeps, {
      sessionId: SESSION_ID,
      questionSet: structQuestions as SessionQuestionSet,
    });
    expect(prior.versions.evidenceDetectorVersion).toBe('detectors-v0.1');

    const replayDeps = makeDeps();
    replayDeps.versions = { evidenceDetectorVersion: 'detectors-v0.2' };
    const loadSpy = vi.spyOn(replayDeps.transcriptStore, 'load');

    const replayed = await replayEnvelope(replayDeps, prior, structQuestions as SessionQuestionSet);

    expect(loadSpy).toHaveBeenCalledWith(prior.sessionId);
    expect(replayed.versions.evidenceDetectorVersion).toBe('detectors-v0.2');
    expect(replayed.versions.evidenceDetectorVersion).not.toBe(prior.versions.evidenceDetectorVersion);
  });

  it('never reads prior.evidenceProfileSnapshot/transcriptSnapshot as scoring inputs', async () => {
    const deps = makeDeps();
    const prior = await scoreAttempt(deps, {
      sessionId: SESSION_ID,
      questionSet: structQuestions as SessionQuestionSet,
    });

    // Corrupt the prior's snapshots so that if replay ever read them, the
    // replayed envelope would visibly differ / break.
    const corruptedPrior = {
      ...prior,
      evidenceProfileSnapshot: { corrupted: true } as any,
      transcriptSnapshot: { corrupted: true } as any,
    };

    const replayed = await replayEnvelope(deps, corruptedPrior, structQuestions as SessionQuestionSet);

    expect(replayed.evidenceProfileSnapshot).not.toEqual({ corrupted: true });
    expect(replayed.transcriptSnapshot).not.toEqual({ corrupted: true });
    expect(replayed.rolePlayTasks).toHaveLength(5);
  });
});
