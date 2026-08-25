import { getScenario, isAuthored } from './scenarios/registry';
import { getBestCompletionRatio, isUnlocked } from '../features/roleplay/scenarioProgress';

export interface TreeNode {
  id: string;
  title: string;
  icon: string;
  category: string;
  difficulty: number;
  unlocked: boolean;
  mastery: number;
  dependencies: string[];
}

interface TreeNodeStructure {
  id: string;
  title: string;
  icon: string;
  category: string;
  difficulty: number;
  dependencies: string[];
}

/**
 * Structural/presentation data (title, icon, category, dependencies) for the
 * scenarios the Explore tree displays.
 *
 * Stage 8 of the Explore/Roleplay overhaul plan calls for `exploreTree.ts` to
 * become "a selector over the registry + progress," with domain fields
 * (tier/category/dependencies) owned by registry meta. That is only possible
 * for scenarios the registry has real meta for — today, `bakery` and
 * `hairdresser` (Stage 1's two exemplars). The other 28 scenario ids are
 * still `emptyMeta()` stubs carrying no title/category/dependency data (Stage
 * 9 content authoring hasn't run yet). `resolveNode` below prefers registry
 * meta whenever `isAuthored(id)` is true and falls back to this table
 * otherwise, so each entry here becomes harmless dead weight — and is safe to
 * delete — the moment Stage 9 authors that scenario's real `.meta.ts`.
 *
 * `unlocked` and `mastery` are NOT stored here (that was the actual Stage 8
 * bug — frozen literals that never changed while playing); both are computed
 * live in `resolveNode` from `scenarioProgress`.
 */
const TREE_STRUCTURE: Record<string, TreeNodeStructure[]> = {
  tier1: [
    { id: 'bakery', title: 'Bakery', icon: '🥖', category: 'Basics', difficulty: 1, dependencies: [] },
    { id: 'cafe', title: 'Cafe', icon: '☕', category: 'Basics', difficulty: 1, dependencies: [] },
    { id: 'market', title: 'Market', icon: '🛒', category: 'Basics', difficulty: 1, dependencies: [] },
    { id: 'store', title: 'Store', icon: '🛍️', category: 'Basics', difficulty: 1, dependencies: [] },
  ],
  tier2: [
    { id: 'bank', title: 'Bank', icon: '🏦', category: 'Services', difficulty: 2, dependencies: ['bakery', 'cafe'] },
    { id: 'post_office', title: 'Post Office', icon: '📮', category: 'Services', difficulty: 2, dependencies: ['market', 'store'] },
    { id: 'pharmacy', title: 'Pharmacy', icon: '💊', category: 'Health', difficulty: 2, dependencies: ['market'] },
    { id: 'bookstore', title: 'Bookstore', icon: '📚', category: 'Services', difficulty: 2, dependencies: ['store'] },
  ],
  tier3: [
    { id: 'gare', title: 'Train Station', icon: '🚉', category: 'Travel', difficulty: 2, dependencies: ['bank'] },
    { id: 'hotel', title: 'Hotel', icon: '🏨', category: 'Travel', difficulty: 2, dependencies: ['post_office'] },
    { id: 'cinema', title: 'Cinema', icon: '🎬', category: 'Leisure', difficulty: 2, dependencies: ['post_office'] },
    { id: 'gym', title: 'Gym', icon: '💪', category: 'Leisure', difficulty: 2, dependencies: ['pharmacy'] },
  ],
  tier4: [
    { id: 'airport', title: 'Airport', icon: '✈️', category: 'Travel', difficulty: 3, dependencies: ['gare', 'hotel'] },
    { id: 'museum', title: 'Museum', icon: '🏛️', category: 'Leisure', difficulty: 3, dependencies: ['cinema'] },
    { id: 'doctor', title: 'Doctor', icon: '🏥', category: 'Health', difficulty: 3, dependencies: ['pharmacy'] },
    { id: 'restaurant', title: 'Restaurant', icon: '🍽️', category: 'Leisure', difficulty: 3, dependencies: ['hotel'] },
  ],
  tier5: [
    { id: 'job_interview', title: 'Job Interview', icon: '💼', category: 'Professional', difficulty: 4, dependencies: ['airport', 'museum'] },
    { id: 'real_estate', title: 'Real Estate', icon: '🏠', category: 'Professional', difficulty: 4, dependencies: ['hotel', 'bank'] },
    { id: 'police_station', title: 'Police Station', icon: '👮', category: 'Safety', difficulty: 4, dependencies: ['doctor'] },
    // Stage 1's deep exemplar — fully authored (graph + meta + deck) but had
    // no Explore-tree node at all until this stage, making it unreachable
    // except by a direct /scenario/hairdresser link. tier/category/deps below
    // are read from its real registry meta via resolveNode, not this literal.
    { id: 'hairdresser', title: 'Hairdresser', icon: '💇', category: 'Services', difficulty: 4, dependencies: ['bank'] },
  ],
};

function resolveNode(structure: TreeNodeStructure): TreeNode {
  const authored = isAuthored(structure.id);
  const meta = authored ? getScenario(structure.id)?.meta : undefined;
  const dependencies = meta?.dependencies ?? structure.dependencies;

  return {
    id: structure.id,
    title: meta?.title ?? structure.title,
    icon: meta?.emoji ?? structure.icon,
    category: meta?.category ?? structure.category,
    difficulty: structure.difficulty,
    unlocked: isUnlocked(dependencies),
    mastery: Math.round(getBestCompletionRatio(structure.id) * 100),
    dependencies,
  };
}

/**
 * Computed fresh on every call from live `scenarioProgress` + the registry —
 * not a frozen snapshot. `unlocked` and `mastery` reflect whatever the
 * learner has actually completed; a finished session shows up the next time
 * this is called (e.g. on remount after navigating back to /explore),
 * without requiring a full page reload.
 */
export function getExploreTree(): Record<string, TreeNode[]> {
  return Object.fromEntries(
    Object.entries(TREE_STRUCTURE).map(([tier, nodes]) => [tier, nodes.map(resolveNode)]),
  );
}
