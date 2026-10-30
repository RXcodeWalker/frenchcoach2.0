import { Check, Gem, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ItemTile } from './ItemTile';
import { RequirementBar } from './RequirementBar';
import { isEquippableKind, priceState } from './itemState';
import { rarityOf, RARITY_COLOR, RARITY_LABEL } from '../../services/shop/rarity';
import { SHOP_CATALOGUE } from '../../services/shop/shopCatalogue';
import type { EquipSlot, ShopItem } from '../../types/shop';

interface Props {
  item: ShopItem;
  owned: boolean;
  qty: number;
  equipped: boolean;
  balance: number;
  unlocked: boolean;
  /** Live progress toward this item's requirement (Shop plan §15 Phase 5). */
  progress?: { ratio: number; label: string };
  /** Locker collection: an item the learner doesn't own sits recessed, at full contrast. */
  recessed?: boolean;
  pending: boolean;
  error?: string;
  /** streak_repair only: whether the 48h repair window is open (§14.4). */
  canRepairStreak?: boolean;
  onOpen: () => void;
  onEquip: (slot: EquipSlot) => void;
  onUnequip: (slot: EquipSlot) => void;
  onRepairStreak?: () => void;
}

/**
 * One shop item (Design System v2 card). The top of the card opens the detail
 * dialog — where a purchase is confirmed — and the footer holds the one action
 * that fits the item's state: equip, repair, buy, or why it is locked.
 */
export function ShopItemCard({
  item, owned, qty, equipped, balance, unlocked, progress, recessed = false, pending, error,
  canRepairStreak, onOpen, onEquip, onUnequip, onRepairStreak,
}: Props) {
  const entry = SHOP_CATALOGUE[item.id];
  const rarity = rarityOf(item);
  const name = entry?.name ?? item.id;
  const price = priceState(item.priceGems, balance, unlocked);
  const showRequirement = !owned && !unlocked;

  return (
    <Card
      variant={recessed && !owned ? 'subtle' : 'default'}
      className="flex h-full flex-col gap-4 transition-colors duration-state ease-smooth hover:border-hairline-strong"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${name}, details`}
        className="flex flex-1 items-start gap-3 rounded-control text-left"
      >
        <ItemTile icon={entry?.icon || '✨'} rarity={rarity} locked={showRequirement} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-section text-ink">{name}</span>
            {rarity !== 'common' && (
              <span className="shrink-0 text-eyebrow uppercase" style={{ color: RARITY_COLOR[rarity] }}>
                {RARITY_LABEL[rarity]}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-body-s text-ink-muted">{entry?.description ?? ''}</span>
          {showRequirement && entry?.requirementLabel && (
            <span className="mt-2 flex items-center gap-1.5 text-caption font-semibold text-ink-muted">
              <Lock size={12} aria-hidden="true" />
              {entry.requirementLabel}
            </span>
          )}
        </span>
      </button>

      {showRequirement && progress && <RequirementBar ratio={progress.ratio} label={progress.label} />}

      {error && (
        <p role="alert" className="text-caption font-semibold text-correction-text">
          {error}
        </p>
      )}

      {owned ? (
        isEquippableKind(item.kind) ? (
          <Button
            variant="secondary"
            size="sm"
            loading={pending}
            aria-pressed={equipped}
            onClick={() => (equipped ? onUnequip(item.kind as EquipSlot) : onEquip(item.kind as EquipSlot))}
            className={`w-full ${equipped ? '!border-action !bg-action-soft !text-action-text' : ''}`}
          >
            {equipped ? (
              <>
                <Check size={14} aria-hidden="true" /> Equipped
              </>
            ) : (
              'Equip'
            )}
          </Button>
        ) : item.id === 'streak_repair' && canRepairStreak ? (
          <Button size="sm" onClick={onRepairStreak} className="w-full">
            Repair streak{qty > 1 ? ` (${qty})` : ''}
          </Button>
        ) : (
          <p className="flex h-10 items-center justify-center gap-1.5 rounded-control bg-surface-recessed text-[13px] font-semibold text-ink-muted">
            <Check size={14} aria-hidden="true" />
            {qty > 1 ? `You have ${qty}` : 'Owned'}
          </p>
        )
      ) : price.kind === 'locked' ? (
        <Button variant="secondary" size="sm" onClick={onOpen} className="w-full">
          <Lock size={14} aria-hidden="true" /> See what unlocks it
        </Button>
      ) : price.kind === 'affordable' ? (
        <Button variant="secondary" size="sm" onClick={onOpen} className="w-full">
          <Gem size={14} className="text-reward-text" aria-hidden="true" />
          <span className="font-numeral">{price.price.toLocaleString('en-GB')}</span>
          <span className="text-ink-muted">· Buy</span>
        </Button>
      ) : (
        <div className="text-center">
          <Button variant="quiet" size="sm" onClick={onOpen} className="w-full">
            <Gem size={14} aria-hidden="true" />
            <span className="font-numeral">{price.short.toLocaleString('en-GB')}</span> more to go
          </Button>
          <p className="mt-0.5 text-caption text-ink-subtle">
            ≈{price.sessions} more session{price.sessions === 1 ? '' : 's'}
          </p>
        </div>
      )}
    </Card>
  );
}
