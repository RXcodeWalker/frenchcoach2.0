/**
 * The pictures a learner taps to choose their answer (junior-track §3). Picking
 * a picture removes the hardest A1 barrier — remembering the word. In the Free
 * step the pictures stay as a visual aid but carry no word under them.
 */
import { Check } from 'lucide-react';
import { slotText } from '../../data/junior/sentence';
import { JuniorArt } from './art/JuniorArt';
import type { JuniorSlotOption } from '../../data/junior/types';

interface Props {
  options: readonly JuniorSlotOption[];
  chosenId: string | null;
  /** Free step: the pictures are shown without their words and need not be tapped. */
  showWords: boolean;
  disabled?: boolean;
  onPick: (optionId: string) => void;
}

export function PictureChoices({ options, chosenId, showWords, disabled = false, onPick }: Props) {
  return (
    <div role="group" aria-label="Pick a picture" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {options.map((o) => {
        const selected = o.id === chosenId;
        return (
          <button
            key={o.id}
            type="button"
            data-testid="picture-choice"
            data-option-id={o.id}
            aria-label={slotText(o)}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onPick(o.id)}
            className={`relative flex min-h-[112px] flex-col items-center justify-center gap-2.5 rounded-card border p-3
              transition-[background-color,border-color,transform] duration-state ease-smooth active:scale-[.97] active:duration-press
              disabled:cursor-default disabled:active:scale-100 ${
                selected
                  ? 'border-action bg-action-soft'
                  : `border-hairline surface ${disabled ? '' : 'hover:border-hairline-strong hover:bg-track'}`
              }`}
          >
            {selected && (
              <span aria-hidden="true" className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-action text-action-ink">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
            <JuniorArt picture={o.emoji} size={56} />
            {showWords && (
              <span lang="fr" className="text-body-s font-semibold text-ink">
                {slotText(o)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
