import { describe, expect, it, vi } from 'vitest';
import { createFixtureTranscriptStore } from '../../../src/domain/igcse/stt/providers/fixtureTranscriptStore';
import { toSpeakingTranscript } from '../../../src/domain/igcse/stt/project/toSpeakingTranscript';
import type { SessionQuestionSet, SessionTranscript } from '../../../src/domain/igcse/stt/types';
import { scoreAttempt, replayEnvelope } from '../scoreAttempt';
import type { ScoreAttemptDeps } from '../scoreAttempt';
import { createGenericFakeJudge } from './fixtures';
import { JudgementValidationError } from '../../../src/domain/igcse/judgement/schema';
import type { Judge, JudgeKind, JudgeRequest, JudgeResponse } from '../../../src/domain/igcse/judgement/types';
import { enableScoringDebug } from '../observability/logger';

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

/**
 * A createJudge whose judges delegate to the good generic fake, except where
 * `override` returns a reply (or throws) for a given call kind and per-kind
 * call number. Records every judge call's kind so tests can count per kind.
 */
function makeKindAwareDeps(
  override: (req: JudgeRequest, callOfKind: number) => Promise<JudgeResponse> | undefined,
  metadataFor: (kind: JudgeKind) => { provider: 'gemini' | 'groq'; model: string; responseId?: string } = () => ({
    provider: 'gemini',
    model: 'fake-model',
    responseId: 'resp-fake',
  }),
) {
  const deps = makeDeps();
  const good = createGenericFakeJudge(() =>
    toSpeakingTranscript(structGolden as unknown as SessionTranscript, structQuestions as SessionQuestionSet),
  );
  const judgeCalls: JudgeKind[] = [];
  deps.createJudge = vi.fn(() => {
    let meta: ReturnType<typeof metadataFor> | undefined;
    const judge: Judge = async (req) => {
      judgeCalls.push(req.kind);
      const callOfKind = judgeCalls.filter((k) => k === req.kind).length;
      const reply = await (override(req, callOfKind) ?? good(req));
      meta = metadataFor(req.kind);
      return reply;
    };
    return { judge, getLastCallMetadata: () => meta };
  });
  return { deps, judgeCalls };
}

const NOT_JSON = async (): Promise<JudgeResponse> => ({ raw: 'not json' });

describe('scoreAttempt judge retry on JudgementValidationError', () => {
  it('makes one fresh judge call after an invalid main reply, and scores from the second (judgeAttempts = 2)', async () => {
    const { deps, judgeCalls } = makeKindAwareDeps((req, n) =>
      req.kind === 'rolePlayCommunication' && n === 1 ? NOT_JSON() : undefined,
    );
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const envelope = await scoreAttempt(deps, {
      sessionId: SESSION_ID,
      questionSet: structQuestions as SessionQuestionSet,
    });

    // main, QoL, main retry — each judge call on a fresh createJudge() instance.
    expect(deps.createJudge).toHaveBeenCalledTimes(3);
    expect(judgeCalls.filter((k) => k === 'rolePlayCommunication')).toHaveLength(2);
    expect(judgeCalls.filter((k) => k === 'qualityOfLanguage')).toHaveLength(1);
    expect(envelope.llm.model).toBe('fake-model');
    const lines = stderr.mock.calls.map((c) => String(c[0]));
    expect(
      lines.some(
        (l) => l.includes('"judgeAttempt":1') && l.includes('"judgeKind":"rolePlayCommunication"') && l.includes('JudgementValidationError'),
      ),
    ).toBe(true);
    expect(lines.some((l) => l.includes('"judgeAttempts":2') && l.includes('"judgeKind":"rolePlayCommunication"'))).toBe(true);
    stderr.mockRestore();
  });

  it('a QoL-only retry does not re-call the main judge', async () => {
    const { deps, judgeCalls } = makeKindAwareDeps((req, n) =>
      req.kind === 'qualityOfLanguage' && n === 1 ? NOT_JSON() : undefined,
    );
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const envelope = await scoreAttempt(deps, { sessionId: SESSION_ID, questionSet: structQuestions as SessionQuestionSet });

    expect(judgeCalls.filter((k) => k === 'rolePlayCommunication')).toHaveLength(1);
    expect(judgeCalls.filter((k) => k === 'qualityOfLanguage')).toHaveLength(2);
    expect(envelope.qualityOfLanguage.errors).toHaveLength(1);
    const lines = stderr.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes('"judgeAttempts":2') && l.includes('"judgeKind":"qualityOfLanguage"'))).toBe(true);
    stderr.mockRestore();
  });

  it('recovers on the third attempt after two invalid replies of a kind (MAX_JUDGE_ATTEMPTS = 3)', async () => {
    const { deps, judgeCalls } = makeKindAwareDeps((req, n) =>
      req.kind === 'rolePlayCommunication' && n <= 2 ? NOT_JSON() : undefined,
    );
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const envelope = await scoreAttempt(deps, {
      sessionId: SESSION_ID,
      questionSet: structQuestions as SessionQuestionSet,
    });

    expect(envelope.total).toBeGreaterThan(0);
    expect(judgeCalls.filter((k) => k === 'rolePlayCommunication')).toHaveLength(3);
    expect(judgeCalls.filter((k) => k === 'qualityOfLanguage')).toHaveLength(1);
    const lines = stderr.mock.calls.map((c) => String(c[0]));
    expect(lines.filter((l) => l.includes('JudgementValidationError') && l.includes('rolePlayCommunication'))).toHaveLength(2);
    expect(lines.some((l) => l.includes('"judgeAttempts":3') && l.includes('"judgeKind":"rolePlayCommunication"'))).toBe(true);
    stderr.mockRestore();
  });

  it('gives up after exhausting all 3 attempts of a kind, logging every failure — no partial marks', async () => {
    const { deps } = makeKindAwareDeps(() => NOT_JSON());
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(
      scoreAttempt(deps, { sessionId: SESSION_ID, questionSet: structQuestions as SessionQuestionSet }),
    ).rejects.toThrow(JudgementValidationError);

    // Both kinds, 3 attempts each.
    expect(deps.createJudge).toHaveBeenCalledTimes(6);
    const failureLines = stderr.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('JudgementValidationError'));
    expect(failureLines).toHaveLength(6);
    stderr.mockRestore();
  });

  it('a terminal QoL failure fails the whole attempt even when the main call succeeded', async () => {
    const { deps } = makeKindAwareDeps((req) => (req.kind === 'qualityOfLanguage' ? NOT_JSON() : undefined));
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await expect(
      scoreAttempt(deps, { sessionId: SESSION_ID, questionSet: structQuestions as SessionQuestionSet }),
    ).rejects.toThrow(/Quality of Language judge response is not valid JSON/);
    stderr.mockRestore();
  });

  it('does not retry a provider-call failure (judgeFactory.ts owns that fallback)', async () => {
    const { deps, judgeCalls } = makeKindAwareDeps(() => Promise.reject(new Error('Both judge providers failed')));

    await expect(
      scoreAttempt(deps, { sessionId: SESSION_ID, questionSet: structQuestions as SessionQuestionSet }),
    ).rejects.toThrow(/Both judge providers failed/);
    // One call per kind, neither retried.
    expect(deps.createJudge).toHaveBeenCalledTimes(2);
    expect(judgeCalls.filter((k) => k === 'rolePlayCommunication')).toHaveLength(1);
    expect(judgeCalls.filter((k) => k === 'qualityOfLanguage')).toHaveLength(1);
  });
});

describe('scoreAttempt — two concurrent L2 calls (scoring-prompt-v0.6)', () => {
  it('starts both calls before either finishes', async () => {
    const started: JudgeKind[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const good = createGenericFakeJudge(() =>
      toSpeakingTranscript(structGolden as unknown as SessionTranscript, structQuestions as SessionQuestionSet),
    );
    const { deps } = makeKindAwareDeps((req) => {
      started.push(req.kind);
      if (started.length === 2) release();
      return gate.then(() => good(req));
    });

    const envelope = await scoreAttempt(deps, { sessionId: SESSION_ID, questionSet: structQuestions as SessionQuestionSet });

    // If the calls were sequential, the first would wait on a gate only the
    // second can open, and this test would time out.
    expect([...started].sort()).toEqual(['qualityOfLanguage', 'rolePlayCommunication']);
    expect(envelope.total).toBeGreaterThan(0);
  });

  it('records mixed providers: llm for the main call, qualityOfLanguageLlm for the QoL call', async () => {
    const { deps } = makeKindAwareDeps(
      () => undefined,
      (kind) =>
        kind === 'qualityOfLanguage'
          ? { provider: 'groq', model: 'groq-model', responseId: 'resp-qol' }
          : { provider: 'gemini', model: 'gemini-model', responseId: 'resp-main' },
    );

    const envelope = await scoreAttempt(deps, { sessionId: SESSION_ID, questionSet: structQuestions as SessionQuestionSet });

    expect(envelope.llm).toEqual({ provider: 'gemini', model: 'gemini-model', selfConsistencyRuns: 1, responseId: 'resp-main' });
    expect(envelope.qualityOfLanguageLlm).toEqual({
      provider: 'groq',
      model: 'groq-model',
      selfConsistencyRuns: 1,
      responseId: 'resp-qol',
    });
  });

  it('writes the QoL error list and frequency into the envelope (v0.4)', async () => {
    const envelope = await scoreAttempt(makeDeps(), {
      sessionId: SESSION_ID,
      questionSet: structQuestions as SessionQuestionSet,
    });
    expect(envelope.versions.envelopeSchemaVersion).toBe('envelope-v0.4');
    expect(envelope.qualityOfLanguage.errors).toHaveLength(1);
    expect(envelope.qualityOfLanguage.errorFrequency).toBe('frequent errors');
    expect(envelope.qualityOfLanguageLlm?.model).toBe('fake-model');
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
      evidenceProfileSnapshot: { corrupted: true } as unknown as typeof prior.evidenceProfileSnapshot,
      transcriptSnapshot: { corrupted: true } as unknown as typeof prior.transcriptSnapshot,
    };

    const replayed = await replayEnvelope(deps, corruptedPrior, structQuestions as SessionQuestionSet);

    expect(replayed.evidenceProfileSnapshot).not.toEqual({ corrupted: true });
    expect(replayed.transcriptSnapshot).not.toEqual({ corrupted: true });
    expect(replayed.rolePlayTasks).toHaveLength(5);
  });
});

describe('scoreAttempt JSON-parse failure diagnostics (2026-09-27 reliability follow-up)', () => {
  // debugEnabled is a one-way module-level ratchet (see logger.ts) — the
  // "disabled" case must run before enableScoringDebug() anywhere in this
  // file, so this describe block's tests are ordered disabled-then-enabled
  // and nothing above this point in the file may call enableScoringDebug().

  it('does not log parse diagnostics when scoring debug is off (the always-on failure line still does)', async () => {
    const { deps } = makeKindAwareDeps((req, n) =>
      req.kind === 'qualityOfLanguage' && n === 1 ? NOT_JSON() : undefined,
    );
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await scoreAttempt(deps, { sessionId: SESSION_ID, questionSet: structQuestions as SessionQuestionSet });

    const lines = stderr.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes('JudgementValidationError'))).toBe(true);
    expect(lines.some((l) => l.includes('judgeParseFailureDiagnostics'))).toBe(false);
    stderr.mockRestore();
  });

  it('logs provider/model/length/truncation once scoring debug is on, never the reply text', async () => {
    enableScoringDebug();
    const { deps } = makeKindAwareDeps(
      (req, n) => (req.kind === 'qualityOfLanguage' && n === 1 ? NOT_JSON() : undefined),
      (kind) =>
        kind === 'qualityOfLanguage'
          ? { provider: 'gemini', model: 'gemini-2.5-flash', responseId: 'resp-qol' }
          : { provider: 'gemini', model: 'fake-model', responseId: 'resp-fake' },
    );
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await scoreAttempt(deps, { sessionId: SESSION_ID, questionSet: structQuestions as SessionQuestionSet });

    const lines = stderr.mock.calls.map((c) => String(c[0]));
    const diagnosticsLine = lines.find((l) => l.includes('judgeParseFailureDiagnostics'));
    expect(diagnosticsLine).toBeDefined();
    const parsed = JSON.parse(diagnosticsLine!);
    expect(parsed).toMatchObject({
      judgeKind: 'qualityOfLanguage',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      replyLength: 'not json'.length,
      looksTruncated: true,
    });
    expect(diagnosticsLine).not.toContain('not json');
    stderr.mockRestore();
  });
});
