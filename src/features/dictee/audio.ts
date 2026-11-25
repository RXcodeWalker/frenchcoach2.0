import { useCallback, useEffect, useRef, useState } from 'react';
import { primeRecordedAudio, recordedVoicesEnabled } from '../../services/tts/recordedVoice';
import { TTS } from '../../services/tts/ttsService';

/**
 * What Dictée hears. Every line is static authored French, so it plays the
 * pre-recorded voice (`recorded: true`), falling back to the browser voice only
 * when that voice is French — an English voice reading French would teach the
 * wrong spelling. No request ever leaves for a model.
 */

/** The slow replay: the browser voice's 0.6 (Shadowing's "slow"), about 0.67 for a recording. */
export const SLOW_RATE = 0.6;

/**
 * Call from the tap that starts a round: iOS only lets audio start inside a
 * gesture, and the first line plays by itself a moment later.
 */
export function primeVoice(): void {
  if (recordedVoicesEnabled()) primeRecordedAudio();
}

export type Speed = 'normal' | 'slow';
export type VoiceStatus = 'checking' | 'ready' | 'none';

/** Whether this device can say French at all. Dictée has nothing to offer without it. */
export function useFrenchVoice(): VoiceStatus {
  const [status, setStatus] = useState<VoiceStatus>(() => (TTS.canSpeakFrench(true) ? 'ready' : 'checking'));
  useEffect(() => {
    let live = true;
    void TTS.ensureVoiceReady().then(() => {
      if (live) setStatus(TTS.canSpeakFrench(true) ? 'ready' : 'none');
    });
    return () => {
      live = false;
    };
  }, []);
  return status;
}

export interface Listener {
  /** Which speed is sounding now, if any. */
  playing: Speed | null;
  /** Says `text`; resolves when it ends (or is cut off). Never rejects. */
  listen: (text: string, speed?: Speed) => Promise<void>;
  stop: () => void;
}

/** Plays one line at a time, and goes quiet when the screen goes. */
export function useListener(): Listener {
  const [playing, setPlaying] = useState<Speed | null>(null);
  const run = useRef(0);

  const listen = useCallback(async (text: string, speed: Speed = 'normal') => {
    const mine = ++run.current;
    await TTS.ensureVoiceReady();
    if (mine !== run.current || !TTS.canSpeakFrench(true)) return;
    setPlaying(speed);
    try {
      await TTS.speak(text, { recorded: true, rate: speed === 'slow' ? SLOW_RATE : undefined });
    } catch {
      // a voice that fails to speak is just silent
    }
    if (run.current === mine) setPlaying(null);
  }, []);

  const stop = useCallback(() => {
    run.current += 1;
    TTS.stop();
    setPlaying(null);
  }, []);

  useEffect(
    () => () => {
      run.current += 1;
      TTS.stop();
    },
    [],
  );

  return { playing, listen, stop };
}
