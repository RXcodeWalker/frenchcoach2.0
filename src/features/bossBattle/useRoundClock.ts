import { useEffect, useRef, useState } from 'react';

interface Options {
  /** Length of the clock in seconds; null means there is no clock. */
  seconds: number | null;
  /** The clock only runs while true (the learner is answering). */
  running: boolean;
  /** Changing this restarts the clock (a new round). */
  resetKey: string | number;
  onExpire: () => void;
}

const TICK_MS = 200;

/**
 * A per-round countdown measured against the wall clock, not by counting ticks,
 * so a throttled background tab cannot stretch it. Returns the whole seconds
 * left (rounded up) and the fraction of the clock remaining.
 */
export function useRoundClock({ seconds, running, resetKey, onExpire }: Options): { secondsLeft: number | null; fraction: number } {
  const [remainingMs, setRemainingMs] = useState<number | null>(seconds === null ? null : seconds * 1000);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (seconds === null) {
      setRemainingMs(null);
      return;
    }
    // Once the round is answered the clock stops where it is; it only refills for the next one.
    if (!running) return;
    const total = seconds * 1000;
    setRemainingMs(total);
    const deadline = Date.now() + total;
    const id = window.setInterval(() => {
      const left = deadline - Date.now();
      if (left <= 0) {
        window.clearInterval(id);
        setRemainingMs(0);
        onExpireRef.current();
      } else {
        setRemainingMs(left);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [seconds, running, resetKey]);

  if (seconds === null || remainingMs === null) return { secondsLeft: null, fraction: 1 };
  return { secondsLeft: Math.ceil(remainingMs / 1000), fraction: Math.max(0, Math.min(1, remainingMs / (seconds * 1000))) };
}
