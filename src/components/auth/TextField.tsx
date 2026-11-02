import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'> {
  label: string;
  /** A 13px line under the input (a rule, a format). */
  hint?: ReactNode;
  /** A field-level problem; replaces the hint and marks the input invalid. */
  error?: string | null;
  /** A control inside the input's right edge (e.g. the show-password toggle). */
  trailing?: ReactNode;
}

/**
 * A labelled text input (Design System v2): the label is always visible (a
 * placeholder is not a label), 44px tall, 16px text so mobile browsers never
 * zoom, hairline-strong border that turns --action on focus, --correction
 * when invalid. Used by the sign-in, reset and age-check screens.
 */
export function TextField({ label, hint, error, trailing, ...rest }: Props) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-label text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={`h-11 w-full rounded-control border bg-surface px-3 text-[16px] text-ink
            placeholder:text-ink-subtle transition-colors duration-state ease-smooth
            focus:border-action ${trailing ? 'pr-11' : ''}
            ${error ? 'border-correction' : 'border-hairline-strong hover:border-ink-subtle'}`}
          {...rest}
        />
        {trailing != null && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>
        )}
      </div>
      {note != null && (
        <p
          id={noteId}
          className={`mt-1.5 text-label font-normal ${error ? 'text-correction-text' : 'text-ink-subtle'}`}
        >
          {note}
        </p>
      )}
    </div>
  );
}
