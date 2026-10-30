import { useCallback, useEffect, useRef, useState } from 'react';
import { getLabAllowance } from '../../services/pronunciation/labAllowance';

/**
 * How many Lab checks are left today (plan Stage 7). Read once on mount and
 * again after each checked take (a replay of the same audio is free, so the
 * server is the source of truth, not a local count). `remaining` is null until
 * known — and stays null when it can't be read, in which case nothing is
 * disabled and the server's cap still applies.
 */
export function useLabAllowance(): {
  remaining: number | null;
  limit: number | null;
  /** Re-reads the allowance (fire and forget). */
  refresh: () => void;
  /** The server just refused a take: no checks are left today. */
  exhaust: () => void;
} {
  const [state, setState] = useState<{ remaining: number | null; limit: number | null }>({ remaining: null, limit: null });
  const alive = useRef(true);
  const seq = useRef(0);

  const refresh = useCallback(() => {
    const mine = ++seq.current;
    void getLabAllowance().then((a) => {
      if (!alive.current || mine !== seq.current || !a) return;
      setState({ remaining: a.remaining, limit: a.limit });
    });
  }, []);

  const exhaust = useCallback(() => {
    seq.current += 1;
    setState((s) => ({ ...s, remaining: 0 }));
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);

  return { remaining: state.remaining, limit: state.limit, refresh, exhaust };
}
