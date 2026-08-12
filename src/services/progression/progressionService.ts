// Copied verbatim from progression.js — strips DOM calls, keeps XP/level logic
import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { computeXPGain, computeParticipationXPGain } from '../../domain/xp';
import { evaluateAchievements, type AchievementContext } from '../../data/achievements';
import { logXpEvent } from '../social/xpLedger';
import { enqueueMint } from '../shop/mintQueue';
import { consume, makeIdempotencyKey } from '../shop/shopService';
import type { XpSource } from '../../types/social';
const KEY = STORAGE_KEYS.progression;
const NEEDS_SYNC_KEY = 'frenchCoach_needsSync';

export function markNeedsSync() { try { localStorage.setItem(NEEDS_SYNC_KEY, '1'); } catch { /* storage unavailable — degrade silently */ } }
export function clearNeedsSync() { try { localStorage.removeItem(NEEDS_SYNC_KEY); } catch { /* storage unavailable — degrade silently */ } }
export function hasPendingSync(): boolean { return localStorage.getItem(NEEDS_SYNC_KEY) === '1'; }

export interface ProgressionData {
  xp: number; totalXP: number; gems: number; achievements: string[];
  inventory: Record<string, number>;
  activeBoosters: { id: string; expiresAt: string; multiplier: number }[];
  grammarCoachUses: number; roleplayCount: number;
}

function _load(): ProgressionData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { 
      xp: 0, totalXP: 0, gems: 0, achievements: [], 
      inventory: {}, activeBoosters: [], grammarCoachUses: 0, roleplayCount: 0, ...JSON.parse(raw) 
    } : { xp: 0, totalXP: 0, gems: 0, achievements: [], inventory: {}, activeBoosters: [], grammarCoachUses: 0, roleplayCount: 0 };
  } catch { return { xp: 0, totalXP: 0, gems: 0, achievements: [], inventory: {}, activeBoosters: [], grammarCoachUses: 0, roleplayCount: 0 }; }
}

function _save(data: ProgressionData) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota exceeded — degrade silently */ }
}

const LEVELS = [
  { name: "Beginner",     minXP: 0,    color: "#10B981" },
  { name: "Intermediate", minXP: 500,  color: "#6366F1" },
  { name: "Advanced",     minXP: 1500, color: "#F59E0B" },
  { name: "Expert",       minXP: 3500, color: "#EF4444" },
  { name: "Beast Mode",   minXP: 7000, color: "#7C3AED" },
];

export function levelFor(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return { ...LEVELS[i], index: i };
  }
  return { ...LEVELS[0], index: 0 };
}

function _levelFor(xp: number) { return levelFor(xp); }

function _progressPct(xp: number) {
  const lvl = _levelFor(xp);
  if (lvl.index === LEVELS.length - 1) return 100;
  const next = LEVELS[lvl.index + 1];
  return Math.min(100, Math.round(((xp - lvl.minXP) / (next.minXP - lvl.minXP)) * 100));
}

export function awardXP(score: number, streak = 0, source: XpSource = 'practice'): { gain: number; totalXP: number; gemsGain: number; totalGems: number; levelUp: boolean; activeBoosters: { id: string; expiresAt: string; multiplier: number }[] } {
  const data = _load();
  const prevXP = data.xp;
  const prevLevel = _levelFor(prevXP);

  const base = computeXPGain(score, streak);
  let gain = base.gain;

  // Apply multipliers from active boosters
  const now = new Date().toISOString();
  const validBoosters = (data.activeBoosters || []).filter(b => b.expiresAt > now);
  validBoosters.forEach(b => {
    gain = Math.round(gain * b.multiplier);
  });
  data.activeBoosters = validBoosters;

  const gemsGain = Math.floor(gain / 10) + (score >= 8 ? 5 : 0);

  data.xp      = prevXP + gain;
  data.totalXP = (data.totalXP || 0) + gain;
  // Provisional display value only — gem_events/mint_gems is the balance
  // authority (Shop plan §14.1). Reconciled against the server balance on
  // the next successful mint or hydration.
  data.gems    = (data.gems || 0) + gemsGain;
  _save(data);
  markNeedsSync();
  logXpEvent(gain, source, { score, streak });
  if (gemsGain > 0) enqueueMint(gemsGain);

  const newLevel = _levelFor(data.xp);
  return { gain, totalXP: data.xp, gemsGain, totalGems: data.gems, levelUp: newLevel.index > prevLevel.index, activeBoosters: data.activeBoosters };
}

/** D5: participation path for sessions with no real assessed score — never derives XP/gems from a fabricated score. */
export function awardParticipationXP(streak = 0, source: XpSource = 'practice'): { gain: number; totalXP: number; gemsGain: number; totalGems: number; levelUp: boolean; activeBoosters: { id: string; expiresAt: string; multiplier: number }[] } {
  const data = _load();
  const prevXP = data.xp;
  const prevLevel = _levelFor(prevXP);

  const base = computeParticipationXPGain(streak);
  let gain = base.gain;

  const now = new Date().toISOString();
  const validBoosters = (data.activeBoosters || []).filter(b => b.expiresAt > now);
  validBoosters.forEach(b => {
    gain = Math.round(gain * b.multiplier);
  });
  data.activeBoosters = validBoosters;

  const gemsGain = Math.floor(gain / 10);

  data.xp      = prevXP + gain;
  data.totalXP = (data.totalXP || 0) + gain;
  data.gems    = (data.gems || 0) + gemsGain;
  _save(data);
  markNeedsSync();
  logXpEvent(gain, source, { streak, participation: true });
  if (gemsGain > 0) enqueueMint(gemsGain);

  const newLevel = _levelFor(data.xp);
  return { gain, totalXP: data.xp, gemsGain, totalGems: data.gems, levelUp: newLevel.index > prevLevel.index, activeBoosters: data.activeBoosters };
}

export function awardGemsForXP(amount: number, source: XpSource): { totalXP: number; totalGems: number; activeBoosters: { id: string; expiresAt: string; multiplier: number }[] } {
  const data = _load();
  let gain = amount;

  const now = new Date().toISOString();
  const validBoosters = (data.activeBoosters || []).filter(b => b.expiresAt > now);
  validBoosters.forEach(b => {
    gain = Math.round(gain * b.multiplier);
  });
  data.activeBoosters = validBoosters;

  const gemsGain = Math.floor(gain / 10);
  data.xp = (data.xp || 0) + gain;
  data.totalXP = (data.totalXP || 0) + gain;
  data.gems = (data.gems || 0) + gemsGain;
  _save(data);
  markNeedsSync();
  logXpEvent(gain, source);
  if (gemsGain > 0) enqueueMint(gemsGain);
  return { totalXP: data.xp, totalGems: data.gems, activeBoosters: data.activeBoosters };
}

export function getProgressionState() {
  const { xp, totalXP, gems, achievements, inventory, activeBoosters } = _load();
  const level = _levelFor(xp);
  return { xp, totalXP, gems: gems || 0, level, levelProgress: _progressPct(xp), achievements, inventory: inventory || {}, activeBoosters: activeBoosters || [] };
}

// Phase 4 A9 fix (Shop plan §14.4, amended): server user_inventory
// (populated by purchase_shop_item) is the authority for whether a freeze is
// owned. analyticsService.updateStreak runs synchronously inside
// orchestrateAttempt — a contract explicitly documented as synchronous and
// relied on by Learn.tsx/ExamMode.tsx/WordDrop.tsx/DailyNewsFlash.tsx and
// sessionOrchestrator.test.ts — so it cannot await the consume_item RPC.
//
// The exactly-once guarantee lives in consume_item itself (replay-guarded,
// qty > 0 checked, single transaction) — the client does not need to await
// it to make consumption correct, only to make the *local streak decision*
// consistent. hasStreakFreeze() reads a server-reconciled snapshot
// (shopInventoryCache, written by AppContext's refetchEconomy after every
// SET_ECONOMY) rather than the stale local `inventory` JSONB. consumeItem()
// fires the RPC without awaiting and optimistically decrements that same
// cache so a second synchronous call in the same session (before the next
// hydrate) also sees qty=0.
//
// Accepted window: if the cache is stale (e.g. a freeze was already spent on
// another device and this device hasn't refetched yet), the streak can be
// preserved locally for up to one day before the next hydrate/SET_ECONOMY
// reconciles it back down. This is a display correction, not a currency
// error — no gems or inventory are actually granted by it, since qty never
// goes negative server-side and consume_item's own guard prevents a second
// real decrement.
function _loadInventoryCache(): Record<string, number> {
  return storageGet<Record<string, number>>(STORAGE_KEYS.shopInventoryCache, {});
}

export function hasStreakFreeze(): boolean {
  return hasItem('streak_freeze');
}

/** Generic server-reconciled ownership check, reused by Focus Token / Streak Repair (§15 Phase 5). */
export function hasItem(itemId: string): boolean {
  return (_loadInventoryCache()[itemId] || 0) > 0;
}

export function consumeStreakFreeze(): boolean {
  return consumeItem('streak_freeze');
}

export function consumeItem(itemId: string): boolean {
  const cache = _loadInventoryCache();
  if (!cache[itemId] || cache[itemId] <= 0) return false;

  // Optimistic local decrement so a second synchronous call this session
  // (before the next hydrate) also sees qty=0. The real decrement happens
  // server-side in consume_item; this cache write is display-only.
  storageSet(STORAGE_KEYS.shopInventoryCache, { ...cache, [itemId]: cache[itemId] - 1 });
  void consume(itemId, makeIdempotencyKey()).catch(err => {
    console.warn('[progressionService] consume_item RPC failed:', err);
  });
  return true;
}

export function unlockAchievement(id: string): boolean {
  const data = _load();
  if (!data.achievements) data.achievements = [];
  if (data.achievements.includes(id)) return false;
  data.achievements.push(id);
  _save(data);
  markNeedsSync();
  return true;
}

export function checkAchievements(context: AchievementContext): string[] {
  const alreadyUnlocked = new Set(getUnlockedAchievementIds());
  return evaluateAchievements(context, alreadyUnlocked).filter(id => unlockAchievement(id));
}

export function recordGrammarCoachUse() {
  const data = _load();
  data.grammarCoachUses = (data.grammarCoachUses || 0) + 1;
  _save(data);
}

export function recordRoleplayComplete() {
  const data = _load();
  data.roleplayCount = (data.roleplayCount || 0) + 1;
  _save(data);
}

export function getUnlockedAchievementIds(): string[] {
  return _load().achievements ?? [];
}

export function setProgressionData(data: ProgressionData): void {
  _save(data);
  markNeedsSync();
}
