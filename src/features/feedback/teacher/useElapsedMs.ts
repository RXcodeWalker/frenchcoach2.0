import { useEffect, useState } from 'react';

/** Milliseconds since `active` last turned on, refreshed each second; 0 while inactive. */
export function useElapsedMs(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [active]);
  return elapsed;
}
