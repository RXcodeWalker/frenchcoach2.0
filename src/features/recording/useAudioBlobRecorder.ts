import { useState, useRef, useCallback, useEffect } from 'react';
import { useMicLevel, type MicLevelController } from './useMicLevel';

const WAVE_BARS = 40;

export interface AudioBlobRecorderState {
  isRecording: boolean;
  waveData: number[];
  micLevel: MicLevelController;
  /** Rejects if the mic is unavailable/denied — callers gate their UI on that. */
  start: () => Promise<void>;
  stop: () => Promise<{ blob: Blob; url: string; waveSnapshot: number[] } | null>;
}

export function useAudioBlobRecorder(): AudioBlobRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [waveData, setWaveData] = useState<number[]>(Array(WAVE_BARS).fill(4));
  const micLevel = useMicLevel();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      micLevel.detach();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    // Deliberately does NOT swallow errors. Catching getUserMedia here (as
    // this hook used to) left callers unable to distinguish "recording" from
    // "the mic was denied and nothing is being captured" — they'd show a live
    // recording UI over a dead recorder, then send an empty blob for
    // assessment. Permission/device failures must reach the caller.
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    micLevel.attach(stream);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback((): Promise<{ blob: Blob; url: string; waveSnapshot: number[] } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      const currentWaveData = Array.from(micLevel.levelsRef.current, v => v * 44 + 4);

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        micLevel.detach();

        setWaveData(Array(WAVE_BARS).fill(4));
        setIsRecording(false);
        resolve({ blob, url, waveSnapshot: currentWaveData });
      };

      mediaRecorderRef.current.stop();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isRecording, waveData, micLevel, start, stop };
}
