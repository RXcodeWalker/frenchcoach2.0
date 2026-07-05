import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseCountdownOptions {
  from?: number;
  intervalMs?: number;
  active?: boolean;
  goLabel?: string;
  onComplete?: () => void;
}

export interface CountdownState {
  value: number;
  display: string | number;
  isRunning: boolean;
  isComplete: boolean;
  start: () => void;
  reset: () => void;
}

export function useCountdown({
  from = 3,
  intervalMs = 1000,
  active = false,
  goLabel = 'GO!',
  onComplete,
}: UseCountdownOptions = {}): CountdownState {
  const [value, setValue] = useState(from);
  const [isRunning, setIsRunning] = useState(active);
  const [isComplete, setIsComplete] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const start = useCallback(() => {
    setValue(from);
    setIsComplete(false);
    setIsRunning(true);
  }, [from]);

  const reset = useCallback(() => {
    setValue(from);
    setIsComplete(false);
    setIsRunning(false);
  }, [from]);

  useEffect(() => {
    if (active && !isRunning && !isComplete) {
      start();
    }
  }, [active, isComplete, isRunning, start]);

  useEffect(() => {
    if (!isRunning || isComplete) return;

    if (value > 0) {
      const timer = setTimeout(() => setValue((v) => v - 1), intervalMs);
      return () => clearTimeout(timer);
    }

    setIsComplete(true);
    setIsRunning(false);
    onCompleteRef.current?.();
  }, [isRunning, isComplete, value, intervalMs]);

  const display = value === 0 ? goLabel : value;

  return {
    value,
    display,
    isRunning,
    isComplete,
    start,
    reset,
  };
}
