import type { ReactNode } from 'react';

/**
 * A surface that holds content (Component Kit §02). Two surface levels per
 * screen: `default` for something the learner acts on, `subtle` for reference
 * material, `elevated` for an overlay. Hierarchy is surface + 1px hairline —
 * no blur, no gradient border, no glow.
 *
 * `interactive` makes the whole card the hit area with a hairline-strong +
 * 2% ink hover and a focus ring; a static card gets no hover, because a card
 * that lifts but does nothing is a lie. `selected` is a 1px --action border
 * plus --action-soft fill — never a thicker border, so the layout never
 * shifts by 1px on selection.
 *
 * The `eyebrow`/`title`/`meta`/`action` slots are optional; passing only
 * `children` keeps the plain-container behaviour every existing caller uses.
 */
type Variant = 'subtle' | 'default' | 'elevated';

interface Props {
  variant?: Variant;
  interactive?: boolean;
  selected?: boolean;
  eyebrow?: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}

const variantClass: Record<Variant, string> = {
  subtle: 'surface-recessed',
  default: 'surface',
  elevated: 'surface-raised',
};

export function Card({
  variant = 'default',
  interactive = false,
  selected = false,
  eyebrow,
  title,
  meta,
  action,
  className = '',
  children,
  onClick,
}: Props) {
  const structured = eyebrow != null || title != null || meta != null || action != null;

  const stateClass = selected
    ? 'border-action bg-action-soft'
    : interactive
      ? 'transition-colors duration-state ease-smooth hover:border-hairline-strong hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)]'
      : '';

  const body = structured ? (
    <>
      {eyebrow != null && (
        <div className="text-eyebrow uppercase text-action-text">{eyebrow}</div>
      )}
      {title != null && <div className="mt-2 text-subtitle text-ink">{title}</div>}
      {children != null && <div className="mt-1.5 text-ink-muted">{children}</div>}
      {meta != null && <div className="mt-2 text-body-s text-ink-subtle">{meta}</div>}
      {action != null && <div className="mt-3">{action}</div>}
    </>
  ) : (
    children
  );

  const classes = `rounded-xl ${variantClass[variant]} p-4 ${stateClass} ${className}`;

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={`block w-full text-left ${classes}`}>
        {body}
      </button>
    );
  }

  return (
    <div onClick={onClick} className={classes}>
      {body}
    </div>
  );
}
