import { useCallback, useEffect, useRef, useState } from 'react';
import { playNative, stopNative, type NativePlayResult } from './audio/nativeVoice';

/**
 * ▶ Native for the Lab home's screens (guide, ear training, tricky words):
 * plays recorded words only (these screens never ask the backend to record
 * anything — every string they play is in the recorded catalogue), stops
 * itself on unmount, and remembers that native audio can't play on this device
 * so the screen can say so once.
 */
export function useNativePlayer() {
  const [unavailable, setUnavailable] = useState(false);
  const alive = useRef(true);
  const latest = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopNative();
    };
  }, []);

  const play = useCallback(async (text: string | readonly string[], speed = 1): Promise<NativePlayResult> => {
    const call = ++latest.current;
    const result = await playNative(text, { speed });
    if (alive.current && call === latest.current) {
      if (result === 'unavailable') setUnavailable(true);
      else if (result !== 'stopped') setUnavailable(false);
    }
    return result;
  }, []);

  const stop = useCallback(() => {
    latest.current += 1;
    stopNative();
  }, []);

  return { play, stop, unavailable };
}
