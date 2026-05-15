import { useState, useRef, useCallback, useEffect } from 'react';

const WAVE_BARS = 40;

export interface AudioBlobRecorderState {
  isRecording: boolean;
  waveData: number[];
  start: () => void;
  stop: () => Promise<{ blob: Blob; url: string; waveSnapshot: number[] } | null>;
}

export function useAudioBlobRecorder(): AudioBlobRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [waveData, setWaveData] = useState<number[]>(Array(WAVE_BARS).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const waveRef = useRef<number | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const animateWave = useCallback(() => {
    setWaveData(Array(WAVE_BARS).fill(0).map(() => Math.random() * 44 + 4));
    waveRef.current = requestAnimationFrame(animateWave);
  }, []);

  useEffect(() => {
    return () => {
      if (waveRef.current) cancelAnimationFrame(waveRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const start = useCallback(async () => {
    try {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav']
        .find(type => MediaRecorder.isTypeSupported(type)) || '';

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      waveRef.current = requestAnimationFrame(animateWave);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [animateWave]);

  const stop = useCallback((): Promise<{ blob: Blob; url: string; waveSnapshot: number[] } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      const currentWaveData = [...waveData];

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (waveRef.current) {
          cancelAnimationFrame(waveRef.current);
          waveRef.current = null;
        }

        setWaveData(Array(WAVE_BARS).fill(4));
        setIsRecording(false);
        resolve({ blob, url, waveSnapshot: currentWaveData });
      };

      mediaRecorderRef.current.stop();
    });
  }, [waveData]);

  return { isRecording, waveData, start, stop };
}
