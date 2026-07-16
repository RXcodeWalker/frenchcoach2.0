/**
 * S10 exit criterion: "scored end-to-end." Drives the conduct engine through a
 * full simulated test (role play incl. PAUSE task -> topic1 Q1-5 -> topic2
 * Q1-5, with repeats/alternatives/extensions/further per rules), builds a
 * SessionTranscript via buildSessionTranscript, then runs it through the
 * UNCHANGED scoreAttempt (stub judge) to prove the pipeline wiring — not a
 * real grade. Zero changes to evidence/judgement/guardrails/envelope/rubric
 * or scoreAttempt.ts itself.
 */

import { describe, expect, it } from 'vitest';
import {
  initConductEngineState,
  startConduct,
  step,
  examinerActionToLogEntry,
  candidateTurnToLogEntry,
} from '../conductEngine';
import { buildSessionTranscript } from '../buildSessionTranscript';
import { ORIGINAL_QUESTION_SET_1 } from '../../../../data/exam/originalQuestionSets';
import { ORIGINAL_PRACTICE_001 } from '../../../../data/exam/bank/fixtures/original-practice-001';
import { parseAuthoredQuestionSet } from '../../../../data/exam/bank/validate';
import { toSessionQuestionSet } from '../../../../data/exam/bank/adapter';
import { hashQuestionSet } from '../../content/hashQuestionSet';
import { createFixtureTranscriptStore } from '../../stt/providers/fixtureTranscriptStore';
import { toSpeakingTranscript } from '../../stt/project/toSpeakingTranscript';
import type { CandidateTurnResult, ConductLog, ConductLogEntry, SessionQuestionSet } from '../types';
import type { SessionTranscript } from '../../stt/types';
import { scoreAttempt } from '../../../../../scripts/scoring/scoreAttempt';
import { createGenericFakeJudge } from '../../../../../scripts/scoring/__tests__/fixtures';

const qs: SessionQuestionSet = ORIGINAL_QUESTION_SET_1;
const SESSION_ID = 's10-simulated-001';

function respond(text: string, wordCount: number, durationS: number): CandidateTurnResult {
  return {
    didRespond: true,
    relevant: wordCount >= 3,
    transcript: text,
    wordCount,
    responseDurationS: durationS,
    requestedRepeat: false,
  };
}

/** Drives a full simulated test to completion, producing a ConductLog. Answers are long enough to clear the 4-min floor without needing further-questions, keeping the drive short and deterministic. */
function driveFullSession(): ConductLog {
  const entries: ConductLogEntry[] = [];
  let clock = 0;
  let seq = 1;

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

  let guard = 0;
  while (state.phase.kind !== 'complete' && guard < 300) {
    guard += 1;
    const lastAction = result.actions[result.actions.length - 1];
    const turn = respond(
      `Réponse numéro ${guard} avec plusieurs mots pour dépasser le seuil de pertinence.`,
      12,
      65, // long enough that 5 questions clears the ~4-min (210s) floor without further-questions
    );
    entries.push(
      candidateTurnToLogEntry(turn, seq, clock, lastAction.part, lastAction.questionId, true),
    );
    seq += 1;
    clock += turn.responseDurationS;

    result = step(qs, state, { kind: 'candidateTurn', result: turn });
    state = result.state;
    logActions();
  }

  expect(state.phase.kind).toBe('complete');
  return { sessionId: SESSION_ID, questionSetId: qs.questionSetId, entries };
}

describe('S10 exit criterion: engine transcript -> scoreAttempt -> ScoringEnvelope', () => {
  it('produces a full simulated test that scores end-to-end through the unchanged scoreAttempt pipeline', async () => {
    const log = driveFullSession();

    const transcript: SessionTranscript = buildSessionTranscript(log, qs, {
      sessionId: SESSION_ID,
      recordedAt: '2026-01-01T00:00:00.000Z',
      contentProvenance: 'original-practice',
      audio: { sha256: '0'.repeat(64), durationS: log.entries.length * 10, sampleRateHz: 16000, channels: 1 },
      questionSetHash: '1'.repeat(64),
    });

    const transcriptStore = createFixtureTranscriptStore({ [SESSION_ID]: transcript });

    const judge = createGenericFakeJudge(() => toSpeakingTranscript(transcript, qs));
    let lastCallMetadata: { provider: 'gemini'; model: string; responseId?: string } | undefined;
    const createJudge = () => {
      const wrapped: typeof judge = async (req) => {
        const r = await judge(req);
        lastCallMetadata = { provider: 'gemini', model: 'stub-judge', responseId: 'resp-s10' };
        return r;
      };
      return { judge: wrapped, getLastCallMetadata: () => lastCallMetadata };
    };

    const envelope = await scoreAttempt({ transcriptStore, createJudge }, { sessionId: SESSION_ID, questionSet: qs });

    expect(envelope.sessionId).toBe(SESSION_ID);
    expect(envelope.rolePlayTasks.length).toBe(5);
    expect(typeof envelope.total).toBe('number');
    expect(envelope.transcriptVersion.assemblerVersion).toBe('session-engine-v2');
  });
});

/** Drives a full simulated test to completion against an arbitrary question set (Step 3 proof — see below). */
function driveFullSessionFor(questionSet: SessionQuestionSet, sessionId: string): ConductLog {
  const entries: ConductLogEntry[] = [];
  let clock = 0;
  let seq = 1;

  let state = initConductEngineState(questionSet);
  let result = startConduct(questionSet, state);
  state = result.state;

  const logActions = () => {
    for (const action of result.actions) {
      entries.push(examinerActionToLogEntry(action, seq, clock));
      seq += 1;
      clock += 2;
    }
  };
  logActions();

  let guard = 0;
  while (state.phase.kind !== 'complete' && guard < 300) {
    guard += 1;
    const lastAction = result.actions[result.actions.length - 1];
    const turn = respond(
      `Réponse numéro ${guard} avec plusieurs mots pour dépasser le seuil de pertinence.`,
      12,
      65,
    );
    entries.push(candidateTurnToLogEntry(turn, seq, clock, lastAction.part, lastAction.questionId, true));
    seq += 1;
    clock += turn.responseDurationS;

    result = step(questionSet, state, { kind: 'candidateTurn', result: turn });
    state = result.state;
    logActions();
  }

  expect(state.phase.kind).toBe('complete');
  return { sessionId, questionSetId: questionSet.questionSetId, entries };
}

describe('S11 architecture proof (Step 3): AuthoredQuestionSet -> validate -> adapter -> engine -> scoreAttempt, real hash', () => {
  it('drives the authored fixture end-to-end with a real non-zero questionSetHash', async () => {
    const authored = parseAuthoredQuestionSet(ORIGINAL_PRACTICE_001);
    const projected = toSessionQuestionSet(authored);
    const sessionId = 's11-architecture-proof-001';

    const log = driveFullSessionFor(projected, sessionId);
    const questionSetHash = await hashQuestionSet(projected);

    expect(questionSetHash).not.toBe('0'.repeat(64));
    expect(questionSetHash).toMatch(/^[0-9a-f]{64}$/);

    const transcript: SessionTranscript = buildSessionTranscript(log, projected, {
      sessionId,
      recordedAt: '2026-07-16T00:00:00.000Z',
      contentProvenance: 'original-practice',
      audio: { sha256: '0'.repeat(64), durationS: log.entries.length * 10, sampleRateHz: 16000, channels: 1 },
      questionSetHash,
    });

    const transcriptStore = createFixtureTranscriptStore({ [sessionId]: transcript });
    const judge = createGenericFakeJudge(() => toSpeakingTranscript(transcript, projected));
    let lastCallMetadata: { provider: 'gemini'; model: string; responseId?: string } | undefined;
    const createJudge = () => {
      const wrapped: typeof judge = async (req) => {
        const r = await judge(req);
        lastCallMetadata = { provider: 'gemini', model: 'stub-judge', responseId: 'resp-s11' };
        return r;
      };
      return { judge: wrapped, getLastCallMetadata: () => lastCallMetadata };
    };

    const envelope = await scoreAttempt({ transcriptStore, createJudge }, { sessionId, questionSet: projected });

    expect(envelope.sessionId).toBe(sessionId);
    expect(envelope.rolePlayTasks.length).toBe(5);
    expect(typeof envelope.total).toBe('number');
    expect(envelope.questionSetHash).toBe(questionSetHash);
  });
});
