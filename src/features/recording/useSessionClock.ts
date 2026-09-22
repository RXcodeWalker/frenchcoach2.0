import { useCallback, useRef } from 'react';

export interface SessionClock {
  /** Starts (or restarts) the clock. `offsetS` (W7 reload-resume) makes nowS() continue from a prior value instead of resetting to 0 — needed so resumed ConductLog entries stay monotonic against the ones already logged before the reload. */
  start: (offsetS?: number) => void;
  /** Seconds elapsed since start(), monotonic. */
  nowS: () => number;
}

/** Monotonic session-relative clock. Candidate/examiner turns record start/stop offsets against this — not wall-clock time. */
export function useSessionClock(): SessionClock {
  const startedAtRef = useRef<number | null>(null);
  const offsetSRef = useRef<number>(0);

  const start = useCallback((offsetS = 0) => {
    startedAtRef.current = performance.now();
    offsetSRef.current = offsetS;
  }, []);

  const nowS = useCallback(() => {
    if (startedAtRef.current === null) return 0;
    return (performance.now() - startedAtRef.current) / 1000 + offsetSRef.current;
  }, []);

  return { start, nowS };
}
