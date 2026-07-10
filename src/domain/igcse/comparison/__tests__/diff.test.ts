import { describe, expect, it } from 'vitest';
import { buildScoringEnvelope } from '../../envelope/buildEnvelope';
import { buildEvidenceSubset } from '../../evidence/buildEvidence';
import { buildValidJudgeOutput, PRACTICE_TRANSCRIPT } from '../../judgement/__tests__/fixtures';
import { parseAndValidateJudgeOutput } from '../../judgement/schema';
import { buildDiffRows } from '../diff';
import type { TeacherMarkSet } from '../teacherMark';

function buildTestEnvelope() {
  const assessment = parseAndValidateJudgeOutput(buildValidJudgeOutput(), PRACTICE_TRANSCRIPT);
  return buildScoringEnvelope({
    attemptId: 'attempt-1',
    sessionId: 'session-1',
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
    transcriptQuality: { meanWordConfidence: 0.9, lowConfidenceSpanRatio: 0.01, lowConfidenceSpanCount: 1 },
    userCorrected: false,
    llm: {
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
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

describe('buildDiffRows', () => {
  it('produces one row per role-play task plus communication and QoL, with null teacher fields when absent', () => {
    const envelope = buildTestEnvelope();
    const rows = buildDiffRows(envelope);

    expect(rows).toHaveLength(envelope.rolePlayTasks.length + 2);
    for (const row of rows) {
      expect(row.teacherMark).toBeNull();
      expect(row.delta).toBeNull();
      expect(row.sessionId).toBe('session-1');
      expect(row.attemptId).toBe('attempt-1');
    }
  });

  it('computes delta = scorerMark - teacherMark when a teacher mark is present', () => {
    const envelope = buildTestEnvelope();
    const teacherMarks: TeacherMarkSet = {
      sessionId: 'session-1',
      markedBy: 'teacher-a',
      markedAt: '2026-07-10T00:00:00.000Z',
      marks: [
        { criterion: 'rolePlayTask', taskId: envelope.rolePlayTasks[0].taskId, mark: 1 },
        { criterion: 'communication', mark: 9 },
        { criterion: 'qualityOfLanguage', mark: 7 },
      ],
    };

    const rows = buildDiffRows(envelope, teacherMarks);

    const rp0 = rows.find((r) => r.criterion === 'rolePlayTask' && r.taskId === envelope.rolePlayTasks[0].taskId)!;
    expect(rp0.teacherMark).toBe(1);
    expect(rp0.delta).toBe(rp0.scorerMark - 1);

    const comm = rows.find((r) => r.criterion === 'communication')!;
    expect(comm.teacherMark).toBe(9);
    expect(comm.delta).toBe(comm.scorerMark - 9);

    const qol = rows.find((r) => r.criterion === 'qualityOfLanguage')!;
    expect(qol.teacherMark).toBe(7);
    expect(qol.delta).toBe(qol.scorerMark - 7);
  });

  it('matches role-play taskId precisely — a mark for a different taskId does not leak across tasks', () => {
    const envelope = buildTestEnvelope();
    const teacherMarks: TeacherMarkSet = {
      sessionId: 'session-1',
      markedBy: 'teacher-a',
      markedAt: '2026-07-10T00:00:00.000Z',
      marks: [{ criterion: 'rolePlayTask', taskId: 'nonexistent-task', mark: 2 }],
    };

    const rows = buildDiffRows(envelope, teacherMarks);
    for (const row of rows.filter((r) => r.criterion === 'rolePlayTask')) {
      expect(row.teacherMark).toBeNull();
    }
  });

  it('carries quoted evidence and transcript-quality fields through', () => {
    const envelope = buildTestEnvelope();
    const rows = buildDiffRows(envelope);
    const comm = rows.find((r) => r.criterion === 'communication')!;
    expect(comm.quotedEvidence.length).toBeGreaterThan(0);
    expect(comm.meanWordConfidence).toBe(0.9);
    expect(comm.lowConfidenceSpanRatio).toBe(0.01);
  });
});
