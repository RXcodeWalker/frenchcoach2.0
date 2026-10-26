import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Buttons (Design System v2). One primary per screen (solid --action);
 * secondary is a hairline-strong outline, quiet is label only, destructive is
 * a correction outline and danger is the correction-filled confirm (used only
 * inside a confirmation dialog). Hover is a colour step, never scale; press
 * compresses to .97 over 80ms. Disabled is shown with the track fill and
 * --ink-subtle, never with opacity.
 */
type Variant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'danger';
type Size = 'lg' | 'md' | 'sm';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children: ReactNode;
}

// lg 48px — the mission CTA and full-width starts; md 44px — the touch
// minimum, used for most actions; sm 40px — compact secondaries inside cards.
const sizeClass: Record<Size, string> = {
  lg: 'h-12 px-5 text-[15px]',
  md: 'h-11 px-4 text-[14px]',
  sm: 'h-10 px-3.5 text-[13px]',
};

const variantClass: Record<Variant, string> = {
  primary:
    'bg-action text-action-ink hover:bg-action-hover active:bg-action-press disabled:bg-track disabled:text-ink-subtle',
  secondary:
    'border border-hairline-strong text-ink hover:bg-track disabled:text-ink-subtle disabled:hover:bg-transparent',
  quiet: 'text-ink-muted hover:bg-track hover:text-ink disabled:text-ink-subtle disabled:hover:bg-transparent',
  destructive:
    'border border-hairline-strong text-correction-text hover:border-correction hover:bg-correction-soft disabled:text-ink-subtle',
  danger: 'bg-correction text-action-ink disabled:bg-track disabled:text-ink-subtle',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-control font-semibold
        transition-[background-color,border-color,color,transform] duration-state ease-smooth
        active:scale-[.97] active:duration-press disabled:cursor-default disabled:active:scale-100
        ${sizeClass[size]} ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

// Keeps the button's width while it loads — the label is replaced, not the box.
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
