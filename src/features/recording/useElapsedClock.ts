import { useState, useRef, useEffect, useCallback } from 'react';

export interface ElapsedClockState {
  elapsedS: number;
  /** `offsetS` (W7 reload-resume) makes the displayed total continue from a prior value instead of resetting to 0. */
  start: (offsetS?: number) => void;
  stop: () => void;
}

/** Ticking, epoch-anchored elapsed-time clock for live on-screen display (e.g. total exam duration). */
export function useElapsedClock(): ElapsedClockState {
  const [elapsedS, setElapsedS] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const offsetSRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback((offsetS = 0) => {
    if (timerRef.current) clearInterval(timerRef.current);
    startedAtRef.current = Date.now();
    offsetSRef.current = offsetS;
    setElapsedS(offsetS);
    timerRef.current = window.setInterval(() => {
      setElapsedS(Math.round((Date.now() - startedAtRef.current) / 1000) + offsetSRef.current);
    }, 1000);
  }, []);

  return { elapsedS, start, stop };
}
