import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  id: T;
  label: ReactNode;
  /** A 12px second line under the label (e.g. "Tips and a score"). */
  note?: ReactNode;
  disabled?: boolean;
}

interface Props<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Accessible name for the group. */
  label: string;
  /** Height of each option, px. 44 by default; 36 for a compact filter, 60 with notes. */
  height?: number;
  className?: string;
  testIdPrefix?: string;
}

/**
 * Segmented control (Design System v2): a --surface track with a 4px inset,
 * equal columns, and an action-soft indicator with a 1px --action inset that
 * slides between options (the `slide` motion: 320ms, slide easing). Labels are
 * 13/600, --action-text when selected, --ink-muted otherwise. Use it to pick
 * one of a few settings or to filter one panel — never alongside Tabs.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  height = 44,
  className = '',
  testIdPrefix,
}: Props<T>) {
  const n = options.length;
  const idx = Math.max(0, options.findIndex(o => o.id === value));

  return (
    <div
      role="group"
      aria-label={label}
      className={`relative grid rounded-card border border-hairline bg-surface p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1 top-1 rounded-control bg-action-soft shadow-[inset_0_0_0_1px_var(--action)]
          transition-transform duration-slide ease-slide"
        style={{
          width: `calc((100% - 8px) / ${n})`,
          height: 'calc(100% - 8px)',
          transform: `translateX(${idx * 100}%)`,
        }}
      />
      {options.map(o => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            disabled={o.disabled}
            onClick={() => onChange(o.id)}
            data-testid={testIdPrefix ? `${testIdPrefix}-${o.id}` : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 px-2 text-center text-[13px] font-semibold leading-tight
              transition-colors duration-state ease-smooth disabled:cursor-default disabled:text-ink-subtle
              ${on ? 'text-action-text' : 'text-ink-muted hover:text-ink'}`}
            style={{ height }}
          >
            <span>{o.label}</span>
            {o.note != null && <span className="text-caption text-ink-subtle">{o.note}</span>}
          </button>
        );
      })}
    </div>
  );
}
