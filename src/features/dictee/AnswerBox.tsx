import type { RefObject } from 'react';
import type { DicteeFormat } from '../../data/dictee';
import { AccentBar } from './AccentBar';

interface Props {
  format: DicteeFormat;
  value: string;
  onChange: (value: string) => void;
  /** Enter (without Shift) checks the answer. */
  onSubmit: () => void;
  /** Escape inside the box: the global Escape-is-back handler stands down for typing fields, so the box asks itself. */
  onEscape?: () => void;
  disabled?: boolean;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

const FIELD =
  'w-full rounded-control border border-hairline-strong bg-surface px-3.5 text-[17px] text-ink placeholder:text-ink-subtle ' +
  'transition-colors duration-state ease-smooth focus:border-action focus:outline-none disabled:bg-track disabled:text-ink-subtle';

/**
 * Where the answer is typed. Spell-check, autocorrect and capitalisation are
 * all off: the field must not fix the spelling the learner is being tested on.
 */
export function AnswerBox({ format, value, onChange, onSubmit, onEscape, disabled, inputRef }: Props) {
  const shared = {
    value,
    disabled,
    lang: 'fr',
    spellCheck: false,
    autoCorrect: 'off',
    autoCapitalize: 'none',
    autoComplete: 'off',
    enterKeyHint: 'done' as const,
    'aria-label': format === 'words' ? 'Type the word you hear' : 'Type the sentence you hear',
    'data-testid': 'dictee-answer',
    placeholder: format === 'words' ? 'Type the word…' : 'Type the sentence…',
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        onSubmit();
      } else if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        // The dialog this opens listens for Escape on `document`; this same keydown is still on its way there
        // and would close it again at once. (jsdom's synchronous act() hides this; a real browser does not.)
        e.stopPropagation();
        onEscape();
      }
    },
  };

  /** Types `letter` at the cursor (or over the selection) and puts the cursor after it. */
  const insert = (letter: string) => {
    const el = inputRef.current;
    if (!el || disabled) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + letter + value.slice(end));
    const caret = start + letter.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      {format === 'words' ? (
        <input ref={inputRef as RefObject<HTMLInputElement>} type="text" {...shared} className={`${FIELD} h-12`} />
      ) : (
        <textarea ref={inputRef as RefObject<HTMLTextAreaElement>} rows={3} {...shared} className={`${FIELD} resize-none py-3 leading-[1.5]`} />
      )}
      <AccentBar onInsert={insert} disabled={disabled} />
    </div>
  );
}
