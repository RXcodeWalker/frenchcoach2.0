import { useRef } from 'react';

const BAR_COUNT = 40;
const FFT_SIZE = 1024;
const FREQ_BINS = 512; // fftSize / 2
const NOISE_FLOOR = 0.01;
const GAIN = 7;
const PERCEPTUAL_EXPONENT = 0.6;
const ATTACK = 0.35;
const DECAY = 0.12;

export interface MicLevelController {
  attach: (stream: MediaStream) => void;
  detach: () => void;
  levelsRef: React.MutableRefObject<Float32Array>;
  levelRef: React.MutableRefObject<number>;
  isActiveRef: React.MutableRefObject<boolean>;
}

function bucketBoundaries(bins: number, bars: number): number[] {
  // Log-spaced bucket boundaries across the frequency bins, length bars+1.
  const boundaries: number[] = [0];
  const logMax = Math.log2(bins);
  for (let i = 1; i <= bars; i++) {
    const frac = i / bars;
    const bin = Math.round(Math.pow(2, frac * logMax));
    boundaries.push(Math.min(bin, bins));
  }
  return boundaries;
}

export function useMicLevel(): MicLevelController {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const boundariesRef = useRef<number[] | null>(null);

  const levelsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const levelRef = useRef(0);
  const isActiveRef = useRef(false);

  const detach = () => {
    generationRef.current += 1;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    isActiveRef.current = false;
    levelRef.current = 0;
    levelsRef.current.fill(0);
  };

  const attach = (stream: MediaStream) => {
    detach();

    const generation = generationRef.current;
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextCtor();
    audioContextRef.current = audioContext;
    audioContext.resume().catch(() => {});

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0;
    analyserRef.current = analyser;

    source.connect(analyser);

    boundariesRef.current = bucketBoundaries(FREQ_BINS, BAR_COUNT);
    isActiveRef.current = true;

    const timeDomainData = new Float32Array(analyser.fftSize);
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (generation !== generationRef.current) return; // stale callback guard

      analyser.getFloatTimeDomainData(timeDomainData);
      let sumSquares = 0;
      for (let i = 0; i < timeDomainData.length; i++) {
        sumSquares += timeDomainData[i] * timeDomainData[i];
      }
      const rms = Math.sqrt(sumSquares / timeDomainData.length);

      const denoised = Math.max(rms - NOISE_FLOOR, 0);
      const targetLevel = Math.min(Math.pow(Math.min(denoised * GAIN, 1), PERCEPTUAL_EXPONENT), 1);

      const levelAlpha = targetLevel > levelRef.current ? ATTACK : DECAY;
      levelRef.current += (targetLevel - levelRef.current) * levelAlpha;

      analyser.getByteFrequencyData(freqData);
      const boundaries = boundariesRef.current!;
      const levels = levelsRef.current;
      for (let bar = 0; bar < BAR_COUNT; bar++) {
        const start = boundaries[bar];
        const end = Math.max(boundaries[bar + 1], start + 1);
        let sum = 0;
        let count = 0;
        for (let bin = start; bin < end && bin < freqData.length; bin++) {
          sum += freqData[bin];
          count++;
        }
        const avg = count > 0 ? sum / count / 255 : 0;
        const target = avg * levelRef.current;
        const barAlpha = target > levels[bar] ? ATTACK : DECAY;
        levels[bar] += (target - levels[bar]) * barAlpha;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  return { attach, detach, levelsRef, levelRef, isActiveRef };
}
