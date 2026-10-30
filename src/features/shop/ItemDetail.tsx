import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Gem, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ItemTile } from './ItemTile';
import { RequirementBar } from './RequirementBar';
import { practiceLinkFor, priceState } from './itemState';
import { rarityOf, RARITY_COLOR, RARITY_LABEL } from '../../services/shop/rarity';
import { SHOP_CATALOGUE } from '../../services/shop/shopCatalogue';
import type { ShopItem } from '../../types/shop';

interface Props {
  item: ShopItem;
  owned: boolean;
  balance: number;
  unlocked: boolean;
  progress?: { ratio: number; label: string };
  pending: boolean;
  error?: string;
  /** Signed out: purchases need an account (Shop plan §14.7). */
  signedOut: boolean;
  onClose: () => void;
  onPurchase: () => void;
}

/**
 * The item dialog (Shop plan §8/§13): a centred dialog on desktop and a bottom
 * sheet under 640px (the shared `Modal`). It is where a purchase is confirmed —
 * the price, what is left afterwards, and a single primary button — so gems are
 * never spent by a stray tap. A locked item shows the requirement, its live
 * progress and a link to the practice that advances it.
 */
export function ItemDetail({ item, owned, balance, unlocked, progress, pending, error, signedOut, onClose, onPurchase }: Props) {
  const navigate = useNavigate();
  const entry = SHOP_CATALOGUE[item.id];
  const rarity = rarityOf(item);
  const name = entry?.name ?? item.id;
  const price = priceState(item.priceGems, balance, unlocked);
  const link = practiceLinkFor(item.requirement.achievement);

  const footer = owned ? (
    <Button variant="secondary" size="lg" onClick={onClose} className="w-full">
      Close
    </Button>
  ) : price.kind === 'locked' ? (
    <>
      <Button
        size="lg"
        onClick={() => {
          onClose();
          navigate(link.to);
        }}
        className="flex-1"
      >
        {link.label} <ArrowRight size={16} aria-hidden="true" />
      </Button>
      <Button variant="quiet" size="lg" onClick={onClose}>
        Close
      </Button>
    </>
  ) : (
    <>
      <Button
        size="lg"
        loading={pending}
        disabled={price.kind === 'short' || signedOut}
        onClick={onPurchase}
        className="flex-1"
      >
        <Gem size={16} aria-hidden="true" />
        {price.kind === 'affordable' ? `Buy for ${price.price.toLocaleString('en-GB')}` : 'Not enough gems'}
      </Button>
      <Button variant="quiet" size="lg" onClick={onClose}>
        Cancel
      </Button>
    </>
  );

  // Portalled to <body>: the route wrapper is a stacking context, so a dialog
  // inside it can't cover the mobile dock or the desktop rail.
  return createPortal(
    <Modal open onClose={onClose} title={name} footer={footer}>
      <div className="flex items-start gap-4">
        <ItemTile icon={entry?.icon || '✨'} rarity={rarity} size={64} locked={!owned && !unlocked} />
        <div className="min-w-0 flex-1">
          {rarity !== 'common' && (
            <p className="text-eyebrow uppercase" style={{ color: RARITY_COLOR[rarity] }}>
              {RARITY_LABEL[rarity]}
            </p>
          )}
          <p className="text-body-base text-ink-muted">{entry?.description ?? ''}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {owned && (
          <p className="flex items-center gap-2 text-body-s font-semibold text-progress-text">
            <Check size={16} aria-hidden="true" /> You own this.
          </p>
        )}

        {!owned && !unlocked && (
          <div className="rounded-control bg-surface-recessed p-3">
            <p className="flex items-center gap-2 text-body-s font-semibold text-ink">
              <Lock size={14} className="text-ink-muted" aria-hidden="true" />
              {entry?.requirementLabel ?? 'Locked'}
            </p>
            {progress && (
              <div className="mt-3">
                <RequirementBar ratio={progress.ratio} label={progress.label} />
              </div>
            )}
          </div>
        )}

        {!owned && price.kind === 'affordable' && (
          <dl className="space-y-1.5 rounded-control bg-surface-recessed p-3 text-body-s">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Your balance</dt>
              <dd className="font-numeral text-ink">{balance.toLocaleString('en-GB')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Price</dt>
              <dd className="font-numeral text-reward-text">−{price.price.toLocaleString('en-GB')}</dd>
            </div>
            <div className="flex justify-between border-t border-hairline pt-1.5">
              <dt className="font-semibold text-ink">After buying</dt>
              <dd className="font-numeral text-ink">{price.after.toLocaleString('en-GB')}</dd>
            </div>
          </dl>
        )}

        {!owned && price.kind === 'short' && (
          <p className="rounded-control bg-surface-recessed p-3 text-body-s text-ink-muted">
            You have <span className="font-numeral text-ink">{balance.toLocaleString('en-GB')}</span> of{' '}
            <span className="font-numeral text-ink">{price.price.toLocaleString('en-GB')}</span> gems — about{' '}
            {price.sessions} more session{price.sessions === 1 ? '' : 's'} of practice.
          </p>
        )}

        {!owned && unlocked && signedOut && (
          <p className="text-body-s text-ink-muted">Sign in to buy items. Your gems and purchases follow your account.</p>
        )}

        {error && (
          <p role="alert" className="text-body-s font-semibold text-correction-text">
            {error}
          </p>
        )}
      </div>
    </Modal>,
    document.body,
  );
}
