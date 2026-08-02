import { useState, useRef, useEffect, useCallback } from 'react';
import { useMicLevel, type MicLevelController } from './useMicLevel';

const WAVE_BARS = 40;

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

export function useRecording(): RecordingState {
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
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
      streamRef.current = stream;
      micLevel.attach(stream);
      const mimeType = ['audio/webm', 'audio/ogg', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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
        if (resolveRef.current) {
          resolveRef.current(finalTextRef.current.trim());
          resolveRef.current = null;
        }
      };

      recog.onerror = (e: SpeechRecognitionErrorEvent) => {
        // Waveform still animates; transcript stays whatever was captured so far.
        setSttError(e.error || 'unknown');
      };

      recog.start();
      recogRef.current = recog;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback((): Promise<string> => {
    setIsRecording(false);
    if (timerRef.current)  { clearInterval(timerRef.current); timerRef.current = null; }
    micLevel.detach();
    setWaveData(Array(WAVE_BARS).fill(4));

    // Finalize audio blob
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      blobPromiseRef.current = new Promise(resolve => { blobResolveRef.current = resolve; });
      mediaRecorderRef.current.onstop = () => {
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
    } else {
      // No active recorder (e.g. permission denied) — resolve null immediately.
      blobPromiseRef.current = Promise.resolve(null);
    }

    return new Promise(resolve => {
      if (recogRef.current) {
        resolveRef.current = resolve;
        recogRef.current.stop();
        recogRef.current = null;
      } else {
        resolve(finalTextRef.current.trim());
      }
    });
  }, [micLevel]);

  const audioBlobPromise = useCallback((): Promise<Blob | null> => {
    return blobPromiseRef.current ?? Promise.resolve(null);
  }, []);

  return {
    isRecording, elapsedTime, waveData, transcript, audioBlob, lastActivityAt,
    micLevel, start, stop, audioBlobPromise, sttSupported, sttError,
  };
}
