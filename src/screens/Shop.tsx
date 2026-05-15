import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Gem,
  Zap,
  ArrowLeft,
  CheckCircle2,
  Flame,
  Clock,
  Package,
  Timer,
  ChevronRight,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { SHOP_ITEMS, ShopItem } from '../data/shopItems';
import { PageShell } from '../components/layout/PageShell';
import { fadeUp } from '../components/motion/variants';
import { purchaseItem, activateBooster, getProgressionState } from '../services/progression/progressionService';

type Tab = 'featured' | 'powerups' | 'cosmetics' | 'inventory';

export function Shop() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('featured');
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState('04:12:35');

  // Dynamic timer for Daily Deal
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeftStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ensure shop data is perfectly synced with localStorage on entry
  useEffect(() => {
    const progression = getProgressionState();
    const needsSync = progression.gems !== profile.gems || 
                     JSON.stringify(progression.inventory) !== JSON.stringify(profile.inventory) ||
                     progression.xp !== profile.total_xp;
    
    if (needsSync) {
      dispatch({ 
        type: 'SET_PROFILE', 
        profile: { 
          ...profile, 
          gems: progression.gems, 
          inventory: progression.inventory,
          total_xp: progression.xp,
          current_level: progression.level.name as any,
          activeBoosters: progression.activeBoosters
        } 
      });
    }
  }, []);

  const ownedCount = (id: string) => profile.inventory[id] || 0;

  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case 'powerups':
        return SHOP_ITEMS.filter(item => item.category === 'powerup' || item.category === 'streak' || item.category === 'unlock');
      case 'cosmetics':
        return SHOP_ITEMS.filter(item => item.category === 'cosmetic');
      case 'inventory':
        return SHOP_ITEMS.filter(item => ownedCount(item.id) > 0);
      default:
        return SHOP_ITEMS;
    }
  }, [activeTab, profile.inventory]);

  const handlePurchase = (item: ShopItem) => {
    if (profile.gems < item.cost) {
      // Custom shake animation or toast would be better here
      return;
    }

    if (purchaseItem(item.id, item.cost)) {
      dispatch({ type: 'PURCHASE_ITEM', cost: item.cost, itemId: item.id });
      setPurchaseSuccess(item.name);
      triggerPurchaseConfetti();
      setTimeout(() => setPurchaseSuccess(null), 3000);
    }
  };

  const handleActivate = (item: ShopItem) => {
    if (ownedCount(item.id) <= 0) return;

    // Generic booster activation for items with specific logic
    const durationMap: Record<string, number> = {
      'xp_boost': 15,
      'double_gems': 1440,
      'time_warp': 10,
    };

    const multiplierMap: Record<string, number> = {
      'xp_boost': 2,
      'double_gems': 2,
    };

    const duration = durationMap[item.id] || 60;
    const multiplier = multiplierMap[item.id] || 1;

    if (activateBooster(item.id, duration, multiplier)) {
      dispatch({ type: 'ACTIVATE_BOOSTER', itemId: item.id, durationMinutes: duration, multiplier });
      triggerBoosterConfetti();
    }
  };

  const triggerPurchaseConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7'],
    });
  };

  const triggerBoosterConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
    });
  };

  return (
    <PageShell maxWidth="xl">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag size={14} className="text-violet-400" />
              <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">Marketplace</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">XP Shop</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.div 
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl glass border-emerald-500/20 shadow-lg shadow-emerald-500/5"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Gem size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">Your Gems</p>
              <p className="text-xl font-black text-white leading-none">{profile.gems.toLocaleString()}</p>
            </div>
          </motion.div>
          
          <button className="w-12 h-12 rounded-2xl glass border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90">
            <Info size={20} />
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/5 self-start overflow-x-auto no-scrollbar">
        {(['featured', 'powerups', 'cosmetics', 'inventory'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="shop-tab-bg"
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-600/20"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'featured' && (
          <motion.div 
            key="featured"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Daily Deal Hero */}
            <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 border border-white/5 shadow-2xl">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-600/10 rounded-full blur-[100px] -ml-24 -mb-24" />
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8 md:p-12 flex flex-col justify-center text-left">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
                      <Clock size={12} className="text-amber-400" />
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Limited Time</span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center gap-1.5">
                      <Flame size={12} className="text-rose-400" />
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Daily Deal</span>
                    </div>
                  </div>

                  <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                    Legendary <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Gem Magnet</span>
                  </h2>
                  <p className="text-slate-400 text-lg mb-8 max-w-md leading-relaxed">
                    Maximize your earnings with the double gem magnet. Earn 2x gems for every practice session for the next 24 hours!
                  </p>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handlePurchase(SHOP_ITEMS.find(i => i.id === 'double_gems')!)}
                      className="px-10 py-4 bg-white text-slate-900 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                    >
                      GET FOR 2,000
                    </button>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ends In</span>
                      <span className="text-xl font-black text-white">04:12:35</span>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex items-center justify-center p-12 relative">
                  <motion.div 
                    className="w-64 h-64 bg-white/5 rounded-full border border-white/10 flex items-center justify-center text-9xl relative"
                    animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                    🧲
                    <motion.div 
                      className="absolute -top-4 -right-4 w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center text-4xl shadow-2xl border-4 border-slate-900"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      💎
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Featured Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Featured Items</h3>
                <button onClick={() => setActiveTab('powerups')} className="text-xs font-bold text-violet-400 hover:text-white transition-colors flex items-center gap-1 group">
                  VIEW ALL <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SHOP_ITEMS.slice(0, 3).map((item) => (
                  <ShopItemCard key={item.id} item={item} onPurchase={handlePurchase} onActivate={handleActivate} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab !== 'featured' && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <ShopItemCard key={item.id} item={item} onPurchase={handlePurchase} onActivate={handleActivate} />
              ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-slate-700">
                  <Package size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Nothing here yet</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">Visit the shop to discover amazing items and power-ups!</p>
                </div>
                <button 
                  onClick={() => setActiveTab('featured')}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-all"
                >
                  GO SHOPPING
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {purchaseSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="px-6 py-4 bg-emerald-500 text-white rounded-[1.5rem] shadow-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest leading-none mb-1 text-emerald-100">Purchase Successful</p>
                <p className="text-lg font-black leading-none">{purchaseSuccess}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center py-12">
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
          All items are virtual goods • Non-refundable • Happy Learning!
        </p>
      </div>
    </PageShell>
  );
}

function ShopItemCard({ item, onPurchase, onActivate }: { 
  item: ShopItem, 
  onPurchase: (item: ShopItem) => void,
  onActivate: (item: ShopItem) => void 
}) {
  const { state } = useApp();
  const { profile } = state;
  const count = profile.inventory[item.id] || 0;
  const active = (profile.activeBoosters || []).some(b => b.id === item.id && new Date(b.expiresAt) > new Date());
  
  const rarity = useMemo(() => {
    switch (item.rarity) {
      case 'common': return { text: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', shadow: 'shadow-slate-500/5' };
      case 'rare': return { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', shadow: 'shadow-blue-500/10' };
      case 'epic': return { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', shadow: 'shadow-purple-500/15' };
      case 'legendary': return { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', shadow: 'shadow-amber-500/20' };
      default: return { text: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', shadow: 'shadow-slate-500/5' };
    }
  }, [item.rarity]);

  const canAfford = profile.gems >= item.cost;

  return (
    <motion.div
      variants={fadeUp}
      className={`group relative overflow-hidden rounded-[2rem] glass-elevated border-white/5 p-6 transition-all duration-500 ${rarity.shadow} hover:border-white/20`}
      whileHover={{ y: -8 }}
    >
      {/* Rarity Badge */}
      <div className="absolute top-0 right-0 p-5">
        <div className={`px-2.5 py-1 rounded-full ${rarity.bg} ${rarity.border} border`}>
          <span className={`text-[8px] font-black uppercase tracking-widest ${rarity.text}`}>
            {item.rarity}
          </span>
        </div>
      </div>

      <div className="flex flex-col h-full">
        {/* Icon & Title */}
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform duration-500">
            {item.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-white font-black text-xl leading-tight group-hover:text-violet-400 transition-colors">{item.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.category}</span>
              {count > 0 && (
                <>
                  <div className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Owned: {count}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">
          {item.description}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onPurchase(item)}
            disabled={!canAfford}
            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black transition-all ${
              canAfford 
                ? 'bg-white text-slate-900 hover:bg-emerald-400 hover:text-emerald-950 active:scale-95 shadow-xl shadow-white/5' 
                : 'bg-white/5 text-slate-700 cursor-not-allowed border border-white/5'
            }`}
          >
            <Gem size={16} className={canAfford ? 'text-emerald-600' : 'text-slate-800'} />
            {item.cost.toLocaleString()}
          </button>

          {count > 0 && (
            <button
              onClick={() => onActivate(item)}
              disabled={active}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase italic tracking-widest transition-all ${
                active
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-600/20 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {active ? (
                <>
                  <Timer size={14} className="animate-spin-slow" />
                  BOOSTER ACTIVE
                </>
              ) : (
                <>
                  <Zap size={14} />
                  ACTIVATE ITEM
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Decorative Gradient */}
      <div className={`absolute -bottom-12 -right-12 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-700 ${rarity.bg}`} />
    </motion.div>
  );
}
