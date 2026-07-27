import { useEffect, useRef } from 'react';
import type { MicLevelController } from './useMicLevel';

interface Props {
  data?: number[];
  isRecording: boolean;
  variant?: 'learn' | 'exam';
  source?: MicLevelController;
}

const BAR_COUNT = 40;
const IDLE_EPSILON = 0.03;

function barColor(variant: 'learn' | 'exam', frac: number, magnitude: number, isRecording: boolean) {
  if (!isRecording) return 'rgba(255,255,255,0.03)';
  if (variant === 'learn') {
    const hue = 180 + frac * 100; // cyan -> purple
    const light = 50 + magnitude * 15;
    return `hsl(${hue}, 85%, ${light}%)`;
  }
  const hue = 260 + frac * 40; // purple -> indigo
  const light = 55 + magnitude * 20;
  return `hsl(${hue}, 80%, ${light}%)`;
}

function glowColor(variant: 'learn' | 'exam', frac: number) {
  return variant === 'learn' ? `hsl(${180 + frac * 100}, 90%, 55%)` : `hsl(${260 + frac * 40}, 80%, 60%)`;
}

export function Waveform({ data, isRecording, variant = 'learn', source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const height = variant === 'learn' ? 80 : 48;
    const barWidth = variant === 'learn' ? undefined : 2.5;
    const gap = 2;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const staticData = data && data.length > 0 ? data : Array(BAR_COUNT).fill(4);

    const draw = () => {
      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      const n = source ? BAR_COUNT : staticData.length;
      const slotW = cw / n;
      const bw = (barWidth ? barWidth * dpr : Math.max(1, slotW - gap * dpr));

      let overallLevel = 0;
      if (source) overallLevel = source.levelRef.current;

      const idle = isRecording && overallLevel < IDLE_EPSILON;
      const breathe = idle
        ? Math.sin(((Date.now() - startRef.current) / 1000) * 2 * Math.PI * 0.3) * 1 * dpr
        : 0;

      for (let i = 0; i < n; i++) {
        const frac = i / n;
        let magnitude01: number; // 0..1
        if (source) {
          magnitude01 = isRecording ? source.levelsRef.current[i] : 0;
        } else {
          magnitude01 = isRecording ? Math.min(staticData[i] / 48, 1) : 0;
        }

        const minPx = variant === 'learn' ? 4 : 4;
        const maxPx = (variant === 'learn' ? 48 : 44) * dpr;
        let barH = isRecording ? Math.max(magnitude01 * maxPx, minPx * dpr) : 3 * dpr;
        if (idle) barH = Math.max(barH + breathe, 2 * dpr);

        const x = i * slotW + (slotW - bw) / 2;
        const y = ch - barH;
        const radius = Math.min(bw / 2, 4 * dpr);

        ctx.beginPath();
        ctx.moveTo(x, ch);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.lineTo(x + bw - radius, y);
        ctx.arcTo(x + bw, y, x + bw, y + radius, radius);
        ctx.lineTo(x + bw, ch);
        ctx.closePath();

        ctx.fillStyle = barColor(variant, frac, magnitude01, isRecording);
        if (isRecording) {
          ctx.shadowBlur = 8 * dpr;
          ctx.shadowColor = glowColor(variant, frac);
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
    };
  }, [isRecording, variant, source, data]);

  const heightClass = variant === 'learn' ? 'h-20 mb-5 px-2' : 'h-12';

  return <canvas ref={canvasRef} className={`w-full ${heightClass} block`} />;
}
