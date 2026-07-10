import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFileEnvelopeStore } from '../fileEnvelopeStore';
import { buildScoringEnvelope } from '../../../src/domain/igcse/envelope/buildEnvelope';
import { buildEvidenceSubset } from '../../../src/domain/igcse/evidence/buildEvidence';
import { buildValidJudgeOutput, PRACTICE_TRANSCRIPT } from '../../../src/domain/igcse/judgement/__tests__/fixtures';
import { parseAndValidateJudgeOutput } from '../../../src/domain/igcse/judgement/schema';

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'envelope-store-test-'));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

function buildTestEnvelope(attemptId: string, sessionId: string) {
  const assessment = parseAndValidateJudgeOutput(buildValidJudgeOutput(), PRACTICE_TRANSCRIPT);
  return buildScoringEnvelope({
    attemptId,
    sessionId,
    scoredAt: '2026-07-10T00:00:00.000Z',
    transcript: PRACTICE_TRANSCRIPT,
    assessment,
    evidenceProfile: buildEvidenceSubset(PRACTICE_TRANSCRIPT),
    stt: {
      model: 'm',
      modelVersion: '1',
      provider: 'p',
      languageCode: 'fr',
      alignmentModel: null,
      diarizationModel: null,
      decodeParamsHash: 'h',
      confidenceSource: 'whisperx-align-score',
      promptBiasedRetries: 0,
      transcribedAt: '2026-07-09T00:00:00.000Z',
    },
    transcriptVersion: { schemaVersion: 'session-transcript-v1', assemblerVersion: 'stt-assembler-v1' },
    transcriptQuality: { meanWordConfidence: 0.9, lowConfidenceSpanRatio: 0, lowConfidenceSpanCount: 0 },
    userCorrected: false,
    llm: {
      model: 'claude-opus-4-8',
      effort: 'high',
      thinking: { type: 'adaptive' },
      selfConsistencyRuns: 1,
    },
    versions: {
      rubricVersion: 'rubric-v0.1',
      scoringEngineVersion: 'engine-v0.1',
      evidenceDetectorVersion: 'detectors-v0.1',
      scoringPromptVersion: 'scoring-prompt-v0.1',
    },
  });
}

describe('createFileEnvelopeStore', () => {
  it('round-trips save/load by attemptId', async () => {
    const store = createFileEnvelopeStore(tmpRoot);
    const envelope = buildTestEnvelope('attempt-1', 'session-1');

    await store.save(envelope);
    const loaded = await store.load('attempt-1');

    expect(loaded).toEqual(envelope);
  });

  it('list() returns attemptIds that have an envelope.json', async () => {
    const store = createFileEnvelopeStore(tmpRoot);
    await store.save(buildTestEnvelope('attempt-1', 'session-1'));
    await store.save(buildTestEnvelope('attempt-2', 'session-1'));

    const ids = await store.list();
    expect(ids.sort()).toEqual(['attempt-1', 'attempt-2']);
  });

  it('listBySession() filters by embedded sessionId, scanning rather than an index', async () => {
    const store = createFileEnvelopeStore(tmpRoot);
    await store.save(buildTestEnvelope('attempt-1', 'session-A'));
    await store.save(buildTestEnvelope('attempt-2', 'session-B'));
    await store.save(buildTestEnvelope('attempt-3', 'session-A'));

    const envelopes = await store.listBySession('session-A');
    expect(envelopes.map((e) => e.attemptId).sort()).toEqual(['attempt-1', 'attempt-3']);
  });
});
