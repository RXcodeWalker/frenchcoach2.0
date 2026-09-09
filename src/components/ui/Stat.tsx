import type { ReactNode } from 'react';

/**
 * An outlined stat pill (Component Kit §04). One shape: 26px tall, a 1px
 * border tinted from its role, transparent fill, a mono numeral, an optional
 * 14px icon. Never filled — filled means action, and a stat is not one.
 *
 * Colour carries the meaning, so it is chosen by `role`, never for variety:
 *   - `reward`  gems and XP earned (the game layer)
 *   - `streak`  the habit, and only the habit
 *   - `progress` improvement / correctness
 *   - `neutral` level, CEFR band, anything not one of the above
 *
 * A stat that increases animates its number, not this container — the pill
 * never pulses. "Streak at risk" is `role="neutral"` plus copy, not red.
 */
type Role = 'reward' | 'streak' | 'progress' | 'neutral';

interface Props {
  role?: Role;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const roleClass: Record<Role, string> = {
  reward: 'border-reward text-reward-text',
  streak: 'border-streak text-streak-text',
  progress: 'border-progress text-progress-text',
  neutral: 'border-hairline-strong text-ink-muted',
};

export function Stat({ role = 'neutral', icon, children, className = '' }: Props) {
  return (
    <span
      className={`inline-flex h-[26px] items-center gap-1.5 rounded-pill border bg-transparent
        px-2.5 font-numeral text-[13px] tabular-nums ${roleClass[role]} ${className}`}
    >
      {icon != null && (
        <span aria-hidden="true" className="inline-flex h-3.5 w-3.5 items-center justify-center">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
