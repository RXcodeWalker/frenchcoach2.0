import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * The four button variants from the design system (Component Kit §01):
 * one primary per screen (solid --action), secondary (hairline border),
 * quiet (label only), destructive (correction border). Hover and press are
 * token colour steps — never scale(); the old gradient + glow .btn-primary
 * is not this component.
 */
type Variant = 'primary' | 'secondary' | 'quiet' | 'destructive';
type Size = 'lg' | 'md' | 'sm';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children: ReactNode;
}

// height / horizontal padding / label size — lg is the one mission CTA,
// md the default, sm lives inside cards and rows. Mobile min is 44px, which
// callers opt into by passing size="lg" on small screens.
const sizeClass: Record<Size, string> = {
  lg: 'h-12 px-[18px] text-[15px]',
  md: 'h-10 px-4 text-[13px]',
  sm: 'h-8 px-3 text-[13px]',
};

const variantClass: Record<Variant, string> = {
  primary:
    'bg-action text-action-ink hover:bg-action-hover active:bg-action-press',
  secondary:
    'border border-hairline-strong text-ink hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]',
  quiet: 'text-ink-muted hover:text-ink',
  destructive:
    'border border-correction-soft text-correction-text hover:border-correction',
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
        transition-colors duration-state ease-smooth
        disabled:opacity-40 disabled:cursor-default
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
