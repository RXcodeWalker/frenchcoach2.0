/**
 * deriveAbility — docs §6.2. Pure function: EvidenceBeliefSnapshot -> a
 * single deterministic ability read. No localStorage, no side effects.
 */
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';
import type { CognitiveDemand } from '../demand/types';
import type { DifficultyTier } from '../../../types';
import {
  DEMAND_ANCHORS,
  MIN_DEMAND_CONFIDENCE,
  RELIABLE_CONFIDENCE,
  MASTERY_WEAK,
  MASTERY_STRONG,
  SPREAD,
  COLD_START_SEED,
  COLD_START_DEFAULT_SEED,
} from './thresholds';
import { demandNodeId } from '../demand/nodeId';

const ALL_DEMANDS: CognitiveDemand[] = ['describe', 'explain', 'justify', 'compare', 'hypothesize'];

export interface AbilityResult {
  abilityScore: number;
  overallConfidence: number;
  measuredAnswers: number;
  /** docs §6.4 — present only for the cold-start path (no demand evidence at all yet). */
  source?: 'seeded';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** docs §6.4 — seed from the migrated tier; absent tier -> today's default (4.5). */
export function coldStart(migratedTier?: DifficultyTier): AbilityResult {
  const seed = migratedTier ? COLD_START_SEED[migratedTier] : COLD_START_DEFAULT_SEED;
  return { abilityScore: seed, overallConfidence: 0, measuredAnswers: 0, source: 'seeded' };
}

/**
 * docs §6.2. Reads `snapshot.demands` only — never skills. `migratedTier` is
 * the one-time-read `frenchCoach_difficulty` value (docs §6.4), used only for
 * the coldStart() seed when there is no demand evidence at all yet.
 */
export function deriveAbility(
  snapshot: EvidenceBeliefSnapshot,
  migratedTier?: DifficultyTier,
): AbilityResult {
  const demands = snapshot.demands ?? {};

  // overallConfidence sums over ALL 5 demands, absent counting as 0 — computed
  // independently of the MIN_DEMAND_CONFIDENCE filter below (docs §6.2 step 5).
  const overallConfidence = clamp(
    ALL_DEMANDS.reduce((sum, d) => sum + (demands[demandNodeId(d)]?.confidence ?? 0), 0) / ALL_DEMANDS.length,
    0,
    1,
  );

  // 1. Per-demand evidence point (skip absent or below MIN_DEMAND_CONFIDENCE).
  const points: { demand: CognitiveDemand; anchor: number; mastery: number; weight: number; evidence: number }[] = [];
  for (const d of ALL_DEMANDS) {
    const b = demands[demandNodeId(d)];
    if (!b || b.confidence < MIN_DEMAND_CONFIDENCE) continue;
    const anchor = DEMAND_ANCHORS[d];
    const evidence = clamp(anchor - (1 - b.mastery) * SPREAD, 0, 10);
    points.push({ demand: d, anchor, mastery: b.mastery, weight: b.confidence, evidence });
  }

  // 2. Confidence-weighted mean. No usable evidence at all -> cold start.
  const totalWeight = points.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight === 0) {
    return coldStart(migratedTier);
  }
  const raw = points.reduce((sum, p) => sum + p.weight * p.evidence, 0) / totalWeight;

  // 3. Prerequisite CAP — reliably weak LOW demand bounds everything above it.
  const capCandidates = points.filter((p) => p.weight >= RELIABLE_CONFIDENCE && p.mastery < MASTERY_WEAK);
  const weakest = capCandidates.length > 0
    ? capCandidates.reduce((min, p) => (p.anchor < min.anchor ? p : min))
    : null;
  const cap = weakest ? weakest.anchor + 0.5 : Infinity;

  // 4. FLOOR — reliably strong HIGH demand prevents underestimation.
  const floorCandidates = points.filter((p) => p.weight >= RELIABLE_CONFIDENCE && p.mastery >= MASTERY_STRONG);
  const strongest = floorCandidates.length > 0
    ? floorCandidates.reduce((max, p) => (p.anchor > max.anchor ? p : max))
    : null;
  const floor = strongest ? strongest.anchor - 0.5 : -Infinity;

  // 5. Combine. CAP WINS on conflict — conservatism (docs §6.2 "why cap-wins").
  const abilityScore = clamp(Math.min(Math.max(raw, floor), cap), 0, 10);

  const measuredAnswers = ALL_DEMANDS.reduce(
    (sum, d) => sum + (demands[demandNodeId(d)]?.rawEvidenceCount ?? 0),
    0,
  );

  return { abilityScore, overallConfidence, measuredAnswers };
}
