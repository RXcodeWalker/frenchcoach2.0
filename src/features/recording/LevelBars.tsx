import { useEffect, useRef } from 'react';
import type { MicLevelController } from './useMicLevel';

const BARS = 40;
const SAMPLE_MS = 60;

/**
 * The `record` motion: 40 bars, 3px wide, that follow the live mic level —
 * the newest sample on the right — while recording, and settle to a 4px
 * baseline when it stops. Heights are written straight to the DOM each frame
 * so React doesn't re-render 16 times a second.
 */
export function LevelBars({ active, source, centred }: { active: boolean; source: MicLevelController; centred: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bars = Array.from(el.children) as HTMLElement[];
    const settle = () => bars.forEach(b => {
      b.style.height = '4px';
      b.style.background = 'var(--ink-muted)';
    });
    if (!active) {
      settle();
      return;
    }
    const hist = new Array<number>(BARS).fill(0);
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > SAMPLE_MS) {
        last = t;
        const lv = Math.max(0, Math.min(1, sourceRef.current?.levelRef?.current ?? 0));
        hist.push(lv);
        hist.shift();
        bars.forEach((b, i) => {
          b.style.height = `${4 + 32 * hist[i]}px`;
          b.style.background = 'var(--ink)';
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      settle();
    };
  }, [active]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`flex h-10 w-full items-center gap-[3px] overflow-hidden ${centred ? 'max-w-[360px] justify-center' : ''}`}
    >
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} className="h-1 w-[3px] shrink-0 rounded-pill bg-ink-muted transition-[height] duration-100 ease-linear" />
      ))}
    </div>
  );
}
