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
 * effect) only ever fires from Queued, or from WaitingForScore/Recovering
 * after a 'not_found' result — never from an ambiguous client-side error,
 * and never while a poll result is 'in_progress'. See the reliability plan's
 * persistence-timeline finding for why a naive "404 -> retry" without this
 * distinction is unsafe.
 */

/** Cap on total Submitting attempts (initial + resubmits after a 404) before giving up. */
export const MAX_SUBMIT_ATTEMPTS = 3;

/** Recovering poll backoff, ms — 5s, 10s, 20s, then steady at 30s. */
export const RECOVERING_BACKOFF_MS = [5_000, 10_000, 20_000, 30_000];

export type ScoringMachineState =
  | { phase: 'Queued' }
  | { phase: 'Submitting'; attempt: number }
  | { phase: 'WaitingForScore'; attempt: number }
  | { phase: 'Recovering'; pollCount: number }
  | { phase: 'Completed' }
  | { phase: 'FailedTerminal'; reason: string };

export type ScoringMachineEvent =
  | { type: 'SUBMIT_OK' }
  | { type: 'SUBMIT_IN_PROGRESS' }
  | { type: 'SUBMIT_TERMINAL_ERROR'; reason: string }
  | { type: 'SUBMIT_AMBIGUOUS_ERROR' }
  | { type: 'POLL_DONE' }
  | { type: 'POLL_IN_PROGRESS' }
  | { type: 'POLL_NOT_FOUND' }
  | { type: 'POLL_TERMINAL_ERROR'; reason: string }
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
        default:
          return state;
      }
    }

    case 'WaitingForScore': {
      switch (event.type) {
        case 'POLL_DONE':
          return { phase: 'Completed' };
        case 'POLL_IN_PROGRESS':
          return { phase: 'Recovering', pollCount: 0 };
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
          return { phase: 'Recovering', pollCount: state.pollCount + 1 };
        case 'POLL_NOT_FOUND':
          // The staleness window lapsed with no envelope — the earlier
          // attempt is presumed dead (crashed/restarted process). Route back
          // through Submitting's own attempt cap, same bound as WaitingForScore.
          return { phase: 'Submitting', attempt: 1 };
        case 'POLL_TERMINAL_ERROR':
          return { phase: 'FailedTerminal', reason: event.reason };
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
