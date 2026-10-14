/**
 * Léo, the Junior character (junior-track §7): five animated states — listening,
 * happy, celebrating, curious ("hmm?"), thinking. The state IS the per-turn
 * feedback: a learner who cannot read the one optional line still knows how it
 * went. Animation is reduced-motion friendly (`motion-safe:` only). Colour comes
 * from role tokens (§12), never raw Tailwind colours or hex.
 */
import type { LeoState } from '../../domain/junior/types';

const LABEL: Record<LeoState, string> = {
  listening: 'Léo is listening',
  happy: 'Léo is happy',
  celebrating: 'Léo is celebrating',
  curious: 'Léo is curious',
  thinking: 'Léo is thinking',
};

const SIZE = { sm: 'h-20 w-20', md: 'h-28 w-28', lg: 'h-36 w-36' } as const;

interface Props {
  state: LeoState;
  size?: keyof typeof SIZE;
  /** An unlocked outfit (a sticker-set reward), shown as a small emoji on Léo. */
  accessory?: string | null;
}

function Mouth({ state }: { state: LeoState }) {
  switch (state) {
    case 'celebrating':
      return <path d="M42 74 Q60 100 78 74 Z" className="fill-ink" />;
    case 'happy':
      return <path d="M44 76 Q60 90 76 76" className="fill-none stroke-ink" strokeWidth="4" strokeLinecap="round" />;
    case 'curious':
      return <ellipse cx="60" cy="82" rx="6" ry="7" className="fill-ink" />;
    case 'thinking':
      return <path d="M48 82 H72" className="fill-none stroke-ink" strokeWidth="4" strokeLinecap="round" />;
    case 'listening':
      return <ellipse cx="60" cy="82" rx="8" ry="4" className="fill-ink" />;
  }
}

export function Leo({ state, size = 'md', accessory = null }: Props) {
  return (
    <div
      role="img"
      aria-label={LABEL[state]}
      data-testid="leo"
      data-state={state}
      className={`relative inline-block ${SIZE[size]}`}
    >
      {state === 'listening' && (
        <span
          aria-hidden="true"
          data-testid="leo-glow"
          className="absolute inset-0 rounded-full bg-action-soft motion-safe:animate-pulse"
        />
      )}
      <svg viewBox="0 0 120 120" className={`relative h-full w-full ${state === 'celebrating' ? 'motion-safe:animate-bounce' : ''}`} aria-hidden="true">
        {/* ears — in the listening state the ear is the cue (§4) */}
        <circle cx="14" cy="64" r={state === 'listening' ? 13 : 9} className="fill-action stroke-hairline-strong" strokeWidth="2" />
        <circle cx="106" cy="64" r="9" className="fill-action stroke-hairline-strong" strokeWidth="2" />
        <circle cx="60" cy="62" r="44" className="fill-action-soft stroke-action" strokeWidth="4" />
        {/* eyes */}
        {state === 'celebrating' ? (
          <>
            <path d="M38 54 Q46 44 54 54" className="fill-none stroke-ink" strokeWidth="4" strokeLinecap="round" />
            <path d="M66 54 Q74 44 82 54" className="fill-none stroke-ink" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="46" cy="54" r="6" className="fill-ink" />
            <circle cx="74" cy="54" r="6" className="fill-ink" />
          </>
        )}
        {state === 'curious' && <path d="M64 40 L84 34" className="fill-none stroke-ink" strokeWidth="4" strokeLinecap="round" />}
        <Mouth state={state} />
        {state === 'celebrating' && (
          <>
            <text x="6" y="26" fontSize="20" aria-hidden="true">✨</text>
            <text x="92" y="22" fontSize="20" aria-hidden="true">✨</text>
          </>
        )}
        {state === 'thinking' && (
          <text x="82" y="30" fontSize="22" className="fill-ink-muted" aria-hidden="true">…</text>
        )}
      </svg>
      {state === 'curious' && (
        <span aria-hidden="true" className="absolute -top-1 -right-2 rounded-pill bg-info-soft px-2 py-0.5 text-label text-info-text">
          hmm?
        </span>
      )}
      {accessory && (
        <span aria-hidden="true" data-testid="leo-accessory" className="absolute left-1/2 top-[34%] -translate-x-1/2 text-3xl leading-none">
          {accessory}
        </span>
      )}
    </div>
  );
}
