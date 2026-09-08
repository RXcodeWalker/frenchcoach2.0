import { useEffect, useRef } from 'react';
import type { MicLevelController } from './useMicLevel';

interface Props {
  isRecording: boolean;
  source: MicLevelController;
}

// CSS px. One bar = one moment in time; bars are born at the right edge and scroll left.
const HEIGHT = 80;
const BAR_W = 2;
const GAP = 2;
const SLOT = BAR_W + GAP;
const SAMPLE_MS = 45; // ~22 bars/sec -> ~89 px/sec scroll
const MIN_H = 2;
const MAX_H = 68;
const BASELINE_H = 1.5;
const CAPACITY = 512; // comfortably more bars than any panel width / SLOT
const CATCHUP_LIMIT_MS = 1000; // beyond this (backgrounded tab) we snap instead of catching up

const BASELINE_COLOR = 'rgba(148,163,184,0.45)'; // readable on both the navy shell and light-mode surface

export function ScrollingWaveform({ isRecording, source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const samplesRef = useRef<Float32Array>(new Float32Array(CAPACITY)); // committed heights, 0..1
  const writeRef = useRef(0); // total samples ever written
  const peakRef = useRef(0); // running max since the last commit
  const lastCommitRef = useRef(0);

  // `source` (MicLevelController) is a fresh object every render; only levelRef's identity
  // is stable. Track it via ref so the effect below doesn't need `source` as a dependency.
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(HEIGHT * dpr));
      if (!isRecording) drawIdle();
    };

    const drawBaseline = () => {
      const cw = canvas.width;
      const cy = canvas.height / 2;
      const h = BASELINE_H * dpr;
      ctx.beginPath();
      ctx.roundRect(0, cy - h / 2, cw, h, h / 2);
      ctx.fillStyle = BASELINE_COLOR;
      ctx.shadowBlur = 0;
      ctx.fill();
    };

    const drawIdle = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBaseline();
    };

    // Fresh trace for every attempt.
    if (isRecording) {
      samplesRef.current.fill(0);
      writeRef.current = 0;
      peakRef.current = 0;
      lastCommitRef.current = performance.now();
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    if (!isRecording) {
      drawIdle();
      return () => resizeObserver.disconnect();
    }

    const draw = () => {
      const now = performance.now();
      const cw = canvas.width;
      const ch = canvas.height;
      const cy = ch / 2;

      peakRef.current = Math.max(peakRef.current, sourceRef.current.levelRef.current);

      // Commit one bar per SAMPLE_MS. The peak over the window (not the instantaneous
      // level) is what stops a short loud syllable from being sampled away.
      if (now - lastCommitRef.current > CATCHUP_LIMIT_MS) {
        lastCommitRef.current = now;
      }
      while (now - lastCommitRef.current >= SAMPLE_MS) {
        samplesRef.current[writeRef.current % CAPACITY] = peakRef.current;
        writeRef.current += 1;
        peakRef.current = sourceRef.current.levelRef.current;
        lastCommitRef.current += SAMPLE_MS;
      }

      // Sub-slot offset: everything glides continuously between commits instead of stepping.
      const frac = Math.min((now - lastCommitRef.current) / SAMPLE_MS, 1);
      const xOffset = frac * SLOT * dpr;

      ctx.clearRect(0, 0, cw, ch);
      drawBaseline();

      const barW = BAR_W * dpr;
      const slotW = SLOT * dpr;
      const radius = barW / 2;
      const minH = MIN_H * dpr;
      const maxH = MAX_H * dpr;

      const path = new Path2D();
      const visible = Math.min(writeRef.current, CAPACITY, Math.ceil(cw / slotW) + 2);

      // k = -1 is the in-progress bar: it slides in from the right edge and lands exactly
      // where it becomes k = 0 on commit.
      for (let k = -1; k < visible; k++) {
        const x = cw - barW - k * slotW - xOffset;
        if (x + barW < 0) break;

        const level =
          k < 0 ? peakRef.current : samplesRef.current[(writeRef.current - 1 - k + CAPACITY * 2) % CAPACITY];

        const h = minH + Math.min(Math.max(level, 0), 1) * (maxH - minH);
        path.roundRect(x, cy - h / 2, barW, h, radius);
      }

      const gradient = ctx.createLinearGradient(0, 0, cw, 0);
      gradient.addColorStop(0, 'rgba(56,189,248,0.18)');
      gradient.addColorStop(0.5, 'rgba(99,102,241,0.6)');
      gradient.addColorStop(1, '#a78bfa');

      ctx.fillStyle = gradient;
      ctx.shadowBlur = 6 * dpr;
      ctx.shadowColor = 'rgba(124,58,237,0.5)';
      ctx.fill(path);
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
    };
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-20 mb-5 block"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 10%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%)',
      }}
    />
  );
}
