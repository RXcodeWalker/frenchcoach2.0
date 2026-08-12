import type { ShopItem } from '../../types/shop';
import { rarityOf, RARITY_COLOR } from '../../services/shop/rarity';
import { RarityRing } from './RarityRing';

interface CosmeticPreviewProps {
  /** Literal emoji glyph — `profiles.avatar_emoji` / `equip_cosmetic`'s emoji slot, not an id. */
  avatarEmoji: string | null;
  /** shop_items id or null, resolved against `catalogue` for frame rarity. */
  frameItemId: string | null;
  /** shop_items id or null, resolved against `catalogue` for nameplate rarity. */
  nameplateItemId: string | null;
  /** Live shop_items rows (from shopService.getCatalogue()) — needed to derive rarity for frame/nameplate rings. */
  catalogue: ShopItem[];
  /** Omit to render the avatar+frame only, with no nameplate/username text (e.g. an icon-only header slot). */
  username?: string;
  size?: number;
}

/**
 * Renders a user's equipped avatar + frame + nameplate exactly as leaderboard/
 * friends/search rows do (Shop plan §7, §14.6: "the preview *is* the shipping
 * component"). Used both for the current user's own equipped state and for
 * any remote user's row — same component, same rendering rules, so there is
 * no risk of the preview drifting from what other users actually see.
 */
export function CosmeticPreview({
  avatarEmoji,
  frameItemId,
  nameplateItemId,
  catalogue,
  username,
  size = 40,
}: CosmeticPreviewProps) {
  const frameItem = frameItemId ? catalogue.find(i => i.id === frameItemId) : undefined;
  const nameplateItem = nameplateItemId ? catalogue.find(i => i.id === nameplateItemId) : undefined;

  const avatarNode = (
    <div
      className="rounded-full bg-navy-300 flex items-center justify-center border-2 border-white/5"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {avatarEmoji ?? '👤'}
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      {frameItem ? (
        <RarityRing rarity={rarityOf(frameItem)} size={size + 4}>
          {avatarNode}
        </RarityRing>
      ) : (
        avatarNode
      )}
      {username !== undefined && (
        <span
          className="text-sm font-bold"
          style={nameplateItem ? { color: RARITY_COLOR[rarityOf(nameplateItem)] } : undefined}
        >
          {username}
        </span>
      )}
    </div>
  );
}
