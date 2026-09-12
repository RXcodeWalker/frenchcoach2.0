// ── Exam scoring recovery state machine — pure transition tests ────────────────
// transitionScoringMachine is pure (no storage, no fetch), so these run in the
// Node test environment without any shim, matching src/services/coach/__tests__.

import { describe, it, expect } from 'vitest';
import {
  initialScoringMachineState,
  transitionScoringMachine,
  recoveringBackoffMs,
  MAX_SUBMIT_ATTEMPTS,
  type ScoringMachineState,
} from '../examScoringMachine';

describe('initialScoringMachineState', () => {
  it('starts in Queued', () => {
    expect(initialScoringMachineState()).toEqual({ phase: 'Queued' });
  });
});

describe('Queued', () => {
  it('SUBMIT_OK moves to Submitting attempt 1', () => {
    const next = transitionScoringMachine({ phase: 'Queued' }, { type: 'SUBMIT_OK' });
    expect(next).toEqual({ phase: 'Submitting', attempt: 1 });
  });

  it('ignores unrelated events', () => {
    const state: ScoringMachineState = { phase: 'Queued' };
    expect(transitionScoringMachine(state, { type: 'POLL_DONE' })).toEqual(state);
  });
});

describe('Submitting', () => {
  it('SUBMIT_OK -> Completed', () => {
    const next = transitionScoringMachine({ phase: 'Submitting', attempt: 1 }, { type: 'SUBMIT_OK' });
    expect(next).toEqual({ phase: 'Completed' });
  });

  it('SUBMIT_IN_PROGRESS -> WaitingForScore, carrying the attempt number', () => {
    const next = transitionScoringMachine({ phase: 'Submitting', attempt: 2 }, { type: 'SUBMIT_IN_PROGRESS' });
    expect(next).toEqual({ phase: 'WaitingForScore', attempt: 2 });
  });

  it('SUBMIT_TERMINAL_ERROR -> FailedTerminal with reason, no auto-retry', () => {
    const next = transitionScoringMachine(
      { phase: 'Submitting', attempt: 1 },
      { type: 'SUBMIT_TERMINAL_ERROR', reason: 'contentProvenance must be original-practice' },
    );
    expect(next).toEqual({ phase: 'FailedTerminal', reason: 'contentProvenance must be original-practice' });
  });

  it('SUBMIT_AMBIGUOUS_ERROR -> WaitingForScore, never guesses retryable-vs-not', () => {
    const next = transitionScoringMachine({ phase: 'Submitting', attempt: 1 }, { type: 'SUBMIT_AMBIGUOUS_ERROR' });
    expect(next).toEqual({ phase: 'WaitingForScore', attempt: 1 });
  });
});

describe('WaitingForScore', () => {
  it('POLL_DONE -> Completed', () => {
    const next = transitionScoringMachine({ phase: 'WaitingForScore', attempt: 1 }, { type: 'POLL_DONE' });
    expect(next).toEqual({ phase: 'Completed' });
  });

  it('POLL_IN_PROGRESS -> Recovering, poll count reset to 0, attempt carried, deadline stamped', () => {
    const before = Date.now();
    const next = transitionScoringMachine({ phase: 'WaitingForScore', attempt: 2 }, { type: 'POLL_IN_PROGRESS' });
    expect(next.phase).toBe('Recovering');
    if (next.phase !== 'Recovering') throw new Error('unreachable');
    expect(next.pollCount).toBe(0);
    expect(next.attempt).toBe(2);
    expect(next.enteredRecoveringAt).toBeGreaterThanOrEqual(before);
  });

  it('POLL_NOT_FOUND under the attempt cap -> Submitting, attempt incremented', () => {
    const next = transitionScoringMachine({ phase: 'WaitingForScore', attempt: 1 }, { type: 'POLL_NOT_FOUND' });
    expect(next).toEqual({ phase: 'Submitting', attempt: 2 });
  });

  it('POLL_NOT_FOUND at the attempt cap -> FailedTerminal instead of resubmitting forever', () => {
    const next = transitionScoringMachine(
      { phase: 'WaitingForScore', attempt: MAX_SUBMIT_ATTEMPTS },
      { type: 'POLL_NOT_FOUND' },
    );
    expect(next.phase).toBe('FailedTerminal');
  });

  it('POLL_TERMINAL_ERROR -> FailedTerminal', () => {
    const next = transitionScoringMachine(
      { phase: 'WaitingForScore', attempt: 1 },
      { type: 'POLL_TERMINAL_ERROR', reason: 'questionSetHash mismatch' },
    );
    expect(next).toEqual({ phase: 'FailedTerminal', reason: 'questionSetHash mismatch' });
  });
});

describe('Recovering', () => {
  it('POLL_DONE -> Completed', () => {
    const next = transitionScoringMachine(
      { phase: 'Recovering', pollCount: 3, attempt: 1, enteredRecoveringAt: 0 },
      { type: 'POLL_DONE' },
    );
    expect(next).toEqual({ phase: 'Completed' });
  });

  it('POLL_IN_PROGRESS -> stays Recovering, increments pollCount, keeps attempt/deadline (never re-POSTs)', () => {
    const next = transitionScoringMachine(
      { phase: 'Recovering', pollCount: 1, attempt: 2, enteredRecoveringAt: 1000 },
      { type: 'POLL_IN_PROGRESS' },
    );
    expect(next).toEqual({ phase: 'Recovering', pollCount: 2, attempt: 2, enteredRecoveringAt: 1000 });
  });

  it('POLL_NOT_FOUND under the attempt cap -> Submitting, attempt incremented (staleness window lapsed, presumed-dead attempt)', () => {
    const next = transitionScoringMachine(
      { phase: 'Recovering', pollCount: 5, attempt: 1, enteredRecoveringAt: 0 },
      { type: 'POLL_NOT_FOUND' },
    );
    expect(next).toEqual({ phase: 'Submitting', attempt: 2 });
  });

  it('POLL_NOT_FOUND at the attempt cap -> FailedTerminal instead of resubmitting forever', () => {
    const next = transitionScoringMachine(
      { phase: 'Recovering', pollCount: 5, attempt: MAX_SUBMIT_ATTEMPTS, enteredRecoveringAt: 0 },
      { type: 'POLL_NOT_FOUND' },
    );
    expect(next.phase).toBe('FailedTerminal');
  });

  it('POLL_TERMINAL_ERROR -> FailedTerminal', () => {
    const next = transitionScoringMachine(
      { phase: 'Recovering', pollCount: 2, attempt: 1, enteredRecoveringAt: 0 },
      { type: 'POLL_TERMINAL_ERROR', reason: 'unauthorized' },
    );
    expect(next).toEqual({ phase: 'FailedTerminal', reason: 'unauthorized' });
  });

  it('RECOVERING_DEADLINE_EXCEEDED -> FailedTerminal (wall-clock budget exhausted, independent of poll responses)', () => {
    const next = transitionScoringMachine(
      { phase: 'Recovering', pollCount: 8, attempt: 1, enteredRecoveringAt: 0 },
      { type: 'RECOVERING_DEADLINE_EXCEEDED' },
    );
    expect(next.phase).toBe('FailedTerminal');
  });
});

describe('Completed', () => {
  it('is a terminal sink — all events are no-ops', () => {
    const state: ScoringMachineState = { phase: 'Completed' };
    expect(transitionScoringMachine(state, { type: 'RETRY' })).toEqual(state);
    expect(transitionScoringMachine(state, { type: 'POLL_DONE' })).toEqual(state);
  });
});

describe('FailedTerminal', () => {
  it('RETRY -> Submitting attempt 1 (the manual "Retry Scoring" backstop)', () => {
    const next = transitionScoringMachine({ phase: 'FailedTerminal', reason: 'x' }, { type: 'RETRY' });
    expect(next).toEqual({ phase: 'Submitting', attempt: 1 });
  });

  it('other events are no-ops', () => {
    const state: ScoringMachineState = { phase: 'FailedTerminal', reason: 'x' };
    expect(transitionScoringMachine(state, { type: 'POLL_DONE' })).toEqual(state);
  });
});

describe('a full happy-path sequence', () => {
  it('Queued -> Submitting -> Completed', () => {
    let state = initialScoringMachineState();
    state = transitionScoringMachine(state, { type: 'SUBMIT_OK' });
    state = transitionScoringMachine(state, { type: 'SUBMIT_OK' });
    expect(state).toEqual({ phase: 'Completed' });
  });
});

describe('a full recovery sequence (server crash mid-attempt)', () => {
  it('Queued -> Submitting -> WaitingForScore -> Recovering (202s) -> Completed, without a second POST', () => {
    let state = initialScoringMachineState();
    state = transitionScoringMachine(state, { type: 'SUBMIT_OK' }); // Submitting attempt 1
    state = transitionScoringMachine(state, { type: 'SUBMIT_AMBIGUOUS_ERROR' }); // WaitingForScore
    expect(state).toEqual({ phase: 'WaitingForScore', attempt: 1 });
    state = transitionScoringMachine(state, { type: 'POLL_IN_PROGRESS' }); // Recovering
    state = transitionScoringMachine(state, { type: 'POLL_IN_PROGRESS' }); // still Recovering
    state = transitionScoringMachine(state, { type: 'POLL_DONE' }); // Completed
    expect(state).toEqual({ phase: 'Completed' });
  });

  it('Recovering -> 404 after staleness lapses -> Submitting (resubmit) -> Completed', () => {
    let state: ScoringMachineState = { phase: 'Recovering', pollCount: 4, attempt: 1, enteredRecoveringAt: 0 };
    state = transitionScoringMachine(state, { type: 'POLL_NOT_FOUND' });
    expect(state).toEqual({ phase: 'Submitting', attempt: 2 });
    state = transitionScoringMachine(state, { type: 'SUBMIT_OK' });
    expect(state).toEqual({ phase: 'Completed' });
  });

  it('Recovering -> repeated 404s reach FailedTerminal via the shared attempt cap, instead of looping forever', () => {
    let state: ScoringMachineState = { phase: 'Recovering', pollCount: 1, attempt: 1, enteredRecoveringAt: 0 };
    for (let i = 0; i < MAX_SUBMIT_ATTEMPTS - 1; i++) {
      state = transitionScoringMachine(state, { type: 'POLL_NOT_FOUND' });
      expect(state.phase).toBe('Submitting');
      state = transitionScoringMachine(state, { type: 'SUBMIT_IN_PROGRESS' });
      state = transitionScoringMachine(state, { type: 'POLL_IN_PROGRESS' });
      expect(state.phase).toBe('Recovering');
    }
    state = transitionScoringMachine(state, { type: 'POLL_NOT_FOUND' });
    expect(state.phase).toBe('FailedTerminal');
  });
});

describe('recoveringBackoffMs', () => {
  it('follows 5s, 10s, 20s then steady 30s', () => {
    expect(recoveringBackoffMs(0)).toBe(5_000);
    expect(recoveringBackoffMs(1)).toBe(10_000);
    expect(recoveringBackoffMs(2)).toBe(20_000);
    expect(recoveringBackoffMs(3)).toBe(30_000);
    expect(recoveringBackoffMs(10)).toBe(30_000);
  });
});
