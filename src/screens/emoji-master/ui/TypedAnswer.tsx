import type { FormEvent, RefObject } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLInputElement>;
  /** The answer is in (or time is up): the field is read-only, not disabled, so a phone keyboard stays up. */
  locked: boolean;
  /** After a miss the primary button becomes "Next" so the learner can read the fix. */
  onNext?: () => void;
  nextLabel?: string;
  submitLabel: string;
  placeholder: string;
  hint?: string;
}

const INPUT =
  'h-14 w-full min-w-0 rounded-control border border-hairline-strong bg-surface px-4 text-center text-[22px] font-semibold text-ink placeholder:text-ink-subtle placeholder:font-normal ' +
  'transition-[border-color,box-shadow] duration-state ease-smooth focus:border-focus focus:shadow-[0_0_0_3px_var(--action-soft)] focus:outline-none ' +
  'read-only:bg-surface-recessed read-only:text-ink-subtle';

/** The typed-answer form shared by Hardcore, Speed Blitz and the Arena. One primary button. */
export function TypedAnswer({ value, onChange, onSubmit, inputRef, locked, onNext, submitLabel, nextLabel = 'Next', placeholder, hint }: Props) {
  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!locked) onSubmit();
  };
  return (
    <form onSubmit={handle} className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={locked}
        placeholder={placeholder}
        aria-label="Your answer in French"
        lang="fr"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        className={INPUT}
      />
      {onNext ? (
        <Button size="lg" onClick={onNext} autoFocus className="w-full">
          {nextLabel}
          <ArrowRight size={18} aria-hidden="true" />
        </Button>
      ) : (
        <Button type="submit" size="lg" disabled={locked || !value.trim()} className="w-full">
          {submitLabel}
        </Button>
      )}
      {hint && <p className="text-center text-caption text-ink-subtle">{hint}</p>}
    </form>
  );
}
