import type { ReactNode } from 'react';

/**
 * The toggle (Design System v2): a 40×24 pill, --action when on and
 * --hairline-strong when off, with an 18px white knob that slides 16px
 * (the `slide` motion). Purely visual — the row around it is the switch.
 */
export function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative h-6 w-10 shrink-0 rounded-pill transition-colors duration-state ease-smooth
        ${on ? 'bg-action' : 'bg-hairline-strong'}`}
    >
      <span
        className="absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-pill bg-white shadow-[0_1px_2px_rgba(0,0,0,.25)]
          transition-transform duration-slide ease-slide"
        style={{ transform: on ? 'translateX(16px)' : 'none' }}
      />
    </span>
  );
}

/** The 32px recessed icon box at the start of a settings row. */
export function SettingIcon({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'correction' }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control
        ${tone === 'correction' ? 'bg-correction-soft text-correction-text' : 'bg-surface-recessed text-ink-muted'}`}
    >
      {children}
    </span>
  );
}

interface RowProps {
  icon: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  /** The control at the end of the row: a Toggle, a chevron, a tag. */
  trailing?: ReactNode;
  onClick?: () => void;
  /** Rows after the first in a group get a hairline rule on top. */
  divided?: boolean;
  tone?: 'neutral' | 'correction';
  disabled?: boolean;
  role?: 'switch' | 'radio';
  checked?: boolean;
  ariaExpanded?: boolean;
  testId?: string;
}

/**
 * A settings row (Design System v2): min 60px, a 32px icon box, a 14/600
 * label over a 13/400 subtle description, and a control at the end. A row
 * with `onClick` is the whole hit area; hover is the recessed surface only.
 */
export function SettingRow({
  icon, label, description, trailing, onClick, divided, tone = 'neutral', disabled, role, checked, ariaExpanded, testId,
}: RowProps) {
  const body = (
    <>
      <SettingIcon tone={tone}>{icon}</SettingIcon>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`text-[14px] font-semibold leading-[1.35] ${tone === 'correction' ? 'text-correction-text' : 'text-ink'}`}>
          {label}
        </span>
        {description != null && <span className="text-[13px] font-normal leading-[1.4] text-ink-subtle">{description}</span>}
      </span>
      {trailing}
    </>
  );
  const cls = `flex w-full min-h-[60px] items-center gap-3 px-4 py-2.5 text-left text-ink
    ${divided ? 'border-t border-hairline' : ''}`;

  if (!onClick) {
    return <div className={cls} data-testid={testId}>{body}</div>;
  }
  return (
    <button
      type="button"
      role={role}
      aria-checked={role ? checked : undefined}
      aria-expanded={ariaExpanded}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`${cls} transition-colors duration-state ease-smooth disabled:cursor-default
        ${tone === 'correction' ? 'hover:bg-correction-soft' : 'hover:bg-surface-recessed'} disabled:hover:bg-transparent`}
    >
      {body}
    </button>
  );
}

interface Props {
  icon: ReactNode;
  label: string;
  description: ReactNode;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  divided?: boolean;
  testId?: string;
}

/** A settings row whose control is a Toggle; the whole row is the switch. */
export function SettingToggle({ icon, label, description, enabled, onToggle, disabled, divided, testId }: Props) {
  return (
    <SettingRow
      role="switch"
      checked={enabled}
      icon={icon}
      label={label}
      description={description}
      onClick={onToggle}
      disabled={disabled}
      divided={divided}
      testId={testId}
      trailing={<Toggle on={enabled} />}
    />
  );
}

/** An eyebrow label above a card of settings rows. */
export function SettingGroup({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section className="flex flex-col gap-2" data-testid={testId}>
      <h2 className="px-1 text-eyebrow uppercase text-ink-subtle">{title}</h2>
      <div className="overflow-hidden rounded-card border border-hairline bg-surface">{children}</div>
    </section>
  );
}
