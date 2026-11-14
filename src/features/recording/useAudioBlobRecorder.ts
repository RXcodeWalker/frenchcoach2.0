import { useState, useRef, useCallback, useEffect } from 'react';
import { useMicLevel, type MicLevelController } from './useMicLevel';
import { micPermissionResult, trackMicPermission } from '../../services/telemetry/micPermission';
import { useMicSilence } from '../../services/sound/useSfx';
import { useScreenWakeLock } from '../../lib/useScreenWakeLock';
import { encodePcm16Wav } from '../../domain/pronunciation/audioNormalizer';

const WAVE_BARS = 40;

export interface RecordedAudio {
  blob: Blob;
  url: string;
  waveSnapshot: number[];
  /**
   * With `captureWav`: the same take as a 16-bit mono WAV built from the raw
   * mic samples, so it never needs decoding (null if nothing was captured).
   */
  wav?: Blob | null;
}

export interface AudioBlobRecorderState {
  isRecording: boolean;
  waveData: number[];
  micLevel: MicLevelController;
  /** Rejects if the mic is unavailable/denied — callers gate their UI on that. */
  start: () => Promise<void>;
  stop: () => Promise<RecordedAudio | null>;
}

export interface AudioBlobRecorderOptions {
  /**
   * Also keep the take as a WAV built from the live samples (`RecordedAudio.wav`).
   * MediaRecorder's webm/opus occasionally can't be decoded back
   * (`EncodingError: Unable to decode audio data`), which made the Accent
   * Analyzer fail a take outright; a WAV always decodes, and plays back with a
   * real duration.
   */
  captureWav?: boolean;
}

export function useAudioBlobRecorder(options: AudioBlobRecorderOptions = {}): AudioBlobRecorderState {
  const captureWav = options.captureWav === true;
  const [isRecording, setIsRecording] = useState(false);
  // No sound effect may play into an open mic (it would reach the upload).
  useMicSilence(isRecording);
  // A phone that sleeps mid-answer hides the page and stops the mic.
  useScreenWakeLock(isRecording);
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

    if (!navigator.mediaDevices?.getUserMedia) trackMicPermission('unsupported');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      trackMicPermission(micPermissionResult(err));
      throw err;
    }
    trackMicPermission('granted');
    streamRef.current = stream;
    micLevel.attach(stream, { capture: captureWav });

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
  }, [captureWav]);

  const stop = useCallback((): Promise<RecordedAudio | null> => {
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

        const captured = captureWav ? micLevel.takeCapture() : null;
        micLevel.detach();

        setWaveData(Array(WAVE_BARS).fill(4));
        setIsRecording(false);
        const wav = captured ? encodePcm16Wav(captured.samples, captured.sampleRate) : null;
        resolve(captureWav ? { blob, url, waveSnapshot: currentWaveData, wav } : { blob, url, waveSnapshot: currentWaveData });
      };

      mediaRecorderRef.current.stop();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureWav]);

  return { isRecording, waveData, micLevel, start, stop };
}
