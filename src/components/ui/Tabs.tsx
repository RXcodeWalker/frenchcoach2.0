import type { KeyboardEvent } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Tabs that switch content (Component Kit §11). 13px 600 labels sitting on a
 * full-width hairline; the active one carries a 2px --action underline,
 * inactive is --ink-subtle. Arrow keys move within the group, Tab leaves it.
 * The underline slides over 120ms; the panel does not animate.
 *
 * For a filter within one panel use a segmented control, not this — never
 * both in the same panel.
 */
export function Tabs({ tabs, value, onChange, className = '' }: Props) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((t) => t.id === value);
    if (i === -1) return;
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
  }

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={`flex gap-5 border-b border-hairline ${className}`}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`pb-[9px] text-[13px] font-semibold transition-colors duration-state ease-smooth
              ${active
                ? 'text-ink shadow-[inset_0_-2px_0_var(--action)]'
                : 'text-ink-subtle hover:text-ink-muted'}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
