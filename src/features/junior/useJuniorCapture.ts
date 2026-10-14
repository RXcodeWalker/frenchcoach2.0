/**
 * One Junior capture (junior-track §4): tap once to start, stop on a second tap,
 * on the end-of-speech silence rule, or at the hard limit.
 *
 * It wraps `useRecording` unchanged (Web Speech + MediaRecorder + the generation
 * guard — see CLAUDE.md) and adds only what Junior needs on top:
 *  - the kid-friendly end-of-speech rule from the mic level (domain/junior/capture.ts);
 *  - exactly ONE live capture at a time: a tap while a capture is being read (or
 *    before the previous one has fully stopped) is ignored, so rapid taps can
 *    never start overlapping recordings;
 *  - the peak mic level and the recording's blob, handed to `onResult` with the
 *    transcript, so the warm-up decision and the "silence is asked again" rule
 *    have what they need;
 *  - an optional `readTranscript` step (the Whisper path, junior-track §2) that
 *    runs while the capture is still busy, so taps stay ignored until the turn's
 *    final transcript is known and the one-live-capture rule holds across it.
 *
 * The consent gate is the caller's `SpeakingConsentGate`; `blocked` is the
 * `useRecording(blocked)` backstop behind it, and a blocked capture never starts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { startCaptureWatch, tickCapture, type CaptureWatch } from '../../domain/junior/capture';
import { useRecording } from '../recording/useRecording';

export interface CaptureResult {
  transcript: string;
  /** Highest mic level seen during the capture (0–1). */
  peak: number;
  blob: Blob | null;
  /** This browser has Web Speech; when false the live transcript is always ''. */
  webSpeechSupported: boolean;
  /** Why it ended: the kid tapped, they stopped talking, or the hard limit. */
  endedBy: 'tap' | 'silence' | 'limit';
}

export interface JuniorCapture {
  listening: boolean;
  /** A finished capture is being read; taps are ignored. */
  busy: boolean;
  /** Start, or — while listening — stop. Ignored while busy or blocked. */
  toggle: () => void;
  /** Ends a live capture, or drops one still being read, without delivering a result (leaving the screen, a new turn). */
  cancel: () => void;
}

/** How often the mic level is looked at. */
const TICK_MS = 100;

/**
 * Turns a finished capture into the transcript the turn flow reads. Never
 * throws: a failure keeps the live transcript (the caller's own rule).
 */
export type ReadTranscript = (result: CaptureResult) => Promise<string>;

export function useJuniorCapture(
  blocked: boolean,
  onResult: (result: CaptureResult) => void,
  readTranscript?: ReadTranscript,
): JuniorCapture {
  const recording = useRecording(blocked);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);

  // The one-live-capture guard lives in refs so rapid taps in one tick see each other.
  const liveRef = useRef(false);
  const busyRef = useRef(false);
  // Set by cancel() while a finished capture is still being read: its result belongs to a turn that is gone.
  const dropRef = useRef(false);
  const watchRef = useRef<CaptureWatch | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const readTranscriptRef = useRef(readTranscript);
  readTranscriptRef.current = readTranscript;
  const recordingRef = useRef(recording);
  recordingRef.current = recording;
  const unmountedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const finish = useCallback(async (endedBy: CaptureResult['endedBy'], deliver: boolean) => {
    if (!liveRef.current) return;
    liveRef.current = false;
    busyRef.current = true;
    dropRef.current = false;
    clearTimer();
    const peak = watchRef.current?.peak ?? 0;
    watchRef.current = null;
    if (!unmountedRef.current) {
      setListening(false);
      setBusy(true);
    }
    let transcript = '';
    let blob: Blob | null = null;
    try {
      transcript = await recordingRef.current.stop();
      blob = await recordingRef.current.audioBlobPromise();
    } catch {
      // A recorder that fails to stop is just an empty capture — the turn flow handles "nothing heard".
    }
    let result: CaptureResult = { transcript, peak, blob, webSpeechSupported: recordingRef.current.sttSupported, endedBy };
    const read = readTranscriptRef.current;
    if (deliver && read && !unmountedRef.current && !dropRef.current) {
      try {
        result = { ...result, transcript: await read(result) };
      } catch {
        // Keep the live transcript.
      }
    }
    busyRef.current = false;
    const dropped = dropRef.current;
    dropRef.current = false;
    if (unmountedRef.current) return;
    setBusy(false);
    if (deliver && !dropped) onResultRef.current(result);
  }, []);

  const toggle = useCallback(() => {
    if (blocked || busyRef.current) return;
    if (liveRef.current) {
      void finish('tap', true);
      return;
    }
    liveRef.current = true;
    watchRef.current = startCaptureWatch(Date.now());
    setListening(true);
    recordingRef.current.start();
    timerRef.current = setInterval(() => {
      const watch = watchRef.current;
      if (!watch) return;
      const tick = tickCapture(watch, recordingRef.current.micLevel.levelRef.current, Date.now());
      watchRef.current = tick.watch;
      if (tick.stop !== 'continue') void finish(tick.stop, true);
    }, TICK_MS);
  }, [blocked, finish]);

  const cancel = useCallback(() => {
    if (busyRef.current) dropRef.current = true;
    void finish('tap', false);
  }, [finish]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      clearTimer();
    };
  }, []);

  return { listening, busy, toggle, cancel };
}
