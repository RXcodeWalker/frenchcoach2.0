import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { DUR } from './variants';

interface Props {
  value: number;
  /** Decimal places shown. */
  decimals?: number;
  /** Count from here (defaults to 0, the `fill` motion's start). */
  from?: number;
  /** ms before counting starts — container first, then content, then the number. */
  delay?: number;
  /** Thousands separators (en-GB) for whole numbers. */
  grouped?: boolean;
  className?: string;
  'data-testid'?: string;
}

const format = (v: number, decimals: number, grouped: boolean) =>
  grouped && decimals === 0 ? Math.round(v).toLocaleString('en-GB') : v.toFixed(decimals);

/**
 * A number that counts up (the `fill` motion: 700ms, ease-out quart). Under
 * reduced motion it renders the final value straight away.
 */
export function CountUp({ value, decimals = 0, from = 0, delay = 220, grouped = false, className, ...rest }: Props) {
  // Unit tests read the settled number; they don't run the animation.
  const reduced = useReducedMotion() || import.meta.env.MODE === 'test';
  const [shown, setShown] = useState(reduced ? value : from);
  const raf = useRef(0);

  useEffect(() => {
    if (reduced || from === value) {
      setShown(value);
      return;
    }
    const t0 = performance.now() + delay;
    const dur = DUR.fill * 1000;
    const step = (t: number) => {
      const p = Math.max(0, Math.min(1, (t - t0) / dur));
      const e = 1 - Math.pow(1 - p, 4);
      setShown(from + (value - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, from, delay, reduced]);

  return (
    <span className={className} data-testid={rest['data-testid']}>
      {format(shown, decimals, grouped)}
    </span>
  );
}
