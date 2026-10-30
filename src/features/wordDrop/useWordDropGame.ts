import { useCallback, useEffect, useRef, useState } from 'react';
import { createGame, endGame, pause, resume, submit, tick, type Env, type GameSettings, type GameState, type SubmitResult } from './engine';
import type { PlayWord } from './types';

/**
 * Runs one Word Drop round: holds the engine state, steps it once per
 * animation frame while it is playing, and pauses it whenever the tab is
 * hidden so a lost tab never costs a life. All rules live in `engine.ts`.
 */
export function useWordDropGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const ref = useRef<GameState | null>(null);
  const env = useRef<Env | null>(null);

  const commit = useCallback((next: GameState | null) => {
    ref.current = next;
    setGame(next);
  }, []);

  const start = useCallback((settings: GameSettings, pool: readonly PlayWord[]) => {
    env.current = { pool, rng: Math.random };
    commit(createGame(settings));
  }, [commit]);

  const reset = useCallback(() => commit(null), [commit]);

  const pauseGame = useCallback(() => {
    if (ref.current) commit(pause(ref.current));
  }, [commit]);

  const resumeGame = useCallback(() => {
    if (ref.current) commit(resume(ref.current));
  }, [commit]);

  const end = useCallback(() => {
    if (ref.current) commit(endGame(ref.current));
  }, [commit]);

  const type = useCallback((text: string, mode: 'live' | 'enter'): SubmitResult => {
    if (!ref.current) return 'ignored';
    const { state, result } = submit(ref.current, text, mode);
    if (state !== ref.current) commit(state);
    return result;
  }, [commit]);

  const playing = game?.phase === 'playing';
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const current = ref.current;
      if (current && env.current) commit(tick(current, now - last, env.current));
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, commit]);

  useEffect(() => {
    if (!playing) return;
    const onHide = () => {
      if (document.hidden && ref.current) commit(pause(ref.current));
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [playing, commit]);

  return { game, start, reset, pause: pauseGame, resume: resumeGame, end, type };
}
