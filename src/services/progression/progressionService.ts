// Copied verbatim from progression.js — strips DOM calls, keeps XP/level logic
import { STORAGE_KEYS } from '../persistence/storage';
import { computeXPGain, computeParticipationXPGain } from '../../domain/xp';
import { evaluateAchievements, type AchievementContext } from '../../data/achievements';
import { logXpEvent } from '../social/xpLedger';
import { enqueueMint } from '../shop/mintQueue';
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

// NON-AUTHORITATIVE BETWEEN PHASE 2 AND PHASE 4 (Shop plan A9/§14.4/§15).
// hasStreakFreeze/consumeStreakFreeze/consumeItem still read/write the local
// `inventory` JSONB only. Server inventory (user_inventory, populated by
// purchase_shop_item) is authoritative from Phase 1 onward, and A9 requires
// Streak Freeze consumption to call consume_item and check its result
// *before* incrementing the streak. That RPC is async; the caller here
// (analyticsService.updateStreak, invoked synchronously from recordSession,
// itself called synchronously from Learn.tsx/ExamMode.tsx/WordDrop.tsx/
// DailyNewsFlash.tsx/sessionOrchestrator.ts) is not, and making it async
// ripples through all of those call sites — out of Phase 2's stated scope
// (shopService/SET_ECONOMY/mint wiring/hydration only; see plan §15 Phase 2).
// Left as local-only by explicit decision during Phase 2 implementation.
// Do not extend this local path — Phase 4 ("Rewire Streak Freeze to server
// inventory (fixes A9)") replaces it with an async, RPC-checked call.
export function hasStreakFreeze(): boolean {
  const data = _load();
  return (data.inventory?.['streak_freeze'] || 0) > 0;
}

export function consumeStreakFreeze(): boolean {
  return consumeItem('streak_freeze');
}

export function consumeItem(itemId: string): boolean {
  const data = _load();
  if (!data.inventory || !data.inventory[itemId] || data.inventory[itemId] <= 0) return false;

  data.inventory[itemId]--;
  _save(data);
  markNeedsSync();
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
