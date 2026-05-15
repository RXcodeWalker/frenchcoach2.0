import { useState, useRef, useEffect, useCallback } from 'react';

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
interface SpeechRecognition extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
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
  start: () => void;
  stop: () => Promise<string>;
}

export function useRecording(): RecordingState {
  const [isRecording, setIsRecording]   = useState(false);
  const [elapsedTime, setElapsedTime]   = useState(0);
  const [waveData, setWaveData]         = useState<number[]>(Array(WAVE_BARS).fill(4));
  const [transcript, setTranscript]     = useState('');
  const [audioBlob, setAudioBlob]       = useState<Blob | null>(null);

  const timerRef      = useRef<number | null>(null);
  const waveRef       = useRef<number | null>(null);
  const recogRef      = useRef<SpeechRecognition | null>(null);
  const finalTextRef  = useRef('');
  const resolveRef    = useRef<((t: string) => void) | null>(null);

  // MediaRecorder for audio blob capture (pronunciation pipeline)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current)  clearInterval(timerRef.current);
      if (waveRef.current)   cancelAnimationFrame(waveRef.current);
      recogRef.current?.abort();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const animateWave = useCallback(() => {
    setWaveData(Array(WAVE_BARS).fill(0).map(() => Math.random() * 44 + 4));
    waveRef.current = requestAnimationFrame(animateWave);
  }, []);

  const start = useCallback(() => {
    setIsRecording(true);
    setElapsedTime(0);
    setTranscript('');
    setAudioBlob(null);
    finalTextRef.current = '';
    chunksRef.current = [];

    timerRef.current = window.setInterval(() => setElapsedTime(t => t + 1), 1000);
    waveRef.current  = requestAnimationFrame(animateWave);

    // Start MediaRecorder for audio blob (best-effort — ignore if permissions denied)
    navigator.mediaDevices?.getUserMedia({ audio: true }).then(stream => {
      streamRef.current = stream;
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
      };

      recog.onend = () => {
        if (resolveRef.current) {
          resolveRef.current(finalTextRef.current.trim());
          resolveRef.current = null;
        }
      };

      recog.onerror = () => {
        // Waveform still animates; transcript stays empty
      };

      recog.start();
      recogRef.current = recog;
    }
  }, [animateWave]);

  const stop = useCallback((): Promise<string> => {
    setIsRecording(false);
    if (timerRef.current)  clearInterval(timerRef.current);
    if (waveRef.current)   cancelAnimationFrame(waveRef.current);
    setWaveData(Array(WAVE_BARS).fill(4));

    // Finalize audio blob
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mediaRecorderRef.current.stop();
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
  }, []);

  return { isRecording, elapsedTime, waveData, transcript, audioBlob, start, stop };
}
