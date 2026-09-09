import { motion } from 'framer-motion';

interface ProgressRingProps {
  value: number;
  max?: number;
  /** 74 by default; 120 on result screens only (Component Kit §06). */
  size?: number;
  strokeWidth?: number;
  /** Fill colour. Defaults to the --progress role; pass a token for anything else. */
  color?: string;
  label?: string;
  sublabel?: string;
  /**
   * @deprecated The design system forbids a glow on the ring — hierarchy is
   * surface + hairline, never a coloured halo. Kept so existing call sites
   * compile; it is a no-op.
   */
  glow?: boolean;
}

/**
 * A progress ring (Component Kit §06). Achievement — how much is mastered —
 * on a --track ring, value in mono at the centre. The fill animates once,
 * 320ms on --ease-out, when the value changes: no shimmer, no glow, no
 * indeterminate pulse (an indeterminate state is a skeleton, not a ring
 * pretending to make progress).
 */
export function ProgressRing({
  value,
  max = 100,
  size = 74,
  strokeWidth = 8,
  color = 'var(--progress)',
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {(label !== undefined || sublabel !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label !== undefined && (
            <span className="font-numeral text-ink text-base leading-none tabular-nums">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-ink-subtle text-[10px] mt-0.5">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
