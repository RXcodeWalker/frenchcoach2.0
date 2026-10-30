import { Check, X } from 'lucide-react';

interface Props {
  choices: string[];
  correct: string;
  /** What was tapped, once answered. */
  selected: string | null;
  /** Choices are emoji (Reverse), so they are set large. */
  emoji?: boolean;
  /** Long emoji strings (sentences) are set smaller. */
  small?: boolean;
  onPick: (choice: string) => void;
}

/** Multiple choice. 1–4 on the keyboard pick the matching tile (`useDigitKeys`). */
export function ChoiceGrid({ choices, correct, selected, emoji = false, small = false, onPick }: Props) {
  const answered = selected !== null;
  return (
    <div role="group" aria-label="Answers" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {choices.map((choice, i) => {
        const isRight = choice === correct;
        const isPicked = choice === selected;
        let tone = 'border-hairline-strong bg-surface text-ink hover:bg-track';
        if (answered) {
          if (isRight) tone = 'border-progress bg-progress-soft text-progress-text';
          else if (isPicked) tone = 'border-correction bg-correction-soft text-correction-text';
          else tone = 'border-hairline bg-surface-recessed text-ink-subtle';
        }
        return (
          <button
            key={`${choice}-${i}`}
            type="button"
            disabled={answered}
            onClick={() => onPick(choice)}
            data-testid={`emoji-choice-${i + 1}`}
            className={`relative flex min-h-[60px] items-center justify-center rounded-card border px-10 py-3 text-[17px] font-semibold
              transition-[background-color,border-color,color,transform] duration-state ease-smooth
              active:scale-[.97] active:duration-press disabled:cursor-default disabled:active:scale-100 ${tone}`}
          >
            <span aria-hidden="true" className="font-numeral absolute left-4 top-1/2 -translate-y-1/2 text-caption text-ink-subtle">
              {i + 1}
            </span>
            <span className={emoji ? (small ? 'text-[28px] leading-tight' : 'text-[40px] leading-none') : ''} lang={emoji ? undefined : 'fr'}>
              {choice}
            </span>
            {answered && isRight && (
              <Check size={18} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2" />
            )}
            {answered && isPicked && !isRight && (
              <X size={18} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2" />
            )}
          </button>
        );
      })}
    </div>
  );
}
