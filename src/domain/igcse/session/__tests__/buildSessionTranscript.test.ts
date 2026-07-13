import { describe, expect, it } from 'vitest';
import { initConductEngineState, startConduct, step, examinerActionToLogEntry, candidateTurnToLogEntry } from '../conductEngine';
import { buildSessionTranscript } from '../buildSessionTranscript';
import { annotateExaminer } from '../../stt/assemble/annotateExaminer';
import { ORIGINAL_QUESTION_SET_1 } from '../../../../data/exam/originalQuestionSets';
import type { CandidateTurnResult, ConductLog, ConductLogEntry } from '../types';

const qs = ORIGINAL_QUESTION_SET_1;

function answer(): CandidateTurnResult {
  return {
    didRespond: true,
    relevant: true,
    transcript: 'Je fais mes devoirs et je range ma chambre le soir.',
    wordCount: 10,
    responseDurationS: 8,
    requestedRepeat: false,
  };
}

/** Drives the engine through role play only, recording a ConductLog as it goes. */
function driveRolePlay(): ConductLog {
  const entries: ConductLogEntry[] = [];
  let clock = 0;
  let seq = 1;

  let state = initConductEngineState(qs);
  let result = startConduct(qs, state);
  state = result.state;

  const logAction = () => {
    for (const action of result.actions) {
      if (action.kind === 'END') continue;
      entries.push(examinerActionToLogEntry(action, seq, clock));
      seq += 1;
      clock += 2;
    }
  };
  logAction();

  for (let i = 0; i < 6 && state.phase.kind === 'rolePlay'; i++) {
    const turn = answer();
    const lastAction = result.actions[result.actions.length - 1];
    entries.push(candidateTurnToLogEntry(turn, seq, clock, lastAction.part, lastAction.questionId, true));
    seq += 1;
    clock += turn.responseDurationS;

    result = step(qs, state, { kind: 'candidateTurn', result: turn });
    state = result.state;
    logAction();
  }

  return { sessionId: 'test-session-001', questionSetId: qs.questionSetId, entries };
}

describe('buildSessionTranscript', () => {
  it('produces a SessionTranscript that validates via parseSessionTranscript', () => {
    const log = driveRolePlay();
    const transcript = buildSessionTranscript(log, qs, {
      sessionId: log.sessionId,
      recordedAt: '2026-01-01T00:00:00.000Z',
      contentProvenance: 'original-practice',
      audio: { sha256: '0'.repeat(64), durationS: 60, sampleRateHz: 16000, channels: 1 },
      questionSetHash: '1'.repeat(64),
    });

    expect(transcript.schemaVersion).toBe('session-transcript-v1');
    expect(transcript.annotationSource).toBe('session-engine-log');
    expect(transcript.roleLabelConfidence).toBe(1);
    expect(transcript.utterances.length).toBeGreaterThan(0);
  });

  it('drops trigger/requestedRepeat/relevant fields — the transcript schema is untouched', () => {
    const log = driveRolePlay();
    const transcript = buildSessionTranscript(log, qs, {
      sessionId: log.sessionId,
      recordedAt: '2026-01-01T00:00:00.000Z',
      contentProvenance: 'original-practice',
      audio: { sha256: '0'.repeat(64), durationS: 60, sampleRateHz: 16000, channels: 1 },
      questionSetHash: '1'.repeat(64),
    });

    const serialized = JSON.stringify(transcript);
    expect(serialized).not.toContain('"trigger"');
    expect(serialized).not.toContain('"requestedRepeat"');
    expect(serialized).not.toContain('"relevant"');
  });

  it('cross-checks examinerEvents against annotateExaminer for deterministic main_question cases', () => {
    const log = driveRolePlay();
    const transcript = buildSessionTranscript(log, qs, {
      sessionId: log.sessionId,
      recordedAt: '2026-01-01T00:00:00.000Z',
      contentProvenance: 'original-practice',
      audio: { sha256: '0'.repeat(64), durationS: 60, sampleRateHz: 16000, channels: 1 },
      questionSetHash: '1'.repeat(64),
    });

    // rp3 is a PAUSE (two-part) task: the engine intentionally re-reads its main
    // text for part 2, which annotateExaminer's general-purpose matcher (no
    // partsExpected awareness) classifies as a 'repetition' rather than a second
    // 'main_question' — a real, expected divergence for two-part tasks only.
    // Every other (single-part) question must agree exactly.
    const reAnnotated = annotateExaminer(transcript.utterances, qs);
    const singlePartIndices = transcript.examinerEvents
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.questionId !== 'rp3')
      .map(({ i }) => i);

    for (const i of singlePartIndices) {
      expect(reAnnotated[i].kind).toBe(transcript.examinerEvents[i].kind);
      expect(reAnnotated[i].questionId).toBe(transcript.examinerEvents[i].questionId);
    }
  });
});
