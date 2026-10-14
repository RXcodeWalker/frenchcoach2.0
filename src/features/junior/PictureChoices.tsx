/**
 * The pictures a learner taps to choose their answer (junior-track §3). Picking
 * a picture removes the hardest A1 barrier — remembering the word. In the Free
 * step the pictures stay as a visual aid but carry no word under them.
 */
import { slotText } from '../../data/junior/sentence';
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
    <div role="group" aria-label="Pick a picture" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-card border-2 p-3 transition-colors ${
              selected ? 'border-action bg-action-soft' : 'border-hairline surface'
            }`}
          >
            <span aria-hidden="true" className="text-4xl leading-none">{o.emoji}</span>
            {showWords && (
              <span lang="fr" className="text-label text-ink">
                {slotText(o)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
