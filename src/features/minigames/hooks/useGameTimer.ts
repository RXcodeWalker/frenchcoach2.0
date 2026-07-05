import { useState, useEffect, useRef, useCallback } from 'react';

export type GameTimerMode = 'global' | 'perQuestion';

export interface UseGameTimerOptions {
  mode: GameTimerMode;
  initialSeconds: number;
  tickMs?: number;
  paused?: boolean;
  /** When false the interval does not run (e.g. game not in playing phase). */
  active?: boolean;
  autoStart?: boolean;
  criticalThreshold?: number;
  onExpire?: () => void;
}

export interface GameTimerState {
  timeLeft: number;
  maxTime: number;
  isExpired: boolean;
  isCritical: boolean;
  progress: number;
  pause: () => void;
  resume: () => void;
  addTime: (seconds: number) => void;
  subtractTime: (seconds: number) => void;
  reset: (seconds?: number) => void;
}

export function useGameTimer({
  initialSeconds,
  tickMs = 1000,
  paused = false,
  active = true,
  criticalThreshold,
  onExpire,
}: UseGameTimerOptions): GameTimerState {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [maxTime, setMaxTime] = useState(initialSeconds);
  const [internallyPaused, setInternallyPaused] = useState(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const isPaused = paused || internallyPaused;
  const critical =
    criticalThreshold ?? (tickMs === 100 ? 5 : 10);

  useEffect(() => {
    if (!active || isPaused) return;

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;

        if (tickMs === 100) {
          const next = Math.round((prev - 0.1) * 10) / 10;
          if (next <= 0) {
            onExpireRef.current?.();
            return 0;
          }
          return next;
        }

        if (prev <= 1) {
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, tickMs);

    return () => clearInterval(id);
  }, [active, isPaused, tickMs]);

  const pause = useCallback(() => setInternallyPaused(true), []);
  const resume = useCallback(() => setInternallyPaused(false), []);

  const addTime = useCallback((seconds: number) => {
    setTimeLeft((t) => t + seconds);
  }, []);

  const subtractTime = useCallback((seconds: number) => {
    setTimeLeft((t) => Math.max(0, t - seconds));
  }, []);

  const reset = useCallback(
    (seconds?: number) => {
      const next = seconds ?? initialSeconds;
      setTimeLeft(next);
      setMaxTime(next);
    },
    [initialSeconds]
  );

  const isExpired = timeLeft <= 0;
  const isCritical = !isExpired && timeLeft < critical;
  const progress = maxTime > 0 ? timeLeft / maxTime : 0;

  return {
    timeLeft,
    maxTime,
    isExpired,
    isCritical,
    progress,
    pause,
    resume,
    addTime,
    subtractTime,
    reset,
  };
}
