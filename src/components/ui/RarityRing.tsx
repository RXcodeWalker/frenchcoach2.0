import type { Rarity } from '../../services/shop/rarity';
import { RARITY_COLOR } from '../../services/shop/rarity';

interface RarityRingProps {
  rarity: Rarity;
  size: number;
  children: React.ReactNode;
}

/**
 * A 1px gradient ring around a cosmetic (Shop plan §7: "rarity is a
 * hairline ring and one word, not a glow storm"). Color lives here, on an
 * inner ring element — never on a `.glass` container's border, since
 * `.glass` sets `border: 1px solid transparent` plus a gradient
 * background-image that overrides Tailwind border-* colors in dark mode.
 */
export function RarityRing({ rarity, size, children }: RarityRingProps) {
  const color = RARITY_COLOR[rarity];
  return (
    <div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        boxShadow: rarity === 'common' ? undefined : `0 0 0 1px ${color}`,
      }}
    >
      {children}
    </div>
  );
}
