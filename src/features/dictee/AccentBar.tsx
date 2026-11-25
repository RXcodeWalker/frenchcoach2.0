/**
 * The French letters a keyboard may not have. Tapping one types it at the
 * cursor and leaves focus in the answer box, so a phone's keyboard stays up.
 */
const LETTERS = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'ü', 'œ'] as const;

export function AccentBar({ onInsert, disabled }: { onInsert: (letter: string) => void; disabled?: boolean }) {
  return (
    <div role="group" aria-label="French letters" className="flex flex-wrap gap-1.5" data-testid="dictee-accents">
      {LETTERS.map(letter => (
        <button
          key={letter}
          type="button"
          disabled={disabled}
          aria-label={`Type ${letter}`}
          // keep the cursor where it is: a button must not steal focus from the answer box
          onMouseDown={e => e.preventDefault()}
          onClick={() => onInsert(letter)}
          lang="fr"
          className="flex h-10 min-w-10 items-center justify-center rounded-control border border-hairline-strong bg-surface px-2 text-[16px] font-semibold text-ink
            transition-colors duration-state ease-smooth hover:bg-track active:scale-[.97] disabled:bg-track disabled:text-ink-subtle"
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
