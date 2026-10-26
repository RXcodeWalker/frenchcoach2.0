import { motion, useReducedMotion } from 'framer-motion';
import { fill } from './motion/variants';

interface ProgressRingProps {
  value: number;
  max?: number;
  /** 96 on the Home mission, 74 in compact layouts. */
  size?: number;
  strokeWidth?: number;
  /** Fill colour. Defaults to the --progress role; pass a token for anything else. */
  color?: string;
  label?: string;
  sublabel?: string;
  /** Where the fill animates from, as a value (e.g. the count before a session). */
  from?: number;
  /** @deprecated No glow in Design System v2; kept so call sites compile. */
  glow?: boolean;
}

/**
 * A progress ring (Design System v2): a --track ring with a round-capped fill
 * that animates with the `fill` motion (700ms ease-out). The value sits in the
 * centre in Bricolage 500 tabular figures with a 12px caption under it.
 */
export function ProgressRing({
  value,
  max = 100,
  size = 74,
  strokeWidth = 8,
  color = 'var(--progress)',
  label,
  sublabel,
  from = 0,
}: ProgressRingProps) {
  const reduced = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const frac = (v: number) => (max > 0 ? Math.max(0, Math.min(v / max, 1)) : 0);
  const offset = circumference * (1 - frac(value));
  const fromOffset = circumference * (1 - frac(from));
  const labelSize = size >= 90 ? 18 : 15;

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 block" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--track)" strokeWidth={strokeWidth} />
        {value > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            initial={{ strokeDashoffset: reduced ? offset : fromOffset }}
            animate={{ strokeDashoffset: offset }}
            transition={fill(0.26)}
          />
        )}
      </svg>
      {(label !== undefined || sublabel !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          {label !== undefined && (
            <span className="font-numeral leading-none text-ink" style={{ fontSize: labelSize }}>
              {label}
            </span>
          )}
          {sublabel && <span className="text-caption leading-none text-ink-subtle">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
