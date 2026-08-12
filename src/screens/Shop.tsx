// Shop shell (Shop plan §15 Phase 4): layout, header, 3 tabs, ShopItemCard,
// purchase flow with real error states. Requirement-progress richness
// ("Grammar mastery 0.72/0.80" bars, silhouette grid, transaction ledger) is
// explicitly Phase 5 scope (§15) — this screen shows a binary locked/unlocked
// requirement check against `state.achievements` for now.
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Lock, Check, RefreshCw } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Card } from '../components/ui/Card';
import { CosmeticPreview } from '../components/ui/CosmeticPreview';
import { RarityRing } from '../components/ui/RarityRing';
import { fadeUp, stagger } from '../components/motion/variants';
import { useApp } from '../context/AppContext';
import { useCatalogue } from '../services/shop/useCatalogue';
import { SHOP_CATALOGUE } from '../services/shop/shopCatalogue';
import { rarityOf, RARITY_COLOR } from '../services/shop/rarity';
import { purchase, equip, makeIdempotencyKey } from '../services/shop/shopService';
import { ShopError } from '../types/shop';
import type { ShopItem, EquipSlot } from '../types/shop';

type ShopTab = 'gear' | 'identity' | 'locker';

const TABS: { id: ShopTab; label: string }[] = [
  { id: 'gear', label: 'Gear' },
  { id: 'identity', label: 'Identity' },
  { id: 'locker', label: 'Locker' },
];

const KIND_TAB: Record<ShopItem['kind'], ShopTab> = {
  consumable: 'gear',
  avatar: 'identity',
  frame: 'identity',
  nameplate: 'identity',
};

function errorMessage(err: unknown): string {
  if (err instanceof ShopError) {
    switch (err.code) {
      case 'insufficient_gems': return "You don't have enough gems yet.";
      case 'requirement_not_met': return "You haven't unlocked this yet.";
      case 'already_owned': return 'You already own this.';
      case 'not_authenticated': return 'Sign in to make purchases.';
      case 'network_error': return 'Reconnect to purchase.';
      default: return 'Something went wrong. Try again.';
    }
  }
  return 'Something went wrong. Try again.';
}

export function Shop() {
  const { state, dispatch } = useApp();
  const { profile, achievements } = state;
  const catalogue = useCatalogue();
  const [tab, setTab] = useState<ShopTab>('gear');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);

  const unlockedAchievementIds = useMemo(
    () => new Set(achievements.filter(a => a.unlocked).map(a => a.id)),
    [achievements]
  );

  const itemsByTab = useMemo(() => {
    const groups: Record<ShopTab, ShopItem[]> = { gear: [], identity: [], locker: [] };
    for (const item of catalogue) {
      if (!item.active) continue;
      groups[KIND_TAB[item.kind]].push(item);
    }
    const owned = catalogue.filter(item => (profile.inventory[item.id] ?? 0) > 0);
    groups.locker = owned;
    return groups;
  }, [catalogue, profile.inventory]);

  async function handlePurchase(item: ShopItem) {
    setPendingId(item.id);
    setErrorById(prev => ({ ...prev, [item.id]: '' }));
    try {
      const result = await purchase(item.id, makeIdempotencyKey());
      dispatch({ type: 'SET_ECONOMY', balance: result.balance, inventory: { ...profile.inventory, [item.id]: result.qty ?? 1 } });
    } catch (err) {
      setErrorById(prev => ({ ...prev, [item.id]: errorMessage(err) }));
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setPendingId(null);
    }
  }

  async function handleEquip(item: ShopItem, slot: EquipSlot) {
    setPendingId(item.id);
    setErrorById(prev => ({ ...prev, [item.id]: '' }));
    try {
      await equip(slot, item.id);
      dispatch({
        type: 'SET_PROFILE',
        profile: { ...profile, equipped: { ...profile.equipped, [slot]: item.id } },
      });
    } catch (err) {
      setErrorById(prev => ({ ...prev, [item.id]: errorMessage(err) }));
    } finally {
      setPendingId(null);
    }
  }

  async function handleUnequip(slot: EquipSlot) {
    try {
      await equip(slot, null);
      dispatch({ type: 'SET_PROFILE', profile: { ...profile, equipped: { ...profile.equipped, [slot]: null } } });
    } catch {
      // Best-effort; the slot simply stays equipped until the next successful attempt.
    }
  }

  const activeItems = itemsByTab[tab];

  return (
    <PageShell maxWidth="xl">
      <motion.div variants={fadeUp}>
        <ShopHeader
          balance={profile.gems}
          equipped={profile.equipped}
          catalogue={catalogue}
          username={profile.username ?? undefined}
          shake={shake}
        />
      </motion.div>

      <motion.div variants={fadeUp} className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="relative px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
          >
            {tab === t.id && (
              <motion.div
                layoutId="shop-tab-pill"
                className="absolute inset-0 bg-violet-500/20 border border-violet-500/30 rounded-lg"
                transition={{ type: 'spring', duration: 0.4 }}
              />
            )}
            <span className={`relative z-10 ${tab === t.id ? 'text-violet-300' : 'text-slate-500'}`}>{t.label}</span>
          </button>
        ))}
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <AnimatePresence mode="popLayout">
          {activeItems.map(item => (
            <motion.div key={item.id} variants={fadeUp} layout>
              <ShopItemCard
                item={item}
                owned={(profile.inventory[item.id] ?? 0) > 0}
                qty={profile.inventory[item.id] ?? 0}
                equipped={
                  item.kind === 'avatar' ? profile.equipped.avatar === item.id
                  : item.kind === 'frame' ? profile.equipped.frame === item.id
                  : item.kind === 'nameplate' ? profile.equipped.nameplate === item.id
                  : false
                }
                balance={profile.gems}
                unlocked={!item.requirement.achievement || unlockedAchievementIds.has(item.requirement.achievement)}
                pending={pendingId === item.id}
                error={errorById[item.id]}
                onPurchase={() => handlePurchase(item)}
                onEquip={slot => handleEquip(item, slot)}
                onUnequip={slot => handleUnequip(slot)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {activeItems.length === 0 && (
          <motion.div variants={fadeUp} className="col-span-full">
            <Card variant="subtle" className="text-center py-10">
              <p className="text-sm text-slate-500 font-bold">
                {tab === 'locker' ? "You don't own anything yet — browse Gear or Identity." : 'Nothing here yet.'}
              </p>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </PageShell>
  );
}

function ShopHeader({
  balance,
  equipped,
  catalogue,
  username,
  shake,
}: {
  balance: number;
  equipped: { avatar: string | null; frame: string | null; nameplate: string | null };
  catalogue: ShopItem[];
  username?: string;
  shake: boolean;
}) {
  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <CosmeticPreview
          avatarEmoji={null}
          frameItemId={equipped.frame}
          nameplateItemId={equipped.nameplate}
          catalogue={catalogue}
          username={username}
          size={48}
        />
        <motion.div
          animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : {}}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass border-emerald-500/20 bg-emerald-500/10"
        >
          <Gem size={16} className="text-emerald-400" />
          <span className="text-lg font-black text-white">{balance.toLocaleString()}</span>
        </motion.div>
      </div>
    </Card>
  );
}

function ShopItemCard({
  item,
  owned,
  qty,
  equipped,
  balance,
  unlocked,
  pending,
  error,
  onPurchase,
  onEquip,
  onUnequip,
}: {
  item: ShopItem;
  owned: boolean;
  qty: number;
  equipped: boolean;
  balance: number;
  unlocked: boolean;
  pending: boolean;
  error?: string;
  onPurchase: () => void;
  onEquip: (slot: EquipSlot) => void;
  onUnequip: (slot: EquipSlot) => void;
}) {
  const entry = SHOP_CATALOGUE[item.id];
  const rarity = rarityOf(item);
  const canAfford = balance >= item.priceGems;
  const isEquippable = item.kind === 'avatar' || item.kind === 'frame' || item.kind === 'nameplate';

  return (
    <motion.div whileHover={{ scale: 1.01, y: -2 }}>
      <Card variant="default" className="h-full flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <RarityRing rarity={rarity} size={48}>
            <div className="w-11 h-11 rounded-full bg-navy-300 flex items-center justify-center text-2xl">
              {entry?.icon || '✨'}
            </div>
          </RarityRing>
          {rarity !== 'common' && (
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: RARITY_COLOR[rarity] }}
            >
              {rarity}
            </span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-bold text-white">{entry?.name ?? item.id}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{entry?.description ?? ''}</p>
          {entry?.requirementLabel && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-1.5 flex items-center gap-1">
              {!unlocked && <Lock size={10} />}
              {entry.requirementLabel}
            </p>
          )}
        </div>

        {error && <p className="text-[11px] font-bold text-rose-400">{error}</p>}

        {owned ? (
          isEquippable ? (
            <button
              disabled={pending}
              onClick={() => (equipped ? onUnequip(item.kind as EquipSlot) : onEquip(item.kind as EquipSlot))}
              className={`w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 ${
                equipped
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              {pending ? <RefreshCw size={12} className="animate-spin" /> : equipped ? <Check size={12} /> : null}
              {equipped ? 'Equipped' : 'Equip'}
            </button>
          ) : (
            <div className="w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest text-center bg-white/5 text-slate-400 border border-white/10">
              Owned{qty > 1 ? ` × ${qty}` : ''}
            </div>
          )
        ) : (
          <button
            disabled={pending || !unlocked}
            onClick={onPurchase}
            className={`w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 ${
              !unlocked
                ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                : canAfford
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          >
            {pending ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : !unlocked ? (
              <Lock size={12} />
            ) : (
              <Gem size={12} />
            )}
            {!unlocked
              ? 'Locked'
              : canAfford
              ? item.priceGems.toLocaleString()
              : `+${(item.priceGems - balance).toLocaleString()} more`}
          </button>
        )}
      </Card>
    </motion.div>
  );
}
