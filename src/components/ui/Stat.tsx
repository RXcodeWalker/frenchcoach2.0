import type { ReactNode } from 'react';

/**
 * A stat pill (Design System v2): 28px tall, a 1px border from its role,
 * transparent fill, Bricolage 500 tabular numerals at 13px and a 14px icon.
 * `soft` swaps the outline for the role's soft fill (the mission card's
 * "Up to +90 XP"). Colour carries the meaning, so it is chosen by `role`:
 *   - `reward`   XP and gems
 *   - `streak`   the habit, and only the habit
 *   - `progress` improvement / correctness
 *   - `neutral`  anything else, and a streak of 0
 * A stat that increases animates its number, never this container.
 */
type Role = 'reward' | 'streak' | 'progress' | 'neutral';

interface Props {
  role?: Role;
  soft?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}

const outlineClass: Record<Role, string> = {
  reward: 'border-reward text-reward-text',
  streak: 'border-streak text-streak-text',
  progress: 'border-progress text-progress-text',
  neutral: 'border-hairline-strong text-ink-muted',
};

const softClass: Record<Role, string> = {
  reward: 'border-transparent bg-reward-soft text-reward-text',
  streak: 'border-streak text-streak-text',
  progress: 'border-transparent bg-progress-soft text-progress-text',
  neutral: 'border-transparent bg-surface-recessed text-ink-muted',
};

export function Stat({ role = 'neutral', soft = false, icon, children, className = '', title }: Props) {
  return (
    <span
      title={title}
      className={`inline-flex h-7 items-center gap-1.5 rounded-pill border px-2.5
        font-numeral text-[13px] ${soft ? softClass[role] : `bg-transparent ${outlineClass[role]}`} ${className}`}
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
