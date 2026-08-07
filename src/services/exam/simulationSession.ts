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
import { hashQuestionSet } from '../../domain/igcse/content/hashQuestionSet';
import { interpretUtterance } from './interpretUtterance';
import type {
  CandidateTurnResult,
  ConductEngineState,
  ConductHint,
  ConductLog,
  ConductLogEntry,
  ExaminerAction,
  SessionQuestionSet,
} from '../../domain/igcse/session/types';
import type { SessionPart } from '../../domain/igcse/stt/types';
import type { ContentProvenance, SessionTranscript } from '../../domain/igcse/stt/types';
import { speakExaminerText } from './examinerVoice';
import { wait, INTER_ACTION_PAUSE_MS } from './examinerPacing';

export interface SimulationTurnInput {
  transcript: string;
  responseDurationS: number;
  requestedRepeat: boolean;
  /** Explicit "Skip question" after a silence prompt — see CandidateTurnResult.skipConfirmed. */
  skipConfirmed?: boolean;
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
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const atS = this.getClockS();
      this.entries.push(examinerActionToLogEntry(action, this.seq, atS));
      this.seq += 1;
      this.callbacks.onExaminerAction?.(action);
      if (action.text) await speakExaminerText(action.text);
      if (i < actions.length - 1) await wait(INTER_ACTION_PAUSE_MS);
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
    const { part, questionId } = this.currentAction;

    // Blanking authority stays the DETERMINISTIC classifier (C4): this `intent` is
    // the sole value written to the ConductLog candidate entry, and it is the sole
    // signal buildSessionTranscript reads for scored-text blanking. No LLM signal
    // ever writes it. Button repeat and a spoken repeat request are identical.
    const intent = turn.requestedRepeat ? 'repeat_request' : classifyUtteranceIntent(turn.transcript);

    const didRespond = intent === 'dont_know' ? true : intent === 'answer' ? turn.transcript.trim().length > 0 : false;
    const candidateResult: CandidateTurnResult = {
      didRespond,
      relevant: false,
      transcript: turn.transcript,
      wordCount: wc,
      responseDurationS: turn.responseDurationS,
      requestedRepeat: turn.requestedRepeat || intent === 'repeat_request',
      skipConfirmed: turn.skipConfirmed,
    };
    candidateResult.relevant = intent === 'answer' ? computeRelevance(candidateResult, part) : false;

    // Understanding-only interpreter (Change A/B/D): boosts live conduct-routing
    // recall over messy STT. Its output is a LOCAL variable — never placed on
    // CandidateTurnResult, the ConductLog, or the SessionTranscript (enforced by an
    // import-boundary test). It only produces a conduct-hint when it caught a
    // clarification/repeat the deterministic classifier missed; on a button repeat
    // or when the classifier already agrees, no hint is needed. Falls back
    // deterministically (no added latency) when unavailable — see interpretUtterance.
    const conductHint = await this.deriveConductHint(turn, intent, part);

    this.entries.push(
      candidateTurnToLogEntry(candidateResult, this.seq, startS, part, questionId, candidateResult.relevant, intent),
    );
    this.seq += 1;

    const result = step(this.questionSet, this.engineState, {
      kind: 'candidateTurn',
      result: candidateResult,
      ...(conductHint ? { conductHint } : {}),
    });
    this.engineState = result.state;
    return this.emitActions(result.actions);
  }

  /**
   * Change B/D: the interpreter's ONLY authoritative effect — a conduct-routing
   * hint when the LLM caught a clarification/repeat meta-utterance the deterministic
   * classifier missed on messy STT. Returns undefined (no hint) when:
   *  - it's a button repeat (already routed deterministically), or
   *  - the deterministic classifier didn't say 'answer' (it already caught the
   *    meta-utterance, so its own routing + blanking are authoritative), or
   *  - the interpreter did not observe a clarification/repeat.
   * The hint drives the verbatim-REPEAT path but never writes the candidate log
   * entry's `intent`, so it cannot affect the scored transcript.
   */
  private async deriveConductHint(
    turn: SimulationTurnInput,
    intent: ReturnType<typeof classifyUtteranceIntent> | 'repeat_request',
    part: SessionPart,
  ): Promise<ConductHint | undefined> {
    // A button repeat, an explicit skip, and any deterministic non-'answer'
    // classification are already handled by the engine's own routing — no
    // interpreter round-trip needed.
    if (turn.requestedRepeat || turn.skipConfirmed || intent !== 'answer') return undefined;

    const observation = await interpretUtterance(turn.transcript, { part });
    // A deterministic fallback observation adds nothing the classifier didn't
    // already produce (it IS the classifier), so it never overrides to a hint.
    if (observation.fallback) return undefined;

    if (observation.speechAct === 'clarification_request') return 'clarification_request';
    if (observation.speechAct === 'repeat_request') return 'repeat_request';
    return undefined;
  }

  getConductLog(): ConductLog {
    return { sessionId: this.sessionId, questionSetId: this.questionSet.questionSetId, entries: this.entries.slice() };
  }

  /** Builds the SessionTranscript from the completed ConductLog. Throws if the session hasn't reached 'complete'. */
  async buildTranscript(contentProvenance: ContentProvenance = 'original-practice'): Promise<SessionTranscript> {
    if (!this.isComplete) {
      throw new Error('SimulationSession: buildTranscript called before session completed');
    }
    const now = new Date().toISOString();
    const questionSetHash = await hashQuestionSet(this.questionSet);
    return buildSessionTranscript(this.getConductLog(), this.questionSet, {
      sessionId: this.sessionId,
      recordedAt: now,
      contentProvenance,
      // Stubbed — no real audio hashing/resampling happens on this client-engine path.
      // Downstream scoring/audit consumers must not treat this as a real hash.
      audio: { sha256: '0'.repeat(64), durationS: this.getClockS(), sampleRateHz: 16000, channels: 1 },
      questionSetHash,
    });
  }
}
