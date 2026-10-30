import { Lightbulb } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { CosmeticPreview } from '../../components/ui/CosmeticPreview';
import { GemBalance } from '../../components/ui/GemBalance';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { SHOP_CATALOGUE } from '../../services/shop/shopCatalogue';
import type { ShopItem } from '../../types/shop';

interface Props {
  balance: number;
  equipped: { avatar: string | null; frame: string | null; nameplate: string | null };
  catalogue: ShopItem[];
  username: string | null;
  /** Shop plan §9: the single read-only coach line (null collapses it). */
  coachLine: string | null;
}

/**
 * The persistent header (Shop plan §3–4): balance first, then the learner's
 * equipped look rendered exactly as other people see it, then at most one
 * contextual line. Nothing here sells — no deal, countdown or top-up.
 */
export function ShopHeader({ balance, equipped, catalogue, username, coachLine }: Props) {
  const anyEquipped = !!(equipped.avatar || equipped.frame || equipped.nameplate);
  const name = username ?? 'You';

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <GemBalance balance={balance} />

        <div>
          <p className="text-eyebrow uppercase text-ink-subtle">Your look</p>
          <div className="mt-2" data-testid="shop-look">
            {anyEquipped ? (
              <CosmeticPreview
                avatarEmoji={equipped.avatar ? SHOP_CATALOGUE[equipped.avatar]?.icon ?? null : null}
                frameItemId={equipped.frame}
                nameplateItemId={equipped.nameplate}
                catalogue={catalogue}
                username={name}
                size={44}
              />
            ) : (
              <div className="flex items-center gap-3">
                <UserAvatar username={username} size={44} tone="soft" />
                <span className="text-body-s font-semibold text-ink">{name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {coachLine && (
        <p className="mt-4 flex items-start gap-2.5 rounded-control bg-info-soft px-3 py-2.5 text-body-s text-ink">
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-info-text" aria-hidden="true" />
          <span>{coachLine}</span>
        </p>
      )}
    </Card>
  );
}
