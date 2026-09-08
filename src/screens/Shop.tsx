// Shop shell (Shop plan §15 Phase 4 + Phase 5). Phase 4 shipped layout,
// header, 3 tabs, ShopItemCard, purchase flow with real error states, and a
// binary locked/unlocked requirement check. Phase 5 adds: live requirement
// progress on locked Identity cards (from the real belief snapshot, not a
// placeholder), a silhouette collection grid on Locker (the full 19-item
// catalogue, not just owned items), and the transaction ledger.
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Lock, Check, RefreshCw } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Card } from '../components/ui/Card';
import { CosmeticPreview } from '../components/ui/CosmeticPreview';
import { RarityRing } from '../components/ui/RarityRing';
import { TransactionList } from '../components/ui/TransactionList';
import { GemBalance } from '../components/ui/GemBalance';
import { ItemDetailSheet } from '../components/ui/ItemDetailSheet';
import { fadeUp, stagger } from '../components/motion/variants';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useCatalogue } from '../services/shop/useCatalogue';
import { SHOP_CATALOGUE } from '../services/shop/shopCatalogue';
import { rarityOf, RARITY_COLOR } from '../services/shop/rarity';
import { purchase, equip, makeIdempotencyKey, getTransactionHistory } from '../services/shop/shopService';
import { computeRequirementProgress } from '../services/shop/requirementProgress';
import { computeCoachLine } from '../services/shop/coachLine';
import { getBeliefSnapshot } from '../services/coach/coachStorage';
import { getProblems, getInterventions } from '../services/coach/interventionService';
import { getDailyPlan } from '../services/coach/decisionEngine';
import { getCoachProfile, daysUntilExam } from '../services/coach/coachProfileService';
import { canRepairStreak, repairStreak, getStreakCount } from '../services/analytics/analyticsService';
import { hasStreakFreeze } from '../services/progression/progressionService';
import { storageGet, STORAGE_KEYS } from '../services/persistence/storage';
import { ShopError } from '../types/shop';
import type { ShopItem, EquipSlot, GemEvent } from '../types/shop';

type ShopTab = 'gear' | 'identity' | 'locker';

// Shop plan §5: "~50" gems for a standard (10-question) sitting — the
// documented average sitting used for "≈N more sessions" copy (§8, §11 C).
const AVG_GEMS_PER_SESSION = 50;

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
  const { user } = useAuth();
  const { profile, achievements } = state;
  const catalogue = useCatalogue();
  const [tab, setTab] = useState<ShopTab>('gear');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);
  const [transactions, setTransactions] = useState<GemEvent[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  // §6/§12.7: "Equip flies home into TopContextBar and stays" — the Shop
  // header's own CosmeticPreview is this screen's "home". A shared layoutId
  // between the equipped card's ring and the header ring animates the card
  // sliding into place on equip; cleared once the transition settles.
  const [justEquippedSlot, setJustEquippedSlot] = useState<EquipSlot | null>(null);
  // §8/§13: tapping a card opens the mobile detail bottom sheet; desktop
  // ignores this (ItemDetailSheet renders md:hidden) and keeps the existing
  // inline card interaction.
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  const unlockedAchievementIds = useMemo(
    () => new Set(achievements.filter(a => a.unlocked).map(a => a.id)),
    [achievements]
  );

  // Requirement progress reads the same signals achievements.ts's predicates
  // do (streak, xp, belief snapshot, problems, interventions) so a locked
  // card's bar can never show progress that doesn't match what actually
  // unlocks it (§15 Phase 5 success criterion).
  const progressByAchievement = useMemo(() => {
    const beliefSnapshot = getBeliefSnapshot();
    const problems = getProblems();
    const interventions = getInterventions();
    const roleplayCount = storageGet<{ roleplayCount?: number }>(STORAGE_KEYS.progression, {}).roleplayCount ?? 0;
    const requiredAchievementIds = new Set(
      catalogue.map(item => item.requirement.achievement).filter((id): id is string => !!id),
    );
    const map: Record<string, ReturnType<typeof computeRequirementProgress>> = {};
    for (const achievementId of requiredAchievementIds) {
      map[achievementId] = computeRequirementProgress({
        achievementId,
        unlocked: unlockedAchievementIds.has(achievementId),
        streak: profile.streak_days,
        xp: profile.total_xp,
        beliefSnapshot,
        problems,
        interventions,
        roleplayCount,
      });
    }
    return map;
  }, [catalogue, unlockedAchievementIds, profile.streak_days, profile.total_xp]);

  const itemsByTab = useMemo(() => {
    const groups: Record<ShopTab, ShopItem[]> = { gear: [], identity: [], locker: [] };
    for (const item of catalogue) {
      if (!item.active) continue;
      groups[KIND_TAB[item.kind]].push(item);
    }
    // Locker is the full collection, owned and unowned alike, shown as a
    // silhouette grid (Shop plan §3–4, §11 scenario H: "the empty state IS
    // the roadmap") — never filtered down to owned items only.
    groups.locker = catalogue.filter(item => item.active);
    return groups;
  }, [catalogue]);

  const ownedCount = useMemo(
    () => catalogue.filter(item => item.active && (profile.inventory[item.id] ?? 0) > 0).length,
    [catalogue, profile.inventory],
  );

  // §9: one read-only coach line inside the Shop, resolution order
  // streak_at_risk (no freeze) > exam_soon > overdue_review > nearest unlock.
  const coachLine = useMemo(() => {
    const lockedCandidates = catalogue
      .filter(item => item.active && (profile.inventory[item.id] ?? 0) === 0 && item.requirement.achievement)
      .map(item => ({
        name: SHOP_CATALOGUE[item.id]?.name ?? item.id,
        ratio: progressByAchievement[item.requirement.achievement!]?.ratio ?? 0,
      }));
    return computeCoachLine({
      dailyPlan: getDailyPlan(),
      hasStreakFreeze: hasStreakFreeze(),
      streakDays: profile.streak_days,
      daysUntilExam: daysUntilExam(getCoachProfile()),
      lockedCandidates,
    });
  }, [catalogue, profile.inventory, profile.streak_days, progressByAchievement]);

  useEffect(() => {
    if (tab !== 'locker' || !user) return;
    setTransactionsLoading(true);
    getTransactionHistory(user.id)
      .then(setTransactions)
      .finally(() => setTransactionsLoading(false));
  }, [tab, user]);

  async function handlePurchase(item: ShopItem) {
    setPendingId(item.id);
    setErrorById(prev => ({ ...prev, [item.id]: '' }));
    try {
      const result = await purchase(item.id, makeIdempotencyKey());
      dispatch({ type: 'SET_ECONOMY', balance: result.balance, inventory: { ...profile.inventory, [item.id]: result.qty ?? 1 } });
      setDetailItemId(null);
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
      setJustEquippedSlot(slot);
      setTimeout(() => setJustEquippedSlot(null), 700);
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

  // Streak Repair (Shop plan §14.4): synchronous, mirroring Streak Freeze's
  // consumeItem path — the streak effect is local, the RPC payment fires
  // without blocking. Reconciles profile.inventory/streak_days directly since
  // this bypasses SET_ECONOMY (no purchase_shop_item round-trip to await).
  function handleRepairStreak() {
    if (!repairStreak()) return;
    dispatch({
      type: 'SET_PROFILE',
      profile: {
        ...profile,
        streak_days: getStreakCount(),
        inventory: { ...profile.inventory, streak_repair: Math.max(0, (profile.inventory['streak_repair'] ?? 1) - 1) },
      },
    });
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
          coachLine={coachLine}
          flyingSlot={justEquippedSlot}
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
            <span className={`relative z-10 ${tab === t.id ? 'text-violet-300' : 'text-ink-muted'}`}>{t.label}</span>
          </button>
        ))}
      </motion.div>

      {tab === 'locker' && (
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-ink-muted">
            Collection · {ownedCount}/{itemsByTab.locker.length}
          </p>
        </motion.div>
      )}

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <AnimatePresence mode="popLayout">
          {activeItems.map(item => {
            const owned = (profile.inventory[item.id] ?? 0) > 0;
            const unlocked = !item.requirement.achievement || unlockedAchievementIds.has(item.requirement.achievement);
            return (
              <motion.div key={item.id} variants={fadeUp} layout>
                <ShopItemCard
                  item={item}
                  owned={owned}
                  qty={profile.inventory[item.id] ?? 0}
                  equipped={
                    item.kind === 'avatar' ? profile.equipped.avatar === item.id
                    : item.kind === 'frame' ? profile.equipped.frame === item.id
                    : item.kind === 'nameplate' ? profile.equipped.nameplate === item.id
                    : false
                  }
                  balance={profile.gems}
                  unlocked={unlocked}
                  progress={item.requirement.achievement ? progressByAchievement[item.requirement.achievement] : undefined}
                  silhouette={tab === 'locker' && !owned}
                  pending={pendingId === item.id}
                  error={errorById[item.id]}
                  onPurchase={() => handlePurchase(item)}
                  onEquip={slot => handleEquip(item, slot)}
                  onUnequip={slot => handleUnequip(slot)}
                  canRepairStreak={item.id === 'streak_repair' ? canRepairStreak() : undefined}
                  onRepairStreak={item.id === 'streak_repair' ? handleRepairStreak : undefined}
                  flying={
                    justEquippedSlot === item.kind &&
                    (item.kind === 'avatar' ? profile.equipped.avatar === item.id
                    : item.kind === 'frame' ? profile.equipped.frame === item.id
                    : item.kind === 'nameplate' ? profile.equipped.nameplate === item.id
                    : false)
                  }
                  onOpenDetail={() => setDetailItemId(item.id)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        {activeItems.length === 0 && (
          <motion.div variants={fadeUp} className="col-span-full">
            <Card variant="subtle" className="text-center py-10">
              <p className="text-sm text-ink-muted font-bold">Nothing here yet.</p>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {tab === 'locker' && (
        <motion.div variants={fadeUp}>
          <Card variant="subtle">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted mb-2">Transaction history</p>
            <TransactionList events={transactions} loading={transactionsLoading} />
          </Card>
        </motion.div>
      )}

      {detailItemId && (() => {
        const item = catalogue.find(i => i.id === detailItemId);
        if (!item) return null;
        const owned = (profile.inventory[item.id] ?? 0) > 0;
        const unlocked = !item.requirement.achievement || unlockedAchievementIds.has(item.requirement.achievement);
        return (
          <ItemDetailSheet
            item={item}
            owned={owned}
            balance={profile.gems}
            unlocked={unlocked}
            progress={item.requirement.achievement ? progressByAchievement[item.requirement.achievement] : undefined}
            pending={pendingId === item.id}
            error={errorById[item.id]}
            onClose={() => setDetailItemId(null)}
            onPurchase={() => handlePurchase(item)}
          />
        );
      })()}
    </PageShell>
  );
}

function ShopHeader({
  balance,
  equipped,
  catalogue,
  username,
  shake,
  coachLine,
  flyingSlot,
}: {
  balance: number;
  equipped: { avatar: string | null; frame: string | null; nameplate: string | null };
  catalogue: ShopItem[];
  username?: string;
  shake: boolean;
  coachLine: string | null;
  /** Shop plan §6/§12.7: which slot (if any) just equipped, so the header preview shares a layoutId with the card it flew home from. */
  flyingSlot: EquipSlot | null;
}) {
  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <motion.div layoutId={flyingSlot ? `equip-home-${flyingSlot}` : undefined}>
          <CosmeticPreview
            avatarEmoji={null}
            frameItemId={equipped.frame}
            nameplateItemId={equipped.nameplate}
            catalogue={catalogue}
            username={username}
            size={48}
          />
        </motion.div>
        <GemBalance balance={balance} shake={shake} />
      </div>
      <AnimatePresence>
        {coachLine && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative text-xs font-bold text-ink-muted mt-3"
          >
            {coachLine}
          </motion.p>
        )}
      </AnimatePresence>
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
  progress,
  silhouette,
  pending,
  error,
  onPurchase,
  onEquip,
  onUnequip,
  canRepairStreak,
  onRepairStreak,
  flying,
  onOpenDetail,
}: {
  item: ShopItem;
  owned: boolean;
  qty: number;
  equipped: boolean;
  balance: number;
  unlocked: boolean;
  /** Live progress toward this item's requirement (Shop plan §15 Phase 5). Undefined for no-requirement items. */
  progress?: { ratio: number; label: string };
  /** Locker collection grid: full-opacity outline for an unowned item, advertising real progress (§3–4, §11 H). */
  silhouette?: boolean;
  pending: boolean;
  error?: string;
  onPurchase: () => void;
  onEquip: (slot: EquipSlot) => void;
  onUnequip: (slot: EquipSlot) => void;
  /** streak_repair only: whether the 48h repair window is currently open (§14.4). */
  canRepairStreak?: boolean;
  onRepairStreak?: () => void;
  /** §6/§12.7: true for the moment right after this exact item was equipped — shares a layoutId with the header preview so the ring visibly flies home. */
  flying?: boolean;
  /** §8/§13: opens the mobile bottom sheet for this item. No-op target on desktop (sheet is md:hidden). */
  onOpenDetail?: () => void;
}) {
  const entry = SHOP_CATALOGUE[item.id];
  const rarity = rarityOf(item);
  const canAfford = balance >= item.priceGems;
  const isEquippable = item.kind === 'avatar' || item.kind === 'frame' || item.kind === 'nameplate';

  return (
    <motion.div whileHover={{ scale: 1.01, y: -2 }}>
      <Card variant="default" className={`h-full flex flex-col gap-3 ${silhouette ? 'opacity-50' : ''}`}>
        <div className="flex items-start justify-between">
          <motion.div layoutId={flying ? `equip-home-${item.kind}` : undefined}>
            <RarityRing rarity={rarity} size={48}>
              <div className="w-11 h-11 rounded-full bg-navy-300 flex items-center justify-center text-2xl">
                {entry?.icon || '✨'}
              </div>
            </RarityRing>
          </motion.div>
          {rarity !== 'common' && (
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: RARITY_COLOR[rarity] }}
            >
              {rarity}
            </span>
          )}
        </div>

        <div className="flex-1 md:cursor-default cursor-pointer" onClick={onOpenDetail}>
          <h3 className="text-sm font-bold text-white">{entry?.name ?? item.id}</h3>
          <p className="text-xs text-ink-muted mt-0.5">{entry?.description ?? ''}</p>
          {entry?.requirementLabel && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-subtle mt-1.5 flex items-center gap-1">
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
                  : 'bg-white/5 text-ink-muted hover:bg-white/10 border border-white/10'
              }`}
            >
              {pending ? <RefreshCw size={12} className="animate-spin" /> : equipped ? <Check size={12} /> : null}
              {equipped ? 'Equipped' : 'Equip'}
            </button>
          ) : item.id === 'streak_repair' && canRepairStreak ? (
            <button
              onClick={onRepairStreak}
              className="w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
            >
              Repair Streak{qty > 1 ? ` (${qty})` : ''}
            </button>
          ) : (
            <div className="w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest text-center bg-white/5 text-ink-muted border border-white/10">
              Owned{qty > 1 ? ` × ${qty}` : ''}
            </div>
          )
        ) : (
          <button
            disabled={pending || !unlocked}
            onClick={onPurchase}
            className={`w-full py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 ${
              !unlocked
                ? 'bg-white/5 text-ink-subtle cursor-not-allowed'
                : canAfford
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-white/5 text-ink-muted border border-white/10'
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
        {!owned && unlocked && !canAfford && (
          <p className="text-[9px] font-bold text-ink-subtle text-center -mt-1">
            ≈{Math.max(1, Math.ceil((item.priceGems - balance) / AVG_GEMS_PER_SESSION))} more session
            {Math.ceil((item.priceGems - balance) / AVG_GEMS_PER_SESSION) === 1 ? '' : 's'}
          </p>
        )}
      </Card>
    </motion.div>
  );
}
