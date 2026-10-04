/**
 * W3 — the live corrections rail's per-turn fetch logic. Entirely outside
 * the coach loop: no observeAttempt call, no evidence-log write, no belief
 * update, ever — see verification-log.md's "W3 pre-implementation decision"
 * entry for why (ExaminerFeedback carries no structured judgement to derive
 * skill-node evidence from, and an unscored-shell observeAttempt call would
 * silently evict real Learn evidence from coachStorage's 20-event window).
 * This module must never import observeAttempt/sessionOrchestrator or any
 * ConductLog-writing function — enforced by __tests__/turnFeedbackBoundary.test.ts,
 * mirroring domain/igcse/session/__tests__/interpreterBoundary.test.ts.
 *
 * Context sent with each turn (resolveRailPrompt): the effective examiner
 * prompt (REPEAT and TRANSITION lines are skipped, so a repeated extension is
 * still an extension); an extension prompt ("Donne-moi plus de détails.") is
 * generic, so it also carries the question it extends — every READ_MAIN /
 * READ_ALTERNATIVE text with its questionId in that part, in log order, so a
 * two-part question's part 2 is included. A further question is a complete
 * authored question and gets NO context. Role-play turns carry the scenario
 * setup; every turn carries its inputMode (speech unless typed).
 *
 * Engine: getExaminerFeedback (feedbackMode: 'examiner', profile 'rail') —
 * the only mark-free path (ADR-0005), metered per turn under the backend's
 * `exam_turn_feedback` quota row. classifyTier gates it so a silent or <=3-word turn never
 * spends a call. Exam Sim (coached === false) makes zero calls at all, not a
 * hidden one — the effect below returns before touching the network.
 *
 * Fire-and-forget: nothing here blocks ExamMode's submitTurn flow, which
 * reads a completely separate piece of state (SimulationSession's own
 * ConductLog). A turn-N response resolving after turn N+1 starts is the
 * expected case; each in-flight request is tracked per turnKey (this
 * module's analogue of Learn.tsx's screen-wide attemptIdRef/
 * finalizedAttemptIdRef — scoped per turn here because many turns can be
 * in flight at once, not just one attempt) so a stale or retried response
 * can never overwrite a newer one for the same turn.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getExaminerFeedback, isExaminerQuotaExceededError, type ExaminerFeedbackContext } from '../api/apiClient';
import { classifyTier } from '../coaching/responseTier';
import { isAuthRequiredError } from '../../lib/authToken';
import { examinerFailureKind, type ExaminerFailureKind, type ExaminerFeedback, type ExaminerTurnKind } from '../coaching/examinerFeedback';
import type { ConductLogEntry } from '../../domain/igcse/session/types';
import type { CandidateInputMode } from '../../domain/igcse/stt/types';
import type { Question } from '../../types';

/** 'skipped': a silent or <=3-word answer — shown so the turn isn't silently missing, but no call is made. */
export type RailEntryStatus = 'pending' | 'done' | 'failed' | 'skipped';

export type RailDisabledReason = 'signed-out' | 'quota-exhausted' | null;

export interface RailEntry {
  /** The candidate ConductLog entry's `seq` — stable and unique per turn. */
  turnKey: number;
  transcript: string;
  inputMode?: CandidateInputMode;
  status: RailEntryStatus;
  result: ExaminerFeedback | null;
  /** Set on a 'failed' entry: did the request fail, or did the reply fail grounding? */
  failureKind?: ExaminerFailureKind;
}

export interface UseExamCorrectionsRail {
  entries: RailEntry[];
  /**
   * Set when the last request failed because there's no usable session
   * (guest, or an expired one), or because today's `exam_turn_feedback`
   * quota is used up — the rail degrades quietly rather than showing per-turn
   * failed cards. Once the quota is exhausted no further calls are made.
   */
  disabledReason: RailDisabledReason;
  retry: (turnKey: number) => void;
}

/** What the candidate at `candidateIndex` was answering, as the rail sends it to the model. */
export interface RailPrompt {
  question: string;
  contextQuestion?: string;
}

/**
 * The effective examiner prompt for the candidate entry at `candidateIndex`:
 * the nearest earlier examiner entry that is not a REPEAT or a TRANSITION.
 * An EXTENSION_PROMPT additionally gets `contextQuestion` (see the header).
 * Returns an empty question when no examiner line precedes the answer.
 */
export function resolveRailPrompt(entries: readonly ConductLogEntry[], candidateIndex: number): RailPrompt {
  let promptIndex = -1;
  for (let i = candidateIndex - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.kind !== 'examiner') continue;
    if (e.action === 'REPEAT' || e.action === 'TRANSITION') continue;
    promptIndex = i;
    break;
  }
  if (promptIndex === -1) return { question: '' };

  const prompt = entries[promptIndex];
  if (prompt.kind !== 'examiner') return { question: '' };
  if (prompt.action !== 'EXTENSION_PROMPT' || prompt.questionId === null) return { question: prompt.text };

  const parts: string[] = [];
  for (let i = 0; i < promptIndex; i++) {
    const e = entries[i];
    if (
      e.kind === 'examiner' &&
      (e.action === 'READ_MAIN' || e.action === 'READ_ALTERNATIVE') &&
      e.questionId === prompt.questionId &&
      e.part === prompt.part
    ) {
      parts.push(e.text);
    }
  }
  return parts.length > 0 ? { question: prompt.text, contextQuestion: parts.join(' ') } : { question: prompt.text };
}

/**
 * Drives the corrections rail from the running session's ConductLog. Reads
 * `entries` reactively (never a parallel mutable array) and, in coached mode
 * only, fires one getExaminerFeedback call per new candidate turn that
 * clears the tier gate.
 */
export function useExamCorrectionsRail(
  entries: ConductLogEntry[],
  coached: boolean,
  options: { rolePlaySetup?: string } = {},
): UseExamCorrectionsRail {
  const [railEntries, setRailEntries] = useState<RailEntry[]>([]);
  const [disabledReason, setDisabledReason] = useState<RailDisabledReason>(null);
  const quotaExhaustedRef = useRef(false);

  // The scenario's setup, read when a role-play turn is first processed.
  const rolePlaySetupRef = useRef(options.rolePlaySetup);
  rolePlaySetupRef.current = options.rolePlaySetup;

  const processedSeqRef = useRef(new Set<number>());
  // What was sent for each turn, kept so a retry re-sends exactly the same request.
  const requestRef = useRef(new Map<number, { questionText: string; context: ExaminerFeedbackContext }>());
  const requestIdRef = useRef(new Map<number, number>());
  const controllersRef = useRef(new Map<number, AbortController>());

  const runRequest = useCallback(
    (turnKey: number, transcript: string, questionText: string, context: ExaminerFeedbackContext, requestId: number) => {
      controllersRef.current.get(turnKey)?.abort();
      const controller = new AbortController();
      controllersRef.current.set(turnKey, controller);

      const question = { text: questionText } as Question;

      void getExaminerFeedback(transcript, question, controller.signal, context)
        .then((result) => {
          // Stale-response guard: a retry for this same turn superseded this request.
          if (requestIdRef.current.get(turnKey) !== requestId) return;
          setDisabledReason(null);
          setRailEntries((prev) => prev.map((e) => (e.turnKey === turnKey ? { ...e, status: 'done', result } : e)));
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          // Double-finalize guard: an older attempt's rejection arriving after a retry already resolved/failed.
          if (requestIdRef.current.get(turnKey) !== requestId) return;
          if (isAuthRequiredError(err)) {
            // Quiet degrade, not a per-turn failed card — matches Learn.tsx's
            // isAuthRequiredError handling (a guest or expired session is a
            // different situation from "the service is down").
            setDisabledReason('signed-out');
            setRailEntries((prev) => prev.filter((e) => e.turnKey !== turnKey));
            return;
          }
          if (isExaminerQuotaExceededError(err)) {
            // One quiet "limit reached today" state, not a failed card on
            // every remaining turn; stop spending requests on certain 429s.
            quotaExhaustedRef.current = true;
            setDisabledReason('quota-exhausted');
            setRailEntries((prev) => prev.filter((e) => e.turnKey !== turnKey));
            return;
          }
          const failureKind = examinerFailureKind(err);
          setRailEntries((prev) => prev.map((e) => (e.turnKey === turnKey ? { ...e, status: 'failed', failureKind } : e)));
        });
    },
    [],
  );

  useEffect(() => {
    // Exam Sim: sealed until submission — no calls at all, not a hidden one.
    if (!coached) return;

    entries.forEach((entry, i) => {
      if (entry.kind !== 'candidate') return;
      if (processedSeqRef.current.has(entry.seq)) return;
      processedSeqRef.current.add(entry.seq);

      // A button/verbal repeat request isn't an answer to comment on.
      if (entry.requestedRepeat) return;
      const turnKey = entry.seq;
      // Tier 0 (silent) / tier 1 (<=3 words): never spends a call, but gets a
      // 'skipped' card so the turn isn't silently missing from the rail.
      if (classifyTier(entry.transcript) <= 1) {
        setRailEntries((prev) => [
          ...prev,
          { turnKey, transcript: entry.transcript, inputMode: entry.inputMode, status: 'skipped', result: null },
        ]);
        return;
      }
      // Today's rail quota is used up: no more calls this session.
      if (quotaExhaustedRef.current) return;

      const { question: questionText, contextQuestion } = resolveRailPrompt(entries, i);
      const turnKind: ExaminerTurnKind = entry.part === 'rolePlay' ? 'rolePlay' : 'topic';
      const context: ExaminerFeedbackContext = {
        profile: 'rail',
        turnKind,
        inputMode: entry.inputMode ?? 'speech',
        ...(contextQuestion ? { contextQuestion } : {}),
        ...(turnKind === 'rolePlay' && rolePlaySetupRef.current ? { rolePlaySetup: rolePlaySetupRef.current } : {}),
      };
      requestRef.current.set(turnKey, { questionText, context });

      setRailEntries((prev) => [
        ...prev,
        { turnKey, transcript: entry.transcript, inputMode: entry.inputMode, status: 'pending', result: null },
      ]);

      const requestId = (requestIdRef.current.get(turnKey) ?? 0) + 1;
      requestIdRef.current.set(turnKey, requestId);
      runRequest(turnKey, entry.transcript, questionText, context, requestId);
    });
  }, [entries, coached, runRequest]);

  // Abort every outstanding request when the rail unmounts (session ends/exits).
  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      controllers.forEach((c) => c.abort());
    };
  }, []);

  const retry = useCallback(
    (turnKey: number) => {
      setRailEntries((prev) => {
        const entry = prev.find((e) => e.turnKey === turnKey);
        if (!entry || entry.status === 'skipped') return prev;
        const sent = requestRef.current.get(turnKey);
        const questionText = sent?.questionText ?? '';
        const context: ExaminerFeedbackContext = sent?.context ?? { profile: 'rail', turnKind: 'topic', inputMode: entry.inputMode ?? 'speech' };
        const requestId = (requestIdRef.current.get(turnKey) ?? 0) + 1;
        requestIdRef.current.set(turnKey, requestId);
        runRequest(turnKey, entry.transcript, questionText, context, requestId);
        return prev.map((e) => (e.turnKey === turnKey ? { ...e, status: 'pending', result: null, failureKind: undefined } : e));
      });
    },
    [runRequest],
  );

  return { entries: railEntries, disabledReason, retry };
}
