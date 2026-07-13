import { useCallback, useRef } from 'react';

export interface SessionClock {
  /** Starts (or restarts) the clock at 0. */
  start: () => void;
  /** Seconds elapsed since start(), monotonic. */
  nowS: () => number;
}

/** Monotonic session-relative clock. Candidate/examiner turns record start/stop offsets against this — not wall-clock time. */
export function useSessionClock(): SessionClock {
  const startedAtRef = useRef<number | null>(null);

  const start = useCallback(() => {
    startedAtRef.current = performance.now();
  }, []);

  const nowS = useCallback(() => {
    if (startedAtRef.current === null) return 0;
    return (performance.now() - startedAtRef.current) / 1000;
  }, []);

  return { start, nowS };
}
