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

  it('drops trigger/requestedRepeat/relevant/intent fields — the transcript schema is untouched', () => {
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
    expect(serialized).not.toContain('"intent"');
  });

  it('blanks scored text/words for repeat_request and non_french candidate entries, keeps dont_know verbatim', () => {
    const entries: ConductLogEntry[] = [
      examinerActionToLogEntry(
        { kind: 'READ_MAIN', part: 'rolePlay', questionId: 'rp1', variant: 'main', text: 'Bonjour.', trigger: 'scripted' },
        1,
        0,
      ),
      candidateTurnToLogEntry(
        { didRespond: false, relevant: false, transcript: 'Peux-tu répéter ?', wordCount: 3, responseDurationS: 2, requestedRepeat: true },
        2,
        2,
        'rolePlay',
        'rp1',
        false,
        'repeat_request',
      ),
      candidateTurnToLogEntry(
        { didRespond: false, relevant: false, transcript: 'What?', wordCount: 1, responseDurationS: 1, requestedRepeat: false },
        3,
        4,
        'rolePlay',
        'rp1',
        false,
        'non_french',
      ),
      candidateTurnToLogEntry(
        { didRespond: true, relevant: false, transcript: 'Je ne sais pas', wordCount: 3, responseDurationS: 2, requestedRepeat: false },
        4,
        5,
        'rolePlay',
        'rp1',
        false,
        'dont_know',
      ),
    ];
    const log: ConductLog = { sessionId: 'test-session-blank', questionSetId: qs.questionSetId, entries };

    const transcript = buildSessionTranscript(log, qs, {
      sessionId: log.sessionId,
      recordedAt: '2026-01-01T00:00:00.000Z',
      contentProvenance: 'original-practice',
      audio: { sha256: '0'.repeat(64), durationS: 60, sampleRateHz: 16000, channels: 1 },
      questionSetHash: '1'.repeat(64),
    });

    const candidateUtterances = transcript.utterances.filter((u) => u.role === 'candidate');
    expect(candidateUtterances[0].text).toBe('');
    expect(candidateUtterances[0].words).toHaveLength(0);
    expect(candidateUtterances[1].text).toBe('');
    expect(candidateUtterances[1].words).toHaveLength(0);
    expect(candidateUtterances[2].text).toBe('Je ne sais pas');
    expect(candidateUtterances[2].words.length).toBeGreaterThan(0);
  });

  it('Change B: blanks scored text/words for clarification_request candidate entries too', () => {
    const entries: ConductLogEntry[] = [
      examinerActionToLogEntry(
        { kind: 'READ_MAIN', part: 'rolePlay', questionId: 'rp1', variant: 'main', text: 'Bonjour.', trigger: 'scripted' },
        1,
        0,
      ),
      candidateTurnToLogEntry(
        { didRespond: false, relevant: false, transcript: 'Que veut dire ce mot ?', wordCount: 5, responseDurationS: 2, requestedRepeat: false },
        2,
        2,
        'rolePlay',
        'rp1',
        false,
        'clarification_request',
      ),
    ];
    const log: ConductLog = { sessionId: 'test-session-clarify', questionSetId: qs.questionSetId, entries };

    const transcript = buildSessionTranscript(log, qs, {
      sessionId: log.sessionId,
      recordedAt: '2026-01-01T00:00:00.000Z',
      contentProvenance: 'original-practice',
      audio: { sha256: '0'.repeat(64), durationS: 60, sampleRateHz: 16000, channels: 1 },
      questionSetHash: '1'.repeat(64),
    });

    const candidateUtterances = transcript.utterances.filter((u) => u.role === 'candidate');
    expect(candidateUtterances[0].text).toBe('');
    expect(candidateUtterances[0].words).toHaveLength(0);
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

    // rp3 is a PAUSE (two-part) task: the engine delivers a DISTINCT secondPartText
    // for part 2 (not a re-read of mainText). annotateExaminer's general-purpose
    // matcher (no partsExpected awareness) sees that distinct text as 'unmatched'
    // (it Jaccard-matches no question above threshold) rather than a second
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

  it('C6: a TRANSITION examiner action becomes an Utterance but emits zero ExaminerEvents', () => {
    let clock = 0;
    let seq = 1;
    const entries: ConductLogEntry[] = [];

    let state = initConductEngineState(qs);
    let result = startConduct(qs, state);
    state = result.state;

    const logActions = () => {
      for (const action of result.actions) {
        entries.push(examinerActionToLogEntry(action, seq, clock));
        seq += 1;
        clock += 2;
      }
    };
    logActions();

    const developedAnswer: CandidateTurnResult = {
      didRespond: true,
      relevant: true,
      transcript: 'Je fais beaucoup de choses à la maison pour aider mes parents tous les jours.',
      wordCount: 15,
      responseDurationS: 15,
      requestedRepeat: false,
    };

    const driveTurn = () => {
      const lastAction = result.actions[result.actions.length - 1];
      entries.push(candidateTurnToLogEntry(developedAnswer, seq, clock, lastAction.part, lastAction.questionId, true));
      seq += 1;
      clock += developedAnswer.responseDurationS;
      result = step(qs, state, { kind: 'candidateTurn', result: developedAnswer });
      state = result.state;
      logActions();
    };

    // 5 role play tasks (rp3 needs two answers) then one developed topic1 answer,
    // which crosses the success funnel and should draw a TRANSITION before t1q2.
    for (let i = 0; i < 6; i++) driveTurn();
    expect(state.phase).toMatchObject({ kind: 'topic', part: 'topic1' });
    driveTurn();

    const transitionEntries = entries.filter((e) => e.kind === 'examiner' && e.action === 'TRANSITION');
    expect(transitionEntries.length).toBeGreaterThan(0);

    const transcript = buildSessionTranscript(
      { sessionId: 'test-session-transition', questionSetId: qs.questionSetId, entries },
      qs,
      {
        sessionId: 'test-session-transition',
        recordedAt: '2026-01-01T00:00:00.000Z',
        contentProvenance: 'original-practice',
        audio: { sha256: '0'.repeat(64), durationS: 120, sampleRateHz: 16000, channels: 1 },
        questionSetHash: '1'.repeat(64),
      },
    );

    const transitionTexts = transitionEntries.map((e) => (e as { text: string }).text);
    const transitionUtterances = transcript.utterances.filter((u) => u.role === 'examiner' && transitionTexts.includes(u.text));
    expect(transitionUtterances.length).toBe(transitionEntries.length);

    // Zero ExaminerEvents reference a TRANSITION utterance — projection/scoring is untouched.
    const transitionUtteranceIds = new Set(transitionUtterances.map((u) => u.utteranceId));
    const eventsOnTransitions = transcript.examinerEvents.filter((e) => transitionUtteranceIds.has(e.utteranceId));
    expect(eventsOnTransitions).toHaveLength(0);
  });

  it('Invariant 3 (reproducibility): a fixed ConductLog + questionSet yields a byte-identical SessionTranscript across repeated builds', () => {
    const log = driveRolePlay();
    const meta = {
      sessionId: log.sessionId,
      recordedAt: '2026-01-01T00:00:00.000Z',
      contentProvenance: 'original-practice' as const,
      audio: { sha256: '0'.repeat(64), durationS: 60, sampleRateHz: 16000, channels: 1 },
      questionSetHash: '1'.repeat(64),
    };

    const first = buildSessionTranscript(log, qs, meta);
    const second = buildSessionTranscript(log, qs, meta);
    const third = buildSessionTranscript(structuredClone(log), qs, meta);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(first)).toBe(JSON.stringify(third));
  });

  it('Invariant 3: a ConductLog carrying a conductHint-driven clarification REPEAT (trigger only) still reproduces byte-identically — trigger is dropped, never randomized', () => {
    const entries: ConductLogEntry[] = [
      examinerActionToLogEntry(
        { kind: 'READ_MAIN', part: 'rolePlay', questionId: 'rp1', variant: 'main', text: 'Bonjour.', trigger: 'scripted' },
        1,
        0,
      ),
      examinerActionToLogEntry(
        { kind: 'REPEAT', part: 'rolePlay', questionId: 'rp1', variant: 'main', text: 'Bonjour.', trigger: 'clarification_requested' },
        2,
        1,
      ),
    ];
    const log: ConductLog = { sessionId: 'test-session-repro-clarify', questionSetId: qs.questionSetId, entries };
    const meta = {
      sessionId: log.sessionId,
      recordedAt: '2026-01-01T00:00:00.000Z',
      contentProvenance: 'original-practice' as const,
      audio: { sha256: '0'.repeat(64), durationS: 10, sampleRateHz: 16000, channels: 1 },
      questionSetHash: '1'.repeat(64),
    };

    const first = buildSessionTranscript(log, qs, meta);
    const second = buildSessionTranscript(log, qs, meta);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(first)).not.toContain('"trigger"');
  });
});
