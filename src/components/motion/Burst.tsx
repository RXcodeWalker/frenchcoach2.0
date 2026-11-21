import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  BURST_FALLBACK_COLORS,
  BURST_TOKENS,
  createBurst,
  burstDone,
  particleAlpha,
  stepParticle,
  type BurstPreset,
  type Particle,
} from './burstPhysics';

/**
 * A one-shot celebration: a short burst of soft, brand-coloured pieces that
 * floats, flips and fades out in under three seconds, then removes itself.
 *
 * It is the one deliberate exception to the design system's "no confetti"
 * (owner, 2026-11-21) and is reserved for two arrival moments — the end of the
 * goal survey and a returning learner's welcome-back. It must never be added to
 * a result, a mark, a session or anything the learner is being assessed on.
 *
 *  - Painted on one transparent full-screen canvas; pieces use the role tokens
 *    read from the page (`--action`, `--reward`, …), so light and dark both look right.
 *  - Never loops, never blocks: `pointer-events: none`, `aria-hidden`.
 *  - Reduced motion: renders nothing and reports done straight away.
 */
export function Burst({ preset = 'cannons', onDone }: { preset?: BurstPreset; onDone?: () => void }) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [finished, setFinished] = useState(false);
  // The latest onDone without restarting the animation when the parent re-renders.
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const finish = () => {
      setFinished(true);
      doneRef.current?.();
    };
    if (reduced) {
      finish();
      return;
    }
    const canvas = canvasRef.current;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas?.getContext('2d') ?? null;
    } catch {
      ctx = null;
    }
    if (!canvas || !ctx) {
      finish();
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    const style = getComputedStyle(document.documentElement);
    const colors = BURST_TOKENS.map((token, i) => style.getPropertyValue(token).trim() || BURST_FALLBACK_COLORS[i]);
    const particles: Particle[] = createBurst(width, height, preset, Math.random, colors.length);

    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        stepParticle(p, dt);
        const alpha = particleAlpha(p);
        if (alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colors[p.color];
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // The flip squashes the piece along one axis, like paper turning over.
        ctx.scale(1, Math.max(Math.abs(Math.cos(p.flip)), 0.12));
        if (p.shape === 'dot') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      if (burstDone(particles)) {
        ctx.clearRect(0, 0, width, height);
        finish();
        return;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [preset, reduced]);

  if (reduced || finished) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="burst"
      className="pointer-events-none fixed inset-0 z-[120] h-full w-full"
    />
  );
}
