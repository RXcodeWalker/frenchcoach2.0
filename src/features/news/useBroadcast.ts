/**
 * Plays a Daily News story sentence by sentence in Henri's recorded voice
 * (`TTS.speak(text, { recorded: true })`: the Azure recording from the
 * `tts-audio` bucket, falling back to the browser voice only when it is
 * French) — docs/systems/daily-news.md §5.
 *
 * Sentence by sentence, so the transcript can highlight the line being read
 * and any one line can be replayed. A run id guards every await: a stop, a new
 * play or an unmount makes the run in flight drop its remaining lines.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { TTS } from '../../services/tts/ttsService';

export type BroadcastSpeed = 'normal' | 'slow';

/** Browser-voice rates; recordings map them onto playbackRate (0.9 → 1×, 0.68 → 0.75×). */
const RATE: Record<BroadcastSpeed, number> = { normal: 0.9, slow: 0.68 };
/** Breath between sentences, so a whole story doesn't run together. */
const GAP_MS = 250;
/** A line that "finished" faster than this made no sound (no recording, no French voice). */
const SILENT_MS = 150;

export interface Broadcast {
  playing: boolean;
  /** Index of the sentence being read, or null. */
  current: number | null;
  /** True once the whole story has been heard at least once. */
  listened: boolean;
  /** True when this device can't play French at all (the transcript is then unlocked). */
  unavailable: boolean;
  speed: BroadcastSpeed;
  setSpeed: (s: BroadcastSpeed) => void;
  playAll: () => void;
  playSentence: (i: number) => void;
  stop: () => void;
}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function useBroadcast(sentences: readonly string[], stopSignal = 0): Broadcast {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [listened, setListened] = useState(false);
  const [unavailable, setUnavailable] = useState(() => !TTS.canSpeakFrench(true) && !TTS.isSupported());
  const [speed, setSpeed] = useState<BroadcastSpeed>('normal');
  const runRef = useRef(0);
  const linesRef = useRef(sentences);
  linesRef.current = sentences;

  const stop = useCallback(() => {
    runRef.current += 1;
    TTS.stop();
    setPlaying(false);
    setCurrent(null);
  }, []);

  useEffect(() => () => {
    runRef.current += 1;
    TTS.stop();
  }, []);
  useEffect(() => {
    if (stopSignal > 0) stop();
  }, [stopSignal, stop]);
  // A new story (level switch) stops the old one mid-sentence.
  const key = sentences.join('\n');
  useEffect(() => {
    stop();
  }, [key, stop]);

  const run = useCallback(async (from: number, to: number, full: boolean) => {
    runRef.current += 1;
    TTS.stop();
    const id = runRef.current;
    const lines = linesRef.current;
    const rate = RATE[speed];
    setPlaying(true);
    let silent = true;
    try {
      for (let i = from; i < to; i++) {
        if (id !== runRef.current) return;
        setCurrent(i);
        const started = Date.now();
        await TTS.speak(lines[i], { recorded: true, rate });
        if (Date.now() - started >= SILENT_MS) silent = false;
        if (id !== runRef.current) return;
        if (i < to - 1) await wait(GAP_MS);
      }
    } catch {
      silent = true;
    }
    if (id !== runRef.current) return;
    setPlaying(false);
    setCurrent(null);
    if (silent) setUnavailable(true);
    else if (full) setListened(true);
  }, [speed]);

  const playAll = useCallback(() => {
    void run(0, linesRef.current.length, true);
  }, [run]);
  const playSentence = useCallback((i: number) => {
    void run(i, i + 1, false);
  }, [run]);

  return { playing, current, listened, unavailable, speed, setSpeed, playAll, playSentence, stop };
}
