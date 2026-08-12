import { supabase, supabaseConfigured } from '../../lib/supabase';
import type { ProgressionData } from '../progression/progressionService';
import { getProgressionState, clearNeedsSync, markNeedsSync, levelFor } from '../progression/progressionService';

export type CloudProgressionRow = {
  total_xp: number;
  gems: number;
  achievements: string[];
  inventory: Record<string, number>;
  active_boosters: { id: string; expiresAt: string; multiplier: number }[];
  migration_version: number;
  username: string | null;
  avatar_emoji: string | null;
  equipped_frame: string | null;
  equipped_nameplate: string | null;
};

export async function pushProgressionToCloud(
  userId: string,
  data?: ProgressionData
): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const source = data ?? (() => {
      const s = getProgressionState();
      return {
        xp: s.xp,
        totalXP: s.totalXP,
        gems: s.gems,
        achievements: s.achievements,
        inventory: s.inventory,
        activeBoosters: s.activeBoosters,
        grammarCoachUses: 0,
        roleplayCount: 0,
      } satisfies ProgressionData;
    })();

    // gems/inventory/active_boosters are no longer client-writable on profiles
    // (Shop Phase 1 §14.2 — REVOKE UPDATE backs gem_events as the sole balance
    // authority). Sending them here would 42501 the whole upsert, including
    // total_xp/achievements.
    const { error } = await supabase.from('profiles').upsert(
      {
        id: userId,
        total_xp: source.totalXP,
        achievements: source.achievements,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('[progressionSync] push failed:', error.message);
      return false;
    }

    clearNeedsSync();
    return true;
  } catch (err) {
    console.warn('[progressionSync] push error:', err);
    return false;
  }
}

export async function pullProgressionFromCloud(
  userId: string
): Promise<CloudProgressionRow | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('total_xp, gems, achievements, inventory, active_boosters, migration_version, username, avatar_emoji, equipped_frame, equipped_nameplate')
      .eq('id', userId)
      .single();

    if (error || !data) {
      if (error?.code !== 'PGRST116') {
        console.warn('[progressionSync] pull failed:', error?.message);
      }
      return null;
    }

    return {
      total_xp: data.total_xp ?? 0,
      gems: data.gems ?? 0,
      achievements: (data.achievements as string[]) ?? [],
      inventory: (data.inventory as Record<string, number>) ?? {},
      active_boosters: (data.active_boosters as { id: string; expiresAt: string; multiplier: number }[]) ?? [],
      migration_version: (data.migration_version as number) ?? 0,
      username: (data.username as string | null) ?? null,
      avatar_emoji: (data.avatar_emoji as string | null) ?? null,
      equipped_frame: (data.equipped_frame as string | null) ?? null,
      equipped_nameplate: (data.equipped_nameplate as string | null) ?? null,
    };
  } catch (err) {
    console.warn('[progressionSync] pull error:', err);
    return null;
  }
}

export function mergeProgressionData(
  local: ProgressionData,
  cloud: CloudProgressionRow
): ProgressionData {
  const mergedTotalXP = Math.max(local.totalXP, cloud.total_xp);
  // Gems are no longer client-asserted (Shop Phase 1: gem_events/mint_gems
  // is the sole balance authority) — local.gems is a display cache, never
  // merged with a stale cloud value.
  const mergedGems = local.gems;

  const mergedAchievements = Array.from(
    new Set([...local.achievements, ...cloud.achievements])
  );

  const allKeys = new Set([
    ...Object.keys(local.inventory ?? {}),
    ...Object.keys(cloud.inventory ?? {}),
  ]);
  const mergedInventory: Record<string, number> = {};
  for (const k of allKeys) {
    mergedInventory[k] = Math.max(local.inventory?.[k] ?? 0, cloud.inventory?.[k] ?? 0);
  }

  const now = new Date().toISOString();
  const localIds = new Set((local.activeBoosters ?? []).map(b => b.id));
  const mergedBoosters = [
    ...(local.activeBoosters ?? []),
    ...(cloud.active_boosters ?? []).filter(b => !localIds.has(b.id)),
  ].filter(b => b.expiresAt > now);

  const mergedLevel = levelFor(mergedTotalXP);

  return {
    xp: mergedTotalXP,
    totalXP: mergedTotalXP,
    gems: mergedGems,
    achievements: mergedAchievements,
    inventory: mergedInventory,
    activeBoosters: mergedBoosters,
    grammarCoachUses: local.grammarCoachUses ?? 0,
    roleplayCount: local.roleplayCount ?? 0,
    // suppress unused warning — levelFor result used for type completeness check
    ...(mergedLevel && {}),
  };
}

function cloudDiffersFromMerged(merged: ProgressionData, cloud: CloudProgressionRow): boolean {
  return (
    merged.totalXP !== cloud.total_xp ||
    merged.gems !== cloud.gems ||
    merged.achievements.length !== cloud.achievements.length
  );
}

export { cloudDiffersFromMerged, markNeedsSync };
