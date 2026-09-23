/**
 * Reliability plan §B — the exam-scoring recovery state machine, as a pure
 * transition function. ExamMode.tsx drives it with async effects (submit,
 * poll, backoff timers); this file only decides what state comes next for a
 * given event, so the transition logic itself can be unit-tested without a
 * server, fetch, or React.
 *
 *   Queued -> Submitting -> WaitingForScore -> Recovering -> Completed
 *                  |               |               |
 *                  +-----------> FailedTerminal <--+
 *
 * Invariant this machine exists to enforce: POST /score (an actual submit
 * effect) only ever fires from Queued, from WaitingForScore/Recovering
 * after a 'not_found' result, or from Submitting after a definitive server
 * failure (a 5xx whose body carries a `code` — the server has already
 * abandoned that attempt and cleared its in-progress mark) — never from an
 * ambiguous client-side error (network error, timeout, uncoded 5xx), and
 * never while a poll result is 'in_progress'. See the reliability plan's
 * persistence-timeline finding for why a naive "404 -> retry" without this
 * distinction is unsafe.
 */

/** Cap on total Submitting attempts (initial + resubmits after a 404) before giving up. */
export const MAX_SUBMIT_ATTEMPTS = 3;

/**
 * Delay before re-POSTing after a definitive server failure, ms, indexed by
 * the attempt that just failed: 3s after attempt 1, 10s after attempt 2.
 * With MAX_SUBMIT_ATTEMPTS = 3, a server that fails fast reaches
 * FailedTerminal in about 15s instead of minutes of 202 polling.
 */
export const SERVER_FAILED_BACKOFF_MS = [3_000, 10_000];

/** FailedTerminal copy once every attempt ended in a definitive server failure. */
export const SERVER_FAILED_TERMINAL_REASON =
  "We couldn't score this session — the scoring service ran into a problem. Your answers are saved, so you can retry in a few minutes.";

/** Recovering poll backoff, ms — 5s, 10s, 20s, then steady at 30s. */
export const RECOVERING_BACKOFF_MS = [5_000, 10_000, 20_000, 30_000];

/**
 * Wall-clock budget for the Recovering phase, ms, before giving up rather
 * than polling forever. Reliability plan §2.5: comfortably above
 * MAX_SUBMIT_ATTEMPTS x submitForScoring's 90s client timeout plus polling
 * overhead, but not backed by production p99 scoring-latency data — this is
 * a conservative starting value, not a derived one. Revisit if this fires on
 * legitimate slow-but-successful attempts in production.
 */
export const RECOVERING_MAX_MS = 5 * 60 * 1000;

export type ScoringMachineState =
  | { phase: 'Queued' }
  /**
   * delayMs: wait this long before POSTing — set only when re-entering after
   * SUBMIT_SERVER_FAILED, so the retry backs off. The driver (ExamMode.tsx)
   * owns the timer; this function stays pure.
   */
  | { phase: 'Submitting'; attempt: number; delayMs?: number }
  | { phase: 'WaitingForScore'; attempt: number }
  | { phase: 'Recovering'; pollCount: number; attempt: number; enteredRecoveringAt: number }
  | { phase: 'Completed' }
  | { phase: 'FailedTerminal'; reason: string };

export type ScoringMachineEvent =
  | { type: 'SUBMIT_OK' }
  | { type: 'SUBMIT_IN_PROGRESS' }
  | { type: 'SUBMIT_TERMINAL_ERROR'; reason: string }
  | { type: 'SUBMIT_AMBIGUOUS_ERROR' }
  /** A 5xx whose body carries a `code`: the server definitively failed this attempt. */
  | { type: 'SUBMIT_SERVER_FAILED' }
  | { type: 'POLL_DONE' }
  | { type: 'POLL_IN_PROGRESS' }
  | { type: 'POLL_NOT_FOUND' }
  | { type: 'POLL_TERMINAL_ERROR'; reason: string }
  | { type: 'RECOVERING_DEADLINE_EXCEEDED' }
  | { type: 'RETRY' };

export function initialScoringMachineState(): ScoringMachineState {
  return { phase: 'Queued' };
}

/**
 * Pure transition function. Unknown event/state combinations are no-ops
 * (return the input state unchanged) rather than throwing — the caller
 * (ExamMode.tsx) only ever dispatches events reachable from the current
 * phase, but a no-op default keeps this function total.
 */
export function transitionScoringMachine(
  state: ScoringMachineState,
  event: ScoringMachineEvent,
): ScoringMachineState {
  switch (state.phase) {
    case 'Queued': {
      if (event.type === 'SUBMIT_OK' || event.type === 'RETRY') {
        return { phase: 'Submitting', attempt: 1 };
      }
      return state;
    }

    case 'Submitting': {
      switch (event.type) {
        case 'SUBMIT_OK':
          return { phase: 'Completed' };
        case 'SUBMIT_IN_PROGRESS':
          return { phase: 'WaitingForScore', attempt: state.attempt };
        case 'SUBMIT_TERMINAL_ERROR':
          return { phase: 'FailedTerminal', reason: event.reason };
        case 'SUBMIT_AMBIGUOUS_ERROR':
          // Never guess retryable-vs-not from the exception here — let the
          // next GET /score answer that authoritatively (reliability plan §B).
          return { phase: 'WaitingForScore', attempt: state.attempt };
        case 'SUBMIT_SERVER_FAILED':
          // Not ambiguous: the server answered, said it failed, and cleared
          // its in-progress mark, so polling would only wait out a 202
          // window for nothing. Re-POST after a short backoff, under the
          // same MAX_SUBMIT_ATTEMPTS cap as every other resubmit path.
          return state.attempt >= MAX_SUBMIT_ATTEMPTS
            ? { phase: 'FailedTerminal', reason: SERVER_FAILED_TERMINAL_REASON }
            : { phase: 'Submitting', attempt: state.attempt + 1, delayMs: serverFailedBackoffMs(state.attempt) };
        default:
          return state;
      }
    }

    case 'WaitingForScore': {
      switch (event.type) {
        case 'POLL_DONE':
          return { phase: 'Completed' };
        case 'POLL_IN_PROGRESS':
          return { phase: 'Recovering', pollCount: 0, attempt: state.attempt, enteredRecoveringAt: Date.now() };
        case 'POLL_NOT_FOUND':
          return state.attempt >= MAX_SUBMIT_ATTEMPTS
            ? { phase: 'FailedTerminal', reason: 'Scoring service is not responding. Please try again later.' }
            : { phase: 'Submitting', attempt: state.attempt + 1 };
        case 'POLL_TERMINAL_ERROR':
          return { phase: 'FailedTerminal', reason: event.reason };
        default:
          return state;
      }
    }

    case 'Recovering': {
      switch (event.type) {
        case 'POLL_DONE':
          return { phase: 'Completed' };
        case 'POLL_IN_PROGRESS':
          // A 202 means "within the staleness window," not a guarantee — keep
          // waiting, never re-POST purely because we're in this state.
          return { ...state, pollCount: state.pollCount + 1 };
        case 'POLL_NOT_FOUND':
          // The staleness window lapsed with no envelope — the earlier
          // attempt is presumed dead (crashed/restarted process). Route back
          // through Submitting, subject to the same MAX_SUBMIT_ATTEMPTS cap
          // WaitingForScore already enforces — this used to reset to attempt: 1
          // unconditionally, making the retry loop unbounded from this path.
          return state.attempt >= MAX_SUBMIT_ATTEMPTS
            ? { phase: 'FailedTerminal', reason: 'Scoring service is not responding. Please try again later.' }
            : { phase: 'Submitting', attempt: state.attempt + 1 };
        case 'POLL_TERMINAL_ERROR':
          return { phase: 'FailedTerminal', reason: event.reason };
        case 'RECOVERING_DEADLINE_EXCEEDED':
          return { phase: 'FailedTerminal', reason: 'Scoring is taking longer than expected. Please try again later.' };
        default:
          return state;
      }
    }

    case 'Completed':
      return state;

    case 'FailedTerminal': {
      if (event.type === 'RETRY') {
        return { phase: 'Submitting', attempt: 1 };
      }
      return state;
    }

    default:
      return state;
  }
}

/** Backoff delay for the Nth poll while Recovering (0-indexed), clamped to the last entry. */
export function recoveringBackoffMs(pollCount: number): number {
  const idx = Math.min(pollCount, RECOVERING_BACKOFF_MS.length - 1);
  return RECOVERING_BACKOFF_MS[idx];
}

/** Backoff before the resubmit that follows a definitive server failure on `failedAttempt` (1-based), clamped to the last entry. */
export function serverFailedBackoffMs(failedAttempt: number): number {
  const idx = Math.min(Math.max(failedAttempt - 1, 0), SERVER_FAILED_BACKOFF_MS.length - 1);
  return SERVER_FAILED_BACKOFF_MS[idx];
}
