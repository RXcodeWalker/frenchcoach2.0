import { useState, useRef, useEffect, useCallback } from 'react';
import { useMicLevel, type MicLevelController } from './useMicLevel';

const WAVE_BARS = 40;

/**
 * Reliability plan §2.3: how long stop() waits for the recognizer/recorder's
 * own onend/onstop before falling back to whatever was captured so far.
 * Two consumers (SpeedSpeaking.tsx, SpeakingArena.tsx) call stop() without
 * awaiting it before a later start() — safe only because every callback
 * bound during a given start() is generation-guarded (see generationRef
 * below): a stale onend/onstop from a superseded recording is a no-op, so a
 * timeout resolving stop() early can never be clobbered by a late arrival.
 */
const STOP_TIMEOUT_MS = 3_000;

// Web Speech API types (not in standard lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative { transcript: string; confidence: number; }
interface SpeechRecognitionErrorEvent extends Event { error: string; }
interface SpeechRecognition extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
declare const SpeechRecognition: new () => SpeechRecognition;
declare const webkitSpeechRecognition: new () => SpeechRecognition;

export interface RecordingState {
  isRecording: boolean;
  elapsedTime: number;
  waveData: number[];
  transcript: string;
  audioBlob: Blob | null;
  lastActivityAt: number | null;
  micLevel: MicLevelController;
  start: () => void;
  stop: () => Promise<string>;
  /**
   * Resolves once the audio blob is actually finalized inside MediaRecorder's
   * onstop handler — unlike `audioBlob` (React state), this never reads stale
   * data from before the current stop() call. Resolves null if no recorder
   * was active (e.g. mic permission denied).
   */
  audioBlobPromise: () => Promise<Blob | null>;
  /** Whether this browser exposes the Web Speech API at all (computed once,
   * from constructor presence — not whether it's currently working). */
  sttSupported: boolean;
  /** Set when SpeechRecognition reports an error (e.g. 'not-allowed',
   * 'network', 'no-speech'). Null when no error has occurred this attempt. */
  sttError: string | null;
}

/**
 * @param blocked Phase 1.6 Part C defence-in-depth: when true, start() is a
 * no-op — getUserMedia/SpeechRecognition are never invoked. The UI-level
 * gate (SpeakingConsentGate) is the primary control; this guard exists so a
 * consent-pending mic can't be armed even if some future call site renders
 * a record control without that wrapper.
 */
/** Races `promise` against a timeout that resolves (never rejects) with `fallback()`. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timeoutId = setTimeout(() => resolve(fallback()), ms);
    promise.then((value) => {
      clearTimeout(timeoutId);
      resolve(value);
    });
  });
}

export function useRecording(blocked = false): RecordingState {
  const [isRecording, setIsRecording]   = useState(false);
  const [elapsedTime, setElapsedTime]   = useState(0);
  const [waveData, setWaveData]         = useState<number[]>(Array(WAVE_BARS).fill(4));
  const [transcript, setTranscript]     = useState('');
  const [audioBlob, setAudioBlob]       = useState<Blob | null>(null);
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);
  const micLevel = useMicLevel();

  const sttSupported = typeof window !== 'undefined' &&
    (typeof SpeechRecognition !== 'undefined' || typeof webkitSpeechRecognition !== 'undefined');

  const timerRef      = useRef<number | null>(null);
  const recogRef      = useRef<SpeechRecognition | null>(null);
  const finalTextRef  = useRef('');
  const resolveRef    = useRef<((t: string) => void) | null>(null);
  const startedAtRef  = useRef<number>(0);
  // Reliability plan §2.3: start() has no session/generation concept today,
  // but resets and reuses shared refs (finalTextRef, chunksRef, resolveRef,
  // blobResolveRef) across calls rather than instance-scoped state. Every
  // callback bound during a given start() captures its own generation number
  // and no-ops if superseded — this is what makes it safe for a caller to
  // call stop() without awaiting it before the next start() (SpeedSpeaking,
  // SpeakingArena both do this today).
  const generationRef = useRef(0);

  // MediaRecorder for audio blob capture (pronunciation pipeline)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const blobResolveRef   = useRef<((b: Blob | null) => void) | null>(null);
  // Constructed by stop() itself (not by the first audioBlobPromise() caller) so
  // the promise exists — and is resolved by MediaRecorder's onstop — regardless
  // of whether audioBlobPromise() is called before or after onstop fires.
  const blobPromiseRef   = useRef<Promise<Blob | null> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current)  clearInterval(timerRef.current);
      micLevel.detach();
      recogRef.current?.abort();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      // A stop() call in flight at unmount would otherwise leave its promise
      // pending forever — resolve it with whatever was captured so far.
      if (resolveRef.current) {
        resolveRef.current(finalTextRef.current.trim());
        resolveRef.current = null;
      }
      if (blobResolveRef.current) {
        blobResolveRef.current(null);
        blobResolveRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    if (blocked) return;
    generationRef.current += 1;
    const myGeneration = generationRef.current;
    setIsRecording(true);
    setElapsedTime(0);
    setTranscript('');
    setAudioBlob(null);
    setLastActivityAt(Date.now());
    setSttError(null);
    finalTextRef.current = '';
    chunksRef.current = [];

    if (timerRef.current) clearInterval(timerRef.current);
    startedAtRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsedTime(Math.round((Date.now() - startedAtRef.current) / 1000));
    }, 1000);

    // Start MediaRecorder for audio blob (best-effort — ignore if permissions denied)
    navigator.mediaDevices?.getUserMedia({ audio: true }).then(stream => {
      if (myGeneration !== generationRef.current) {
        // A later start()/stop() has already superseded this recording —
        // don't attach a recorder or stream that nothing will ever stop.
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      micLevel.attach(stream);
      const mimeType = ['audio/webm', 'audio/ogg', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (myGeneration !== generationRef.current) return;
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start(250);
    }).catch(() => {
      // Pronunciation analysis won't be available — continue without audio blob
    });

    // Web Speech API for transcript
    const SpeechRecognitionCtor =
      (typeof SpeechRecognition !== 'undefined' && SpeechRecognition) ||
      (typeof webkitSpeechRecognition !== 'undefined' && webkitSpeechRecognition) ||
      null;

    if (SpeechRecognitionCtor) {
      const recog = new SpeechRecognitionCtor();
      recog.lang = 'fr-FR';
      recog.continuous = true;
      recog.interimResults = true;
      recog.maxAlternatives = 1;

      recog.onresult = (e: SpeechRecognitionEvent) => {
        if (myGeneration !== generationRef.current) return;
        let interim = '';
        let final   = finalTextRef.current;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += text + ' ';
          else interim += text;
        }
        finalTextRef.current = final;
        setTranscript(final + interim);
        setLastActivityAt(Date.now());
      };

      recog.onend = () => {
        if (myGeneration !== generationRef.current) return;
        if (resolveRef.current) {
          resolveRef.current(finalTextRef.current.trim());
          resolveRef.current = null;
        }
      };

      recog.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (myGeneration !== generationRef.current) return;
        // Waveform still animates; transcript stays whatever was captured so far.
        setSttError(e.error || 'unknown');
      };

      recog.start();
      recogRef.current = recog;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  const stop = useCallback((): Promise<string> => {
    const myGeneration = generationRef.current;
    setIsRecording(false);
    if (timerRef.current)  { clearInterval(timerRef.current); timerRef.current = null; }
    micLevel.detach();
    setWaveData(Array(WAVE_BARS).fill(4));

    // Finalize audio blob
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const rawBlobPromise = new Promise<Blob | null>(resolve => { blobResolveRef.current = resolve; });
      mediaRecorderRef.current.onstop = () => {
        if (myGeneration !== generationRef.current) return;
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        blobResolveRef.current?.(blob);
        blobResolveRef.current = null;
      };
      mediaRecorderRef.current.stop();
      // If onstop never fires (or fires for a superseded generation), fall
      // back to whatever chunks were captured so far rather than hanging —
      // safe because a stale onstop arriving after this fallback is a no-op.
      blobPromiseRef.current = withTimeout(rawBlobPromise, STOP_TIMEOUT_MS, () =>
        chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: 'audio/webm' }) : null,
      );
    } else {
      // No active recorder (e.g. permission denied) — resolve null immediately.
      blobPromiseRef.current = Promise.resolve(null);
    }

    const rawTranscriptPromise = new Promise<string>(resolve => {
      if (recogRef.current) {
        resolveRef.current = resolve;
        recogRef.current.stop();
        recogRef.current = null;
      } else {
        resolve(finalTextRef.current.trim());
      }
    });
    return withTimeout(rawTranscriptPromise, STOP_TIMEOUT_MS, () => finalTextRef.current.trim());
  }, [micLevel]);

  const audioBlobPromise = useCallback((): Promise<Blob | null> => {
    return blobPromiseRef.current ?? Promise.resolve(null);
  }, []);

  return {
    isRecording, elapsedTime, waveData, transcript, audioBlob, lastActivityAt,
    micLevel, start, stop, audioBlobPromise, sttSupported, sttError,
  };
}
