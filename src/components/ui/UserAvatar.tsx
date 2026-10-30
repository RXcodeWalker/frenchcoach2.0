import { CosmeticPreview } from './CosmeticPreview';
import { SHOP_CATALOGUE } from '../../services/shop/shopCatalogue';
import type { ShopItem } from '../../types/shop';

interface Props {
  username: string | null;
  /** Equipped shop cosmetics; when either is set the shop's own preview renders. */
  equipped?: { avatar: string | null; frame: string | null };
  catalogue?: ShopItem[];
  size?: number;
  /** `soft` is the Profile identity avatar (action-soft); `plain` the top bar's recessed one. */
  tone?: 'soft' | 'plain';
}

function initialsOf(name: string | null | undefined): string {
  const clean = (name ?? '').replace(/[^A-Za-z0-9_ ]/g, '').trim();
  if (!clean) return 'FA';
  const parts = clean.split(/[\s_]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2);
  return letters.toUpperCase();
}

/**
 * The learner's avatar (Design System v2): initials in a circle — no emoji.
 * An equipped shop avatar or frame keeps rendering through CosmeticPreview.
 */
export function UserAvatar({ username, equipped, catalogue = [], size = 36, tone = 'plain' }: Props) {
  if (equipped && (equipped.avatar || equipped.frame)) {
    return (
      <CosmeticPreview
        avatarEmoji={equipped.avatar ? SHOP_CATALOGUE[equipped.avatar]?.icon ?? equipped.avatar : null}
        frameItemId={equipped.frame}
        nameplateItemId={null}
        catalogue={catalogue}
        size={size}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-pill font-semibold
        ${tone === 'soft' ? 'bg-action-soft text-action-text' : 'border border-hairline bg-surface-recessed text-ink-muted'}`}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.36)) }}
    >
      {initialsOf(username)}
    </span>
  );
}
