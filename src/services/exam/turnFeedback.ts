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
 * Engine: getExaminerFeedback (feedbackMode: 'examiner') — the only mark-free
 * path (ADR-0005). classifyTier gates it so a silent or <=3-word turn never
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
import { getExaminerFeedback } from '../api/apiClient';
import { classifyTier } from '../coaching/responseTier';
import { isAuthRequiredError } from '../../lib/authToken';
import type { ExaminerFeedback } from '../coaching/examinerFeedback';
import type { ConductLogEntry } from '../../domain/igcse/session/types';
import type { CandidateInputMode } from '../../domain/igcse/stt/types';
import type { Question } from '../../types';

export type RailEntryStatus = 'pending' | 'done' | 'failed';

export interface RailEntry {
  /** The candidate ConductLog entry's `seq` — stable and unique per turn. */
  turnKey: number;
  transcript: string;
  inputMode?: CandidateInputMode;
  status: RailEntryStatus;
  result: ExaminerFeedback | null;
}

export interface UseExamCorrectionsRail {
  entries: RailEntry[];
  /** Set when the last request failed because there's no usable session (guest, or an expired one) — the rail degrades quietly rather than showing per-turn failed cards. */
  disabledReason: 'signed-out' | null;
  retry: (turnKey: number) => void;
}

function findPrecedingExaminerText(entries: ConductLogEntry[], candidateIndex: number): string {
  for (let i = candidateIndex - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.kind === 'examiner') return e.text;
  }
  return '';
}

/**
 * Drives the corrections rail from the running session's ConductLog. Reads
 * `entries` reactively (never a parallel mutable array) and, in coached mode
 * only, fires one getExaminerFeedback call per new candidate turn that
 * clears the tier gate.
 */
export function useExamCorrectionsRail(entries: ConductLogEntry[], coached: boolean): UseExamCorrectionsRail {
  const [railEntries, setRailEntries] = useState<RailEntry[]>([]);
  const [disabledReason, setDisabledReason] = useState<'signed-out' | null>(null);

  const processedSeqRef = useRef(new Set<number>());
  const questionTextRef = useRef(new Map<number, string>());
  const requestIdRef = useRef(new Map<number, number>());
  const controllersRef = useRef(new Map<number, AbortController>());

  const runRequest = useCallback((turnKey: number, transcript: string, questionText: string, requestId: number) => {
    controllersRef.current.get(turnKey)?.abort();
    const controller = new AbortController();
    controllersRef.current.set(turnKey, controller);

    const question = { text: questionText } as Question;

    void getExaminerFeedback(transcript, question, controller.signal)
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
        setRailEntries((prev) => prev.map((e) => (e.turnKey === turnKey ? { ...e, status: 'failed' } : e)));
      });
  }, []);

  useEffect(() => {
    // Exam Sim: sealed until submission — no calls at all, not a hidden one.
    if (!coached) return;

    entries.forEach((entry, i) => {
      if (entry.kind !== 'candidate') return;
      if (processedSeqRef.current.has(entry.seq)) return;
      processedSeqRef.current.add(entry.seq);

      // A button/verbal repeat request isn't an answer to comment on.
      if (entry.requestedRepeat) return;
      // Tier 0 (silent) / tier 1 (<=3 words): never spends a call.
      if (classifyTier(entry.transcript) <= 1) return;

      const turnKey = entry.seq;
      const questionText = findPrecedingExaminerText(entries, i);
      questionTextRef.current.set(turnKey, questionText);

      setRailEntries((prev) => [
        ...prev,
        { turnKey, transcript: entry.transcript, inputMode: entry.inputMode, status: 'pending', result: null },
      ]);

      const requestId = (requestIdRef.current.get(turnKey) ?? 0) + 1;
      requestIdRef.current.set(turnKey, requestId);
      runRequest(turnKey, entry.transcript, questionText, requestId);
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
        if (!entry) return prev;
        const questionText = questionTextRef.current.get(turnKey) ?? '';
        const requestId = (requestIdRef.current.get(turnKey) ?? 0) + 1;
        requestIdRef.current.set(turnKey, requestId);
        runRequest(turnKey, entry.transcript, questionText, requestId);
        return prev.map((e) => (e.turnKey === turnKey ? { ...e, status: 'pending', result: null } : e));
      });
    },
    [runRequest],
  );

  return { entries: railEntries, disabledReason, retry };
}
