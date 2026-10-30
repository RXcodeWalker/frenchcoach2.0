import { useCallback, useEffect, useRef, useState } from 'react';
import type { RebuildQuestion } from '../../types';
import {
  check, clear, createGame, hint, leave, next, pause, place, remove, resume, skip, tick, undo,
  type GameState, type Rng,
} from './engine';
import type { Setup } from './types';

/** How often Speed's clock is stepped. The engine takes the real elapsed time, so this only sets how smooth the numbers look. */
const CLOCK_STEP_MS = 200;

/**
 * Runs one Sentence Rebuilder round: holds the engine state, applies the moves,
 * and steps Speed's clock while a sentence is being built. The round pauses
 * itself when the tab is hidden, so a lost tab never costs time. All rules live
 * in `engine.ts`.
 */
export function useRebuilderRound(rng: Rng = Math.random) {
  const [game, setGame] = useState<GameState | null>(null);
  const ref = useRef<GameState | null>(null);

  const commit = useCallback((state: GameState | null) => {
    ref.current = state;
    setGame(state);
  }, []);

  const apply = useCallback(
    (move: (g: GameState) => GameState) => {
      const current = ref.current;
      if (!current) return;
      const updated = move(current);
      if (updated !== current) commit(updated);
    },
    [commit],
  );

  const start = useCallback(
    (setup: Setup, questions: readonly RebuildQuestion[], opts: { drill?: boolean } = {}) =>
      commit(createGame(setup, questions, rng, opts)),
    [commit, rng],
  );

  const timed = game?.timeMs != null && game.phase === 'building';
  useEffect(() => {
    if (!timed) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      apply(g => tick(g, now - last));
      last = now;
    }, CLOCK_STEP_MS);
    return () => window.clearInterval(id);
  }, [timed, apply]);

  useEffect(() => {
    if (!timed) return;
    const onHide = () => {
      if (document.hidden) apply(pause);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [timed, apply]);

  return {
    game,
    start,
    reset: useCallback(() => commit(null), [commit]),
    place: useCallback((id: string) => apply(g => place(g, id)), [apply]),
    remove: useCallback((id: string) => apply(g => remove(g, id)), [apply]),
    undo: useCallback(() => apply(undo), [apply]),
    clear: useCallback(() => apply(clear), [apply]),
    hint: useCallback(() => apply(hint), [apply]),
    check: useCallback(() => apply(check), [apply]),
    skip: useCallback(() => apply(skip), [apply]),
    next: useCallback(() => apply(g => next(g, rng)), [apply, rng]),
    pause: useCallback(() => apply(pause), [apply]),
    resume: useCallback(() => apply(resume), [apply]),
    leave: useCallback(() => apply(leave), [apply]),
  };
}

export type RebuilderRound = ReturnType<typeof useRebuilderRound>;
