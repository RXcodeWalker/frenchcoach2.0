import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from 'react';
import {
  claimPlayback,
  pausePlayback,
  playbackStatusFor,
  releasePlayback,
  resumePlayback,
  stopPlayback,
  subscribePlayback,
  type PlaybackStatus,
} from './playbackControl';

export interface PlayControl {
  status: PlaybackStatus;
  /** Idle → play; playing → pause; paused → resume. */
  toggle: () => void;
  /** Plays from the start again (also from idle). */
  restart: () => void;
  /** Starts the play; resolves when it ends. */
  play: () => Promise<void>;
  stop: () => void;
}

/**
 * One play button's state (`playbackControl.ts`): `play` is the button's own
 * play function (it may run several sounds in a row) and must resolve when it
 * has finished — every player here does (`playNative`, `playClip`,
 * `TTS.speak`). Pressing the button again pauses instead of restarting.
 */
export function usePlayControl(play: () => Promise<unknown>): PlayControl {
  const id = useId();
  const playRef = useRef(play);
  playRef.current = play;
  const status = useSyncExternalStore(
    subscribePlayback,
    () => playbackStatusFor(id),
    () => 'idle' as PlaybackStatus,
  );
  const statusRef = useRef(status);
  statusRef.current = status;

  const start = useCallback(async () => {
    const token = claimPlayback(id);
    try {
      await playRef.current();
    } catch {
      // a player that fails is just silent
    } finally {
      releasePlayback(token);
    }
  }, [id]);

  const toggle = useCallback(() => {
    if (statusRef.current === 'playing') pausePlayback();
    else if (statusRef.current === 'paused') resumePlayback();
    else void start();
  }, [start]);

  const restart = useCallback(() => {
    void start();
  }, [start]);

  const stop = useCallback(() => {
    if (statusRef.current !== 'idle') stopPlayback();
  }, []);

  // A button that goes away stops its own sound.
  useEffect(
    () => () => {
      if (playbackStatusFor(id) !== 'idle') stopPlayback();
    },
    [id],
  );

  return { status, toggle, restart, play: start, stop };
}
