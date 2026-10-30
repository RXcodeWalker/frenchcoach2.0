import { Lock } from 'lucide-react';
import { RarityRing } from '../../components/ui/RarityRing';
import type { Rarity } from '../../services/shop/rarity';

interface Props {
  icon: string;
  rarity: Rarity;
  size?: 48 | 64;
  /** Locked and not owned: the item sits in a recessed tile with a lock badge, never faded. */
  locked?: boolean;
}

/**
 * An item's artwork in its rarity ring. The icon is the catalogue's emoji —
 * item content, like Emoji Master's prompts, not interface chrome.
 */
export function ItemTile({ icon, rarity, size = 48, locked = false }: Props) {
  const inner = size === 64 ? 'h-14 w-14 text-[30px]' : 'h-11 w-11 text-[24px]';
  return (
    <div className="relative shrink-0">
      <RarityRing rarity={rarity} size={size}>
        <div
          className={`flex items-center justify-center rounded-pill ${inner} ${locked ? 'bg-track grayscale' : 'bg-surface-recessed'}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </RarityRing>
      {locked && (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-pill border border-hairline-strong bg-surface text-ink-muted"
        >
          <Lock size={11} />
        </span>
      )}
    </div>
  );
}
