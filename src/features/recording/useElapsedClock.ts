import { useState, useRef, useEffect, useCallback } from 'react';

export interface ElapsedClockState {
  elapsedS: number;
  start: () => void;
  stop: () => void;
}

/** Ticking, epoch-anchored elapsed-time clock for live on-screen display (e.g. total exam duration). */
export function useElapsedClock(): ElapsedClockState {
  const [elapsedS, setElapsedS] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    startedAtRef.current = Date.now();
    setElapsedS(0);
    timerRef.current = window.setInterval(() => {
      setElapsedS(Math.round((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
  }, []);

  return { elapsedS, start, stop };
}
