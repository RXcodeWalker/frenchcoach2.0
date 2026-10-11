import { useCallback, useEffect, useMemo, useState } from 'react';
import { planReveal, revealAt, type RevealState } from './typing';

/**
 * Drives the teacher's typed reveal (Learn feedback Batch 6b).
 *
 *  - Adaptive speed, total about 5 s (see typing.ts).
 *  - `skip()` shows everything at once; the caller wires it to a tap, Space and
 *    a "Show all" button.
 *  - `prefers-reduced-motion` → everything is on screen at once.
 *  - Keyed by the feedback object (one per attempt), so going back to the
 *    answer — e.g. flipping to the Full report and back — never types it again.
 *    A fresh attempt is a fresh object and types as new.
 *
 * It only paces what is shown. It never delays or disables anything else on the
 * screen (Next / Try again are outside it).
 */

const TICK_MS = 40;

/** Attempts (feedback objects) whose reveal has already played out or been skipped. */
const played = new WeakSet<object>();

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export interface TypedReveal extends RevealState {
  skip: () => void;
}

const startElapsed = (key: object) => (played.has(key) || prefersReducedMotion() ? Number.POSITIVE_INFINITY : 0);

export function useTypedReveal(key: object, unitCounts: readonly number[]): TypedReveal {
  const signature = unitCounts.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => planReveal(unitCounts), [signature]);

  const [state, setState] = useState(() => ({ key, elapsed: startElapsed(key) }));
  // A new attempt restarts the reveal (derived state, reset while rendering).
  if (state.key !== key) setState({ key, elapsed: startElapsed(key) });
  const elapsed = state.key === key ? state.elapsed : startElapsed(key);

  const current = revealAt(plan, elapsed);
  const done = current.done;

  useEffect(() => {
    if (done) {
      played.add(key);
      return;
    }
    const startedAt = Date.now() - elapsed;
    const id = setInterval(() => setState({ key, elapsed: Date.now() - startedAt }), TICK_MS);
    return () => clearInterval(id);
    // `elapsed` is read once per run: the interval carries the clock from then on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, done]);

  const skip = useCallback(() => {
    played.add(key);
    setState({ key, elapsed: Number.POSITIVE_INFINITY });
  }, [key]);

  return { ...current, skip };
}
