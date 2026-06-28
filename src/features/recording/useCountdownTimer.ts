import { useState, useRef, useEffect, useCallback } from 'react';

export interface CountdownTimerState {
  timeLeft: number;
  timerPercent: number;
  isRunning: boolean;
  start: (duration: number, onExpire?: () => void) => void;
  stop: () => void;
}

export function useCountdownTimer(): CountdownTimerState {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const totalRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const onExpireRef = useRef<(() => void) | undefined>(undefined);

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRunning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback((duration: number, onExpire?: () => void) => {
    stop();
    totalRef.current = duration;
    onExpireRef.current = onExpire;
    setTimeLeft(duration);
    setIsRunning(true);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setIsRunning(false);
          onExpireRef.current?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stop]);

  const timerPercent = totalRef.current > 0 ? (timeLeft / totalRef.current) * 100 : 0;

  return { timeLeft, timerPercent, isRunning, start, stop };
}
