import { supabase } from '../../lib/supabase';
import type { ProgressionData } from '../progression/progressionService';
import { getProgressionState, clearNeedsSync, markNeedsSync, levelFor } from '../progression/progressionService';

export type CloudProgressionRow = {
  total_xp: number;
  gems: number;
  achievements: string[];
  inventory: Record<string, number>;
  active_boosters: { id: string; expiresAt: string; multiplier: number }[];
};

export async function pushProgressionToCloud(
  userId: string,
  data?: ProgressionData
): Promise<boolean> {
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

    const { error } = await supabase.from('profiles').upsert(
      {
        id: userId,
        total_xp: source.totalXP,
        gems: source.gems,
        achievements: source.achievements,
        inventory: source.inventory,
        active_boosters: source.activeBoosters,
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
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('total_xp, gems, achievements, inventory, active_boosters')
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
  const mergedGems = Math.max(local.gems, cloud.gems);

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
