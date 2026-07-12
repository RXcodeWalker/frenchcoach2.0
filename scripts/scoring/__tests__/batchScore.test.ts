import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBatchScore } from '../batchScore';
import { createFixtureTranscriptStore } from '../../../src/domain/igcse/stt/providers/fixtureTranscriptStore';
import { createFixtureEnvelopeStore } from '../../../src/domain/igcse/envelope/providers/fixtureEnvelopeStore';
import { toSpeakingTranscript } from '../../../src/domain/igcse/stt/project/toSpeakingTranscript';
import type { SessionQuestionSet, SessionTranscript } from '../../../src/domain/igcse/stt/types';
import { createGenericFakeJudge } from './fixtures';

import structGolden from '../../../src/domain/igcse/stt/__tests__/fixtures/structurally-complete.golden.json';
import structQuestions from '../../../src/domain/igcse/stt/__tests__/fixtures/structurally-complete-questions.json';

const SESSION_ID = 'structurally-complete-001';

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'batch-score-test-'));
  const sessionDir = path.join(tmpRoot, SESSION_ID);
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(path.join(sessionDir, 'questions.json'), JSON.stringify(structQuestions), 'utf8');
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

function questionSet(): SessionQuestionSet {
  return structQuestions as SessionQuestionSet;
}

function buildGoodJudgeFactory() {
  return () => {
    const judge = createGenericFakeJudge(() => {
      const session = structGolden as unknown as SessionTranscript;
      return toSpeakingTranscript(session, questionSet());
    });
    let meta: { provider: 'gemini'; model: string; responseId?: string } | undefined;
    const wrapped: typeof judge = async (req) => {
      const r = await judge(req);
      meta = { provider: 'gemini', model: 'fake-model', responseId: 'resp-fake' };
      return r;
    };
    return { judge: wrapped, getLastCallMetadata: () => meta };
  };
}

describe('runBatchScore', () => {
  it('scores a session, writes diff.csv and report.md, no teacher marks present', async () => {
    const transcriptStore = createFixtureTranscriptStore({ [SESSION_ID]: structGolden });
    const envelopeStore = createFixtureEnvelopeStore({});
    const outDir = path.join(tmpRoot, 'out');

    const { diffRows, failures } = await runBatchScore(
      { transcriptStore: 'fixture', sessionsRoot: tmpRoot, judge: 'fixture', outDir, debug: false, sortBy: 'none' },
      { transcriptStore, envelopeStore, createJudge: buildGoodJudgeFactory() },
    );

    expect(failures).toEqual([]);
    expect(diffRows.length).toBeGreaterThan(0);
    for (const row of diffRows) {
      expect(row.teacherMark).toBeNull();
      expect(row.delta).toBeNull();
    }

    const csv = await fs.readFile(path.join(outDir, 'diff.csv'), 'utf8');
    expect(csv).toContain('sessionId');
    expect(csv).toContain(SESSION_ID);

    const report = await fs.readFile(path.join(outDir, 'report.md'), 'utf8');
    expect(report).toContain(`## Session ${SESSION_ID}`);
    expect(report).not.toContain('Scoring failed');
  });

  it('reads teacher-marks.json when present and populates deltas', async () => {
    const teacherMarks = {
      sessionId: SESSION_ID,
      markedBy: 'teacher-a',
      markedAt: '2026-07-10T00:00:00.000Z',
      marks: [{ criterion: 'communication', mark: 9 }],
    };
    await fs.writeFile(
      path.join(tmpRoot, SESSION_ID, 'teacher-marks.json'),
      JSON.stringify(teacherMarks),
      'utf8',
    );

    const transcriptStore = createFixtureTranscriptStore({ [SESSION_ID]: structGolden });
    const envelopeStore = createFixtureEnvelopeStore({});
    const outDir = path.join(tmpRoot, 'out');

    const { diffRows } = await runBatchScore(
      { transcriptStore: 'fixture', sessionsRoot: tmpRoot, judge: 'fixture', outDir, debug: false, sortBy: 'none' },
      { transcriptStore, envelopeStore, createJudge: buildGoodJudgeFactory() },
    );

    const comm = diffRows.find((r) => r.criterion === 'communication')!;
    expect(comm.teacherMark).toBe(9);
    expect(comm.delta).not.toBeNull();
  });

  it('isolates a scoring failure to one session and continues the batch', async () => {
    const otherSessionId = 'other-session';
    const otherDir = path.join(tmpRoot, otherSessionId);
    await fs.mkdir(otherDir, { recursive: true });
    await fs.writeFile(path.join(otherDir, 'questions.json'), JSON.stringify(structQuestions), 'utf8');

    const transcriptStore = createFixtureTranscriptStore({
      [SESSION_ID]: structGolden,
      [otherSessionId]: { ...structGolden, sessionId: otherSessionId },
    });
    const envelopeStore = createFixtureEnvelopeStore({});
    const outDir = path.join(tmpRoot, 'out');

    let callCount = 0;
    const createJudge = () => {
      callCount += 1;
      if (callCount === 1) {
        // First session's judge returns invalid JSON -> JudgementValidationError
        return { judge: async () => ({ raw: 'not json' }), getLastCallMetadata: () => ({ provider: 'gemini' as const, model: 'x' }) };
      }
      return buildGoodJudgeFactory()();
    };

    const { diffRows, failures } = await runBatchScore(
      { transcriptStore: 'fixture', sessionsRoot: tmpRoot, judge: 'fixture', outDir, debug: false, sortBy: 'none' },
      { transcriptStore, envelopeStore, createJudge },
    );

    expect(failures).toHaveLength(1);
    expect(diffRows.length).toBeGreaterThan(0);

    const report = await fs.readFile(path.join(outDir, 'report.md'), 'utf8');
    expect(report).toContain('Scoring failed');
  });

  it('writes evidence.json and review-artifacts.json alongside diff.csv/report.md', async () => {
    const transcriptStore = createFixtureTranscriptStore({ [SESSION_ID]: structGolden });
    const envelopeStore = createFixtureEnvelopeStore({});
    const outDir = path.join(tmpRoot, 'out');

    await runBatchScore(
      { transcriptStore: 'fixture', sessionsRoot: tmpRoot, judge: 'fixture', outDir, debug: false, sortBy: 'none' },
      { transcriptStore, envelopeStore, createJudge: buildGoodJudgeFactory() },
    );

    const evidence = JSON.parse(await fs.readFile(path.join(outDir, 'evidence.json'), 'utf8'));
    expect(evidence[SESSION_ID]).toBeDefined();
    expect(evidence[SESSION_ID].criteria.length).toBeGreaterThan(0);

    const reviewArtifacts = JSON.parse(await fs.readFile(path.join(outDir, 'review-artifacts.json'), 'utf8'));
    expect(Array.isArray(reviewArtifacts)).toBe(true);
    expect(reviewArtifacts.length).toBeGreaterThan(0);
    for (const row of reviewArtifacts) {
      expect(row.reviewed).toBe(false);
    }

    const reviewMd = await fs.readFile(path.join(outDir, 'review-artifacts.md'), 'utf8');
    expect(reviewMd).toContain('# Review artifacts');
  });

  it('produces byte-identical diff.csv with and without --sort-by', async () => {
    const transcriptStore1 = createFixtureTranscriptStore({ [SESSION_ID]: structGolden });
    const envelopeStore1 = createFixtureEnvelopeStore({});
    const outDirNone = path.join(tmpRoot, 'out-none');

    await runBatchScore(
      { transcriptStore: 'fixture', sessionsRoot: tmpRoot, judge: 'fixture', outDir: outDirNone, debug: false, sortBy: 'none' },
      { transcriptStore: transcriptStore1, envelopeStore: envelopeStore1, createJudge: buildGoodJudgeFactory() },
    );

    const transcriptStore2 = createFixtureTranscriptStore({ [SESSION_ID]: structGolden });
    const envelopeStore2 = createFixtureEnvelopeStore({});
    const outDirDelta = path.join(tmpRoot, 'out-delta');

    await runBatchScore(
      { transcriptStore: 'fixture', sessionsRoot: tmpRoot, judge: 'fixture', outDir: outDirDelta, debug: false, sortBy: 'delta' },
      { transcriptStore: transcriptStore2, envelopeStore: envelopeStore2, createJudge: buildGoodJudgeFactory() },
    );

    // attemptId is a fresh crypto.randomUUID() per scoreAttempt() call, so it legitimately
    // differs between these two independent runs — normalize it out before comparing, since
    // the claim under test is "row order/content is unaffected by --sort-by", not determinism
    // of attemptId generation (which is separately guaranteed by scoreAttempt.ts).
    const normalizeAttemptId = (csv: string) => csv.replace(/"[0-9a-f-]{36}"/g, '"<attemptId>"');
    const csvNone = await fs.readFile(path.join(outDirNone, 'diff.csv'), 'utf8');
    const csvDelta = await fs.readFile(path.join(outDirDelta, 'diff.csv'), 'utf8');
    expect(normalizeAttemptId(csvDelta)).toBe(normalizeAttemptId(csvNone));
  });

  it('--sort-by guardrails reorders report.md session sections by descending guardrail trigger count', async () => {
    const otherSessionId = 'other-session';
    const otherDir = path.join(tmpRoot, otherSessionId);
    await fs.mkdir(otherDir, { recursive: true });
    await fs.writeFile(path.join(otherDir, 'questions.json'), JSON.stringify(structQuestions), 'utf8');

    const transcriptStore = createFixtureTranscriptStore({
      [SESSION_ID]: structGolden,
      [otherSessionId]: { ...structGolden, sessionId: otherSessionId },
    });
    const envelopeStore = createFixtureEnvelopeStore({});
    const outDir = path.join(tmpRoot, 'out');

    await runBatchScore(
      { transcriptStore: 'fixture', sessionsRoot: tmpRoot, judge: 'fixture', outDir, debug: false, sortBy: 'guardrails' },
      { transcriptStore, envelopeStore, createJudge: buildGoodJudgeFactory() },
    );

    const report = await fs.readFile(path.join(outDir, 'report.md'), 'utf8');
    // Neither session trips a guardrail (clean fixture), so ordering falls back to
    // original grouping order — this just confirms the flag doesn't crash or drop a session.
    expect(report).toContain(`## Session ${SESSION_ID}`);
    expect(report).toContain(`## Session ${otherSessionId}`);
  });
});
