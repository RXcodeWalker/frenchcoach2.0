import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Lock, RefreshCw } from 'lucide-react';
import { RarityRing } from './RarityRing';
import { rarityOf, RARITY_COLOR } from '../../services/shop/rarity';
import { SHOP_CATALOGUE } from '../../services/shop/shopCatalogue';
import type { ShopItem } from '../../types/shop';

interface ItemDetailSheetProps {
  item: ShopItem;
  owned: boolean;
  balance: number;
  unlocked: boolean;
  progress?: { ratio: number; label: string };
  pending: boolean;
  error?: string;
  onClose: () => void;
  onPurchase: () => void;
}

/**
 * Shop plan §8/§13: mobile detail view for a tapped card — "bottom sheet,
 * drag-to-dismiss," "sticky purchase CTA inside the sheet; 44px minimum
 * targets." Desktop uses the existing inline card + layoutId expansion
 * (§8: "Desktop: expands in place via layoutId with CosmeticPreview on your
 * real leaderboard row") — this component is the <768px counterpart, shown
 * only when a card is tapped on a narrow viewport.
 */
export function ItemDetailSheet({
  item,
  owned,
  balance,
  unlocked,
  progress,
  pending,
  error,
  onClose,
  onPurchase,
}: ItemDetailSheetProps) {
  const entry = SHOP_CATALOGUE[item.id];
  const rarity = rarityOf(item);
  const canAfford = balance >= item.priceGems;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] bg-black/50 md:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[95] md:hidden surface-raised rounded-t-2xl p-5 pb-8"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100) onClose();
        }}
      >
        <div className="w-10 h-1.5 rounded-full bg-white/10 mx-auto mb-4" />

        <div className="flex items-start gap-4">
          <RarityRing rarity={rarity} size={56}>
            <div className="w-12 h-12 rounded-full bg-navy-300 flex items-center justify-center text-3xl">
              {entry?.icon || '✨'}
            </div>
          </RarityRing>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white">{entry?.name ?? item.id}</h3>
            <p className="text-xs text-ink-muted mt-0.5">{entry?.description ?? ''}</p>
            {rarity !== 'common' && (
              <span
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: RARITY_COLOR[rarity] }}
              >
                {rarity}
              </span>
            )}
          </div>
        </div>

        {entry?.requirementLabel && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-subtle mt-3 flex items-center gap-1">
            {!unlocked && <Lock size={10} />}
            {entry.requirementLabel}
          </p>
        )}
        {!unlocked && progress && (
          <div className="mt-2">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </div>
            <p className="text-[9px] font-bold text-ink-muted mt-1">{progress.label}</p>
          </div>
        )}

        {error && <p className="text-[11px] font-bold text-rose-400 mt-3">{error}</p>}

        {!owned && (
          <button
            disabled={pending || !unlocked}
            onClick={onPurchase}
            className={`w-full mt-5 py-3 min-h-[44px] rounded-lg text-sm font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 ${
              !unlocked
                ? 'bg-white/5 text-ink-subtle cursor-not-allowed'
                : canAfford
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-ink-muted border border-white/10'
            }`}
          >
            {pending ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : !unlocked ? (
              <Lock size={14} />
            ) : (
              <Gem size={14} />
            )}
            {!unlocked
              ? 'Locked'
              : canAfford
              ? item.priceGems.toLocaleString()
              : `+${(item.priceGems - balance).toLocaleString()} more`}
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
