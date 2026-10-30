// Shop (Shop plan §3–§13, Design System v2). A trophy case with a small supply
// cupboard attached: balance and your look first, one contextual line, then
// three panels — Gear (streak safety), Identity (avatars, frames, nameplates)
// and Locker (the whole collection with live progress, plus the gem ledger).
// A purchase is confirmed in the item dialog; nothing here sells with urgency.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { TopContextBar } from '../components/TopContextBar';
import { Card } from '../components/ui/Card';
import { Segmented } from '../components/ui/Segmented';
import { TransactionList } from '../components/ui/TransactionList';
import { enter, stagger } from '../components/motion/variants';
import { ItemDetail } from '../features/shop/ItemDetail';
import { ShopHeader } from '../features/shop/ShopHeader';
import { ShopItemCard } from '../features/shop/ShopItemCard';
import { CollectionBar } from '../features/shop/CollectionBar';
import { IDENTITY_SECTIONS } from '../features/shop/itemState';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useCatalogue } from '../services/shop/useCatalogue';
import { SHOP_CATALOGUE } from '../services/shop/shopCatalogue';
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
type LockerFilter = 'all' | 'owned' | 'missing';

const TABS: { id: ShopTab; label: string }[] = [
  { id: 'gear', label: 'Gear' },
  { id: 'identity', label: 'Identity' },
  { id: 'locker', label: 'Locker' },
];

const LOCKER_FILTERS: { id: LockerFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'owned', label: 'Owned' },
  { id: 'missing', label: 'Not yet' },
];

const KIND_TAB: Record<ShopItem['kind'], ShopTab> = {
  consumable: 'gear',
  avatar: 'identity',
  frame: 'identity',
  nameplate: 'identity',
};

const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3';

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
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { user } = useAuth();
  const { profile, achievements } = state;
  const catalogue = useCatalogue();
  const [tab, setTab] = useState<ShopTab>('gear');
  const [lockerFilter, setLockerFilter] = useState<LockerFilter>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<GemEvent[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  // A plain-language confirmation of the last purchase (the gem count also rolls).
  const [notice, setNotice] = useState<string | null>(null);

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

  const activeItems = useMemo(() => catalogue.filter(item => item.active), [catalogue]);
  const isOwned = useCallback((item: ShopItem) => (profile.inventory[item.id] ?? 0) > 0, [profile.inventory]);
  const isUnlocked = useCallback(
    (item: ShopItem) => !item.requirement.achievement || unlockedAchievementIds.has(item.requirement.achievement),
    [unlockedAchievementIds],
  );
  const isEquipped = useCallback(
    (item: ShopItem) =>
      item.kind === 'avatar' ? profile.equipped.avatar === item.id
      : item.kind === 'frame' ? profile.equipped.frame === item.id
      : item.kind === 'nameplate' ? profile.equipped.nameplate === item.id
      : false,
    [profile.equipped],
  );

  const gearItems = useMemo(() => activeItems.filter(i => KIND_TAB[i.kind] === 'gear'), [activeItems]);
  const ownedCount = useMemo(() => activeItems.filter(isOwned).length, [activeItems, isOwned]);

  // Locker is the full collection, owned and unowned alike (Shop plan §3–4,
  // §11 scenario H: "the empty state IS the roadmap") — owned first, never
  // filtered down to owned items unless the learner asks for that.
  const lockerItems = useMemo(() => {
    const visible = activeItems.filter(item => {
      if (lockerFilter === 'owned') return isOwned(item);
      if (lockerFilter === 'missing') return !isOwned(item);
      return true;
    });
    return [...visible].sort((a, b) => Number(isOwned(b)) - Number(isOwned(a)) || a.sortOrder - b.sortOrder);
  }, [activeItems, lockerFilter, isOwned]);

  // §9: one read-only coach line inside the Shop, resolution order
  // streak_at_risk (no freeze) > exam_soon > overdue_review > nearest unlock.
  const coachLine = useMemo(() => {
    const lockedCandidates = activeItems
      .filter(item => !isOwned(item) && item.requirement.achievement)
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
  }, [activeItems, isOwned, profile.streak_days, progressByAchievement]);

  useEffect(() => {
    if (tab !== 'locker' || !user) return;
    setTransactionsLoading(true);
    getTransactionHistory(user.id)
      .then(setTransactions)
      .finally(() => setTransactionsLoading(false));
  }, [tab, user]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const closeDetail = useCallback(() => setDetailItemId(null), []);

  async function handlePurchase(item: ShopItem) {
    setPendingId(item.id);
    setErrorById(prev => ({ ...prev, [item.id]: '' }));
    try {
      const result = await purchase(item.id, makeIdempotencyKey());
      dispatch({ type: 'SET_ECONOMY', balance: result.balance, inventory: { ...profile.inventory, [item.id]: result.qty ?? 1 } });
      setDetailItemId(null);
      const name = SHOP_CATALOGUE[item.id]?.name ?? item.id;
      setNotice(
        item.kind === 'consumable'
          ? `${name} added to your gear.`
          : `${name} is yours. Equip it from Identity or your Locker.`,
      );
    } catch (err) {
      setErrorById(prev => ({ ...prev, [item.id]: errorMessage(err) }));
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

  async function handleUnequip(item: ShopItem, slot: EquipSlot) {
    setPendingId(item.id);
    setErrorById(prev => ({ ...prev, [item.id]: '' }));
    try {
      await equip(slot, null);
      dispatch({ type: 'SET_PROFILE', profile: { ...profile, equipped: { ...profile.equipped, [slot]: null } } });
    } catch (err) {
      setErrorById(prev => ({ ...prev, [item.id]: errorMessage(err) }));
    } finally {
      setPendingId(null);
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
    setNotice('Streak repaired.');
  }

  function renderCard(item: ShopItem, recessed = false) {
    const owned = isOwned(item);
    const achievement = item.requirement.achievement;
    return (
      <motion.div key={item.id} variants={enter}>
        <ShopItemCard
          item={item}
          owned={owned}
          qty={profile.inventory[item.id] ?? 0}
          equipped={isEquipped(item)}
          balance={profile.gems}
          unlocked={isUnlocked(item)}
          progress={achievement ? progressByAchievement[achievement] : undefined}
          recessed={recessed}
          pending={pendingId === item.id && detailItemId !== item.id}
          error={detailItemId === item.id ? undefined : errorById[item.id]}
          canRepairStreak={item.id === 'streak_repair' ? canRepairStreak() : undefined}
          onOpen={() => setDetailItemId(item.id)}
          onEquip={slot => handleEquip(item, slot)}
          onUnequip={slot => handleUnequip(item, slot)}
          onRepairStreak={item.id === 'streak_repair' ? handleRepairStreak : undefined}
        />
      </motion.div>
    );
  }

  const detailItem = detailItemId ? catalogue.find(i => i.id === detailItemId) : undefined;

  return (
    <>
      <TopContextBar
        title="Shop"
        subtitle="Spend gems on streak safety and your look"
        showBack
        backLabel="Back to Explore"
        onBack={() => navigate('/explore')}
      />
      <PageShell maxWidth="xl">
        <motion.div variants={enter}>
          <ShopHeader
            balance={profile.gems}
            equipped={profile.equipped}
            catalogue={catalogue}
            username={profile.username}
            coachLine={coachLine}
          />
        </motion.div>

        {!user && (
          <motion.div variants={enter}>
            <Card variant="subtle" className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-body-s text-ink-muted">
                You are browsing as a guest. Sign in to buy items and keep your gems across devices.
              </p>
              <Link
                to="/login"
                className="inline-flex h-10 items-center rounded-control border border-hairline-strong px-3.5 text-[13px] font-semibold text-ink
                  transition-colors duration-state ease-smooth hover:bg-track"
              >
                Sign in
              </Link>
            </Card>
          </motion.div>
        )}

        <motion.div variants={enter} className="max-w-md">
          <Segmented options={TABS} value={tab} onChange={setTab} label="Shop sections" testIdPrefix="shop-tab" />
        </motion.div>

        <div aria-live="polite" className="empty:hidden">
          <AnimatePresence>
            {notice && (
              <motion.p
                key={notice}
                variants={enter}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                data-testid="shop-notice"
                className="flex items-center gap-2 rounded-control bg-progress-soft px-3 py-2.5 text-body-s font-semibold text-progress-text"
              >
                <Check size={16} aria-hidden="true" /> {notice}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {catalogue.length === 0 ? (
          <Card variant="subtle" className="py-10 text-center">
            <p className="text-body-s text-ink-muted">The shop is loading. If it stays empty, check your connection.</p>
          </Card>
        ) : (
          <motion.div key={tab} variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">
            {tab === 'gear' && (
              <section aria-label="Gear" className="flex flex-col gap-3">
                <p className="text-body-s text-ink-muted">Streak safety and practice direction. No requirements.</p>
                <div className={GRID}>{gearItems.map(item => renderCard(item))}</div>
              </section>
            )}

            {tab === 'identity' &&
              IDENTITY_SECTIONS.map(section => {
                const items = activeItems.filter(i => i.kind === section.kind);
                if (items.length === 0) return null;
                return (
                  <section key={section.kind} aria-label={section.title} className="flex flex-col gap-3">
                    <motion.div variants={enter}>
                      <h2 className="text-section text-ink">{section.title}</h2>
                      <p className="text-body-s text-ink-muted">{section.note}</p>
                    </motion.div>
                    <div className={GRID}>{items.map(item => renderCard(item))}</div>
                  </section>
                );
              })}

            {tab === 'locker' && (
              <>
                <motion.div variants={enter} className="flex flex-col gap-4">
                  <CollectionBar owned={ownedCount} total={activeItems.length} />
                  <div className="max-w-xs">
                    <Segmented
                      options={LOCKER_FILTERS}
                      value={lockerFilter}
                      onChange={setLockerFilter}
                      label="Filter your collection"
                      height={36}
                    />
                  </div>
                </motion.div>

                {lockerItems.length === 0 ? (
                  <motion.div variants={enter}>
                    <Card variant="subtle" className="py-10 text-center">
                      <p className="text-body-s text-ink-muted">
                        {lockerFilter === 'owned' ? 'You have not bought anything yet. Your first item lands here.' : 'You have collected everything.'}
                      </p>
                    </Card>
                  </motion.div>
                ) : (
                  <div className={GRID}>{lockerItems.map(item => renderCard(item, true))}</div>
                )}

                <motion.div variants={enter}>
                  <Card variant="subtle">
                    <h2 className="text-section text-ink">Gem history</h2>
                    <p className="mb-1 text-body-s text-ink-muted">Every gem in and out, listed plainly.</p>
                    <TransactionList events={transactions} loading={transactionsLoading} signedOut={!user} />
                  </Card>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {detailItem && (
          <ItemDetail
            item={detailItem}
            owned={isOwned(detailItem)}
            balance={profile.gems}
            unlocked={isUnlocked(detailItem)}
            progress={detailItem.requirement.achievement ? progressByAchievement[detailItem.requirement.achievement] : undefined}
            pending={pendingId === detailItem.id}
            error={errorById[detailItem.id]}
            signedOut={!user}
            onClose={closeDetail}
            onPurchase={() => handlePurchase(detailItem)}
          />
        )}
      </PageShell>
    </>
  );
}
