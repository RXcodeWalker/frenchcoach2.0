/**
 * Exam-mode pronunciation analysis — the state both surfaces share (exam-
 * pronunciation plan §2, Batch 6): the Coached rail's end-of-part card and the
 * report section on the results screen. Owned by ExamMode so a card's result
 * is still there when the report opens ("the report reuses stored results;
 * nothing is re-analysed").
 *
 * Feedback only. It reads the ConductLog (never writes it), hands recordings
 * to the Batch 5 client, and builds display values with the pure Batch 5
 * domain. It never touches the transcript, the /score request or any mark.
 *
 * Nothing runs automatically: `analyse` / `analyseAll` are called from a tap,
 * and the only call made without one is `hydrate`'s GET, which reads stored
 * rows and never analyses or charges.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildExamPronunciationReport, buildPartCard } from '../../../domain/examPronunciation/buildReport';
import {
  PRONUNCIATION_PARTS,
  segmentSpeechTurns,
  type SpeechTurn,
} from '../../../domain/examPronunciation/segment';
import type { TrimSegment } from '../../../domain/examPronunciation/trim';
import type {
  ExamPronunciationPartCard,
  ExamPronunciationReport,
  ExamPronunciationTurnEvidence,
} from '../../../domain/examPronunciation/types';
import type { ConductLogEntry } from '../../../domain/igcse/session/types';
import type { SessionPart } from '../../../domain/igcse/stt/types';
import {
  analysePart as realAnalysePart,
  fetchStoredEvidence as realFetchStoredEvidence,
  type ExamPronunciationState,
  type ExamRecognizer,
  type TurnOutcome,
} from '../../../services/exam/pronunciation/client';
import { getTurnAudio, getTurnAudioKeys } from '../../../services/exam/pronunciation/examAudioStore';

export interface PronunciationClient {
  analysePart: typeof realAnalysePart;
  fetchStoredEvidence: typeof realFetchStoredEvidence;
}

const REAL_CLIENT: PronunciationClient = {
  analysePart: realAnalysePart,
  fetchStoredEvidence: realFetchStoredEvidence,
};

export interface UseExamPronunciationOptions {
  /** `examPronunciationUiEnabled(...)`; when false nothing renders and nothing is sent. */
  enabled: boolean;
  /** The current attempt's session id (a getter: it changes per attempt and lives in a ref). */
  getSessionId: () => string;
  /** The ConductLog entries so far (a getter: they live in a ref). */
  getEntries: () => readonly ConductLogEntry[];
  /** Which recogniser produced the exam transcripts: Web Speech, or Whisper (no Web Speech, e.g. Firefox). */
  recognizer: ExamRecognizer;
  /** Resolves once the latest turn's recording is in the audio store (ExamMode's `pendingAudioCaptureRef`). */
  settled?: () => Promise<void>;
  /** Injected in tests. */
  client?: PronunciationClient;
}

export type PartStatusMap = Record<SessionPart, ExamPronunciationState>;

const IDLE_STATUS: PartStatusMap = { rolePlay: 'idle', topic1: 'idle', topic2: 'idle' };

interface State {
  status: PartStatusMap;
  /** Evidence rows by turn key (from POST results and the GET hydrate). */
  evidence: ReadonlyMap<number, ExamPronunciationTurnEvidence>;
  /** Trim maps for "you" playback, only for turns analysed in this visit while the recording is in memory. */
  segments: ReadonlyMap<number, readonly TrimSegment[]>;
  /** Speech turns as of the latest analysis (the ConductLog may be gone after a reload). */
  turns: readonly SpeechTurn[];
  endedParts: readonly SessionPart[];
  /** The backend said 403 not_enabled on the hydrate GET: it is authoritative over the client gate. */
  backendDisabled: boolean;
}

const INITIAL_STATE: State = {
  status: IDLE_STATUS,
  evidence: new Map(),
  segments: new Map(),
  turns: [],
  endedParts: [],
  backendDisabled: false,
};

/** Speech turns the entries support, plus turns recoverable from stored evidence (reopen after a reload). */
function mergeTurns(
  snapshot: readonly SpeechTurn[],
  evidence: ReadonlyMap<number, ExamPronunciationTurnEvidence>,
): SpeechTurn[] {
  const byKey = new Map<number, SpeechTurn>(snapshot.map((t) => [t.turnKey, t]));
  for (const [turnKey, row] of evidence) {
    if (byKey.has(turnKey)) continue;
    byKey.set(turnKey, { turnKey, part: row.part, questionId: null, transcript: row.examTranscript });
  }
  return [...byKey.values()];
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export interface UseExamPronunciation {
  enabled: boolean;
  /** The backend refused the feature for this account (overrides `enabled`). */
  notEnabledByBackend: boolean;
  status: PartStatusMap;
  endedParts: readonly SessionPart[];
  /** Null until at least one turn has stored evidence. */
  report: ExamPronunciationReport | null;
  /** Turns per part that a recogniser pair could actually assess (stored rows that are not `couldNotAssess`). */
  analysedTurns: Record<SessionPart, number>;
  /** Speech turns in a part, and how many still have a recording in memory. */
  partAudio: (part: SessionPart) => { speechTurns: number; withAudio: number };
  cardFor: (part: SessionPart) => ExamPronunciationPartCard | null;
  analyse: (part: SessionPart) => Promise<ExamPronunciationState>;
  /** Exam Sim's single button: every part with speech, in order, stopping at the first part that does not finish. */
  analyseAll: () => Promise<void>;
  markPartEnded: (part: SessionPart) => void;
  /** Reads stored rows once per attempt (report reopen). Never analyses, never charges. */
  hydrate: () => Promise<void>;
  /** A new attempt: forget everything and abort what is in flight. */
  reset: () => void;
  /** The in-memory recording for a turn, for "you" playback. */
  getRecording: (turnKey: number) => Blob | undefined;
}

export function useExamPronunciation(options: UseExamPronunciationOptions): UseExamPronunciation {
  const [state, setState] = useState<State>(INITIAL_STATE);

  // Latest options, read at call time (the exam's session id and entries live in refs).
  const optsRef = useRef(options);
  optsRef.current = options;
  // `runPart` reads the latest committed evidence without depending on it.
  const stateRef = useRef(state);
  stateRef.current = state;
  const clientOf = () => optsRef.current.client ?? REAL_CLIENT;

  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController>(new AbortController());
  const runningRef = useRef<Set<SessionPart>>(new Set());
  const hydratedForRef = useRef<string | null>(null);

  const abortInFlight = useCallback(() => {
    controllerRef.current.abort();
    controllerRef.current = new AbortController();
    runningRef.current = new Set();
  }, []);

  // Leaving the exam screen aborts what is in flight. The controller is replaced
  // straight away so a remount (React StrictMode's simulated one) starts clean.
  useEffect(
    () => () => {
      controllerRef.current.abort();
      controllerRef.current = new AbortController();
    },
    [],
  );

  const reset = useCallback(() => {
    generationRef.current += 1;
    abortInFlight();
    hydratedForRef.current = null;
    setState(INITIAL_STATE);
  }, [abortInFlight]);

  const markPartEnded = useCallback((part: SessionPart) => {
    setState((s) => (s.endedParts.includes(part) ? s : { ...s, endedParts: [...s.endedParts, part] }));
  }, []);

  const runPart = useCallback(async (part: SessionPart): Promise<ExamPronunciationState> => {
    const { enabled, getSessionId, getEntries, recognizer, settled } = optsRef.current;
    if (!enabled) return 'not_enabled';
    if (runningRef.current.has(part)) return 'running';
    runningRef.current.add(part);
    const generation = generationRef.current;
    const live = () => generationRef.current === generation;
    const setStatus = (status: ExamPronunciationState) =>
      setState((s) => (live() ? { ...s, status: { ...s.status, [part]: status } } : s));

    setStatus('running');
    try {
      await settled?.();
      const sessionId = getSessionId();
      const entries = getEntries();
      const byPart = segmentSpeechTurns(entries);
      const allTurns = PRONUNCIATION_PARTS.flatMap((p) => byPart[p]);
      setState((s) => (live() ? { ...s, turns: allTurns } : s));

      // A retry sends only the turns that have no stored result yet.
      const stored = stateRef.current.evidence;
      const remaining = new Set(byPart[part].filter((t) => !stored.has(t.turnKey)).map((t) => t.turnKey));
      if (byPart[part].length > 0 && remaining.size === 0) {
        setStatus('done');
        return 'done';
      }
      const pending = entries.filter((e) => e.kind !== 'candidate' || remaining.has(e.seq) || e.part !== part);

      const onTurn = (outcome: TurnOutcome) => {
        if (!live()) return;
        const { evidence, segments } = outcome;
        if (!evidence) return;
        setState((s) => ({
          ...s,
          evidence: new Map(s.evidence).set(outcome.turnKey, evidence),
          segments: segments ? new Map(s.segments).set(outcome.turnKey, segments) : s.segments,
        }));
      };
      const analysis = await clientOf().analysePart({
        sessionId,
        part,
        entries: pending,
        recognizer,
        signal: controllerRef.current.signal,
        onTurn,
      });
      // `no_audio` for a part that already has stored rows is just "nothing left to send".
      const hadStored = byPart[part].some((t) => stored.has(t.turnKey));
      const finalStatus = analysis.state === 'no_audio' && hadStored ? 'done' : analysis.state;
      setStatus(finalStatus);
      return finalStatus;
    } catch (err) {
      // An abort (leaving the screen, a new attempt) is not a failure: put the part back to idle.
      setStatus(isAbort(err) ? 'idle' : 'failed');
      return isAbort(err) ? 'idle' : 'failed';
    } finally {
      if (live()) runningRef.current.delete(part);
    }
  }, []);

  const analyseAll = useCallback(async () => {
    await optsRef.current.settled?.();
    const byPart = segmentSpeechTurns(optsRef.current.getEntries());
    for (const part of PRONUNCIATION_PARTS) {
      if (byPart[part].length === 0) continue;
      const result = await runPart(part);
      if (result !== 'done' && result !== 'no_audio') break;
    }
  }, [runPart]);

  const hydrate = useCallback(async () => {
    const { enabled, getSessionId } = optsRef.current;
    const sessionId = getSessionId();
    if (!enabled || !sessionId || hydratedForRef.current === sessionId) return;
    hydratedForRef.current = sessionId;
    const generation = generationRef.current;
    try {
      const stored = await clientOf().fetchStoredEvidence(sessionId, controllerRef.current.signal);
      if (generationRef.current !== generation) return;
      if (stored.state === 'not_enabled') {
        setState((s) => ({ ...s, backendDisabled: true }));
        return;
      }
      if (stored.state !== 'done' || stored.evidence.length === 0) return;
      setState((s) => {
        const evidence = new Map(s.evidence);
        const status = { ...s.status };
        for (const row of stored.evidence) {
          const turnKey = Number(row.turnKey);
          if (!evidence.has(turnKey)) evidence.set(turnKey, row);
          if (status[row.part] === 'idle') status[row.part] = 'done';
        }
        return { ...s, evidence, status };
      });
    } catch {
      // Aborted or unreadable: the section simply stays at its button.
    }
  }, []);

  const partAudio = useCallback((part: SessionPart) => {
    const { getSessionId, getEntries } = optsRef.current;
    const turns = segmentSpeechTurns(getEntries())[part];
    const have = new Set(getTurnAudioKeys(getSessionId()));
    return { speechTurns: turns.length, withAudio: turns.filter((t) => have.has(t.turnKey)).length };
  }, []);

  const report = useMemo(() => {
    if (state.evidence.size === 0) return null;
    return buildExamPronunciationReport({
      turns: mergeTurns(state.turns, state.evidence),
      evidence: [...state.evidence.values()],
      trimSegments: state.segments,
    });
  }, [state.evidence, state.segments, state.turns]);

  const analysedTurns = useMemo(() => {
    const counts: Record<SessionPart, number> = { rolePlay: 0, topic1: 0, topic2: 0 };
    for (const row of state.evidence.values()) if (!row.couldNotAssess) counts[row.part] += 1;
    return counts;
  }, [state.evidence]);

  const cardFor = useCallback(
    (part: SessionPart): ExamPronunciationPartCard | null => {
      const partReport = report?.parts.find((p) => p.part === part);
      return partReport ? buildPartCard(partReport) : null;
    },
    [report],
  );

  const getRecording = useCallback(
    (turnKey: number) => getTurnAudio(optsRef.current.getSessionId(), turnKey),
    [],
  );

  return {
    enabled: options.enabled,
    notEnabledByBackend: state.backendDisabled,
    status: state.status,
    endedParts: state.endedParts,
    report,
    analysedTurns,
    partAudio,
    cardFor,
    analyse: runPart,
    analyseAll,
    markPartEnded,
    hydrate,
    reset,
    getRecording,
  };
}
