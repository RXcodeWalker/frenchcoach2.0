/**
 * S10 runtime driver — the impure glue between the pure conductEngine reducer
 * and the browser (clock, recording, TTS). Owns one in-progress session's
 * ConductLog and calls into the reducer on every candidate turn. On
 * completion, builds + returns a SessionTranscript (not yet persisted — the
 * transcript-review step in ExamMode decides when to save).
 */

import {
  initConductEngineState,
  startConduct,
  step,
  computeRelevance,
  examinerActionToLogEntry,
  candidateTurnToLogEntry,
} from '../../domain/igcse/session/conductEngine';
import { classifyUtteranceIntent } from '../../domain/igcse/session/utteranceIntents';
import { buildSessionTranscript } from '../../domain/igcse/session/buildSessionTranscript';
import type {
  CandidateTurnResult,
  ConductEngineState,
  ConductLog,
  ConductLogEntry,
  ExaminerAction,
  SessionQuestionSet,
} from '../../domain/igcse/session/types';
import type { ContentProvenance, SessionTranscript } from '../../domain/igcse/stt/types';
import { speakExaminerText } from './examinerVoice';

export interface SimulationTurnInput {
  transcript: string;
  responseDurationS: number;
  requestedRepeat: boolean;
}

export interface SimulationSessionCallbacks {
  /** Called whenever the examiner has a new action to display/speak. */
  onExaminerAction?: (action: ExaminerAction) => void;
  /** Called once the session reaches 'complete'. */
  onComplete?: () => void;
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

/** Drives one full simulated examiner session: reducer + ConductLog + (optional) TTS. Recording/STT stays the caller's responsibility (reused from useRecording). */
export class SimulationSession {
  private engineState: ConductEngineState;
  private readonly questionSet: SessionQuestionSet;
  private readonly sessionId: string;
  private readonly entries: ConductLogEntry[] = [];
  private readonly getClockS: () => number;
  private seq = 1;
  private currentAction: ExaminerAction | null = null;
  private readonly callbacks: SimulationSessionCallbacks;

  constructor(
    sessionId: string,
    questionSet: SessionQuestionSet,
    getClockS: () => number,
    callbacks: SimulationSessionCallbacks = {},
  ) {
    this.sessionId = sessionId;
    this.questionSet = questionSet;
    this.getClockS = getClockS;
    this.callbacks = callbacks;
    this.engineState = initConductEngineState(questionSet);
  }

  /** Starts the session: emits the first examiner action (role play task 1). Speaks it via TTS if enabled. */
  async begin(): Promise<ExaminerAction> {
    const result = startConduct(this.questionSet, this.engineState);
    this.engineState = result.state;
    return this.emitActions(result.actions);
  }

  get isComplete(): boolean {
    return this.engineState.phase.kind === 'complete';
  }

  get action(): ExaminerAction | null {
    return this.currentAction;
  }

  private async emitActions(actions: ExaminerAction[]): Promise<ExaminerAction> {
    let last: ExaminerAction = actions[actions.length - 1];
    for (const action of actions) {
      const atS = this.getClockS();
      this.entries.push(examinerActionToLogEntry(action, this.seq, atS));
      this.seq += 1;
      this.callbacks.onExaminerAction?.(action);
      if (action.text) await speakExaminerText(action.text);
      last = action;
    }
    this.currentAction = last;
    if (last.kind === 'END') this.callbacks.onComplete?.();
    return last;
  }

  /** Submits one candidate turn (post-recording, post-STT) and drives the reducer to the next examiner action. */
  async submitTurn(turn: SimulationTurnInput): Promise<ExaminerAction> {
    if (!this.currentAction) {
      throw new Error('SimulationSession: submitTurn called before begin()');
    }
    const startS = this.getClockS() - turn.responseDurationS;
    const wc = wordCount(turn.transcript);
    // Button repeat and a spoken repeat request are treated identically (C4):
    // both route to REPEAT, never to a content classification.
    const intent = turn.requestedRepeat ? 'repeat_request' : classifyUtteranceIntent(turn.transcript);

    const didRespond = intent === 'dont_know' ? true : intent === 'answer' ? turn.transcript.trim().length > 0 : false;
    const candidateResult: CandidateTurnResult = {
      didRespond,
      relevant: false,
      transcript: turn.transcript,
      wordCount: wc,
      responseDurationS: turn.responseDurationS,
      requestedRepeat: turn.requestedRepeat || intent === 'repeat_request',
    };
    candidateResult.relevant = intent === 'answer' ? computeRelevance(candidateResult) : false;

    const { part, questionId } = this.currentAction;
    this.entries.push(
      candidateTurnToLogEntry(candidateResult, this.seq, startS, part, questionId, candidateResult.relevant, intent),
    );
    this.seq += 1;

    const result = step(this.questionSet, this.engineState, { kind: 'candidateTurn', result: candidateResult });
    this.engineState = result.state;
    return this.emitActions(result.actions);
  }

  getConductLog(): ConductLog {
    return { sessionId: this.sessionId, questionSetId: this.questionSet.questionSetId, entries: this.entries.slice() };
  }

  /** Builds the SessionTranscript from the completed ConductLog. Throws if the session hasn't reached 'complete'. */
  buildTranscript(contentProvenance: ContentProvenance = 'original-practice'): SessionTranscript {
    if (!this.isComplete) {
      throw new Error('SimulationSession: buildTranscript called before session completed');
    }
    const now = new Date().toISOString();
    return buildSessionTranscript(this.getConductLog(), this.questionSet, {
      sessionId: this.sessionId,
      recordedAt: now,
      contentProvenance,
      audio: { sha256: '0'.repeat(64), durationS: this.getClockS(), sampleRateHz: 16000, channels: 1 },
      questionSetHash: '0'.repeat(64),
    });
  }
}
