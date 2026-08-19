import { describe, it, expect } from 'vitest';
import { deriveAbility, coldStart } from '../deriveAbility';
import { demandNodeId } from '../../demand/nodeId';
import {
  DEMAND_ANCHORS,
  MIN_DEMAND_CONFIDENCE,
  RELIABLE_CONFIDENCE,
  MASTERY_WEAK,
  MASTERY_STRONG,
  COLD_START_SEED,
  COLD_START_DEFAULT_SEED,
} from '../thresholds';
import type { EvidenceBeliefSnapshot, DemandBelief } from '../../../../types/beliefs';
import type { CognitiveDemand } from '../../demand/types';

function belief(overrides: Partial<DemandBelief> = {}): DemandBelief {
  return {
    nodeId: 'demand:justify',
    mastery: 0.5,
    confidence: 0.6,
    rawEvidenceCount: 3,
    lastObservedAt: new Date().toISOString(),
    ...overrides,
  };
}

function snapshot(demands: Record<string, DemandBelief>): EvidenceBeliefSnapshot {
  return {
    learnerId: 'local-user',
    generatedAt: new Date().toISOString(),
    reducerVersion: 'evidence-v4',
    skills: {},
    weakestSkillIds: [],
    strongestSkillIds: [],
    totalEvidenceProcessed: 0,
    demands,
  };
}

describe('deriveAbility — cold start', () => {
  it('returns coldStart() when snapshot.demands is empty', () => {
    const result = deriveAbility(snapshot({}));
    expect(result).toEqual(coldStart(undefined));
    expect(result.overallConfidence).toBe(0);
    expect(result.measuredAnswers).toBe(0);
    expect(result.source).toBe('seeded');
  });

  it('returns coldStart() when snapshot.demands is undefined', () => {
    const snap = snapshot({});
    delete (snap as { demands?: unknown }).demands;
    const result = deriveAbility(snap);
    expect(result.source).toBe('seeded');
  });

  it('returns coldStart() when every demand node is below MIN_DEMAND_CONFIDENCE', () => {
    const result = deriveAbility(
      snapshot({ [demandNodeId('justify')]: belief({ confidence: MIN_DEMAND_CONFIDENCE - 0.01 }) }),
    );
    expect(result.source).toBe('seeded');
  });

  it('seeds from the migrated DifficultyTier per docs §6.4 table', () => {
    (Object.keys(COLD_START_SEED) as (keyof typeof COLD_START_SEED)[]).forEach((tier) => {
      expect(coldStart(tier).abilityScore).toBe(COLD_START_SEED[tier]);
    });
  });

  it('defaults to 4.5 (today\'s default) when no tier is given', () => {
    expect(coldStart(undefined).abilityScore).toBe(COLD_START_DEFAULT_SEED);
  });

  it('coldStart always has overallConfidence 0 and measuredAnswers 0', () => {
    const result = coldStart('expert');
    expect(result.overallConfidence).toBe(0);
    expect(result.measuredAnswers).toBe(0);
  });
});

describe('deriveAbility — single demand', () => {
  it('a single reliable demand at mastery 0.5 sits at its anchor (evidence_d = anchor when mastery=0.5, SPREAD=3 -> anchor - 1.5)', () => {
    // evidence_d = anchor - (1 - 0.5) * 3.0 = anchor - 1.5
    const result = deriveAbility(
      snapshot({ [demandNodeId('justify')]: belief({ mastery: 0.5, confidence: 0.6 }) }),
    );
    expect(result.abilityScore).toBeCloseTo(DEMAND_ANCHORS.justify - 1.5, 5);
    expect(result.source).toBeUndefined();
  });

  it('a single demand at mastery 1.0 evaluates to exactly its anchor (clamped to 10)', () => {
    const result = deriveAbility(
      snapshot({ [demandNodeId('describe')]: belief({ mastery: 1.0, confidence: 0.3 }) }),
    );
    expect(result.abilityScore).toBeCloseTo(DEMAND_ANCHORS.describe, 5);
  });

  it('a single demand at mastery 0.0 clamps evidence_d to 0 when anchor - SPREAD < 0', () => {
    // describe anchor 2.0, SPREAD 3.0 -> 2.0 - 3.0 = -1.0 -> clamp to 0
    const result = deriveAbility(
      snapshot({ [demandNodeId('describe')]: belief({ mastery: 0.0, confidence: 0.3 }) }),
    );
    expect(result.abilityScore).toBe(0);
  });
});

describe('deriveAbility — all five demands, confidence-weighted mean', () => {
  it('computes the confidence-weighted mean across all five demands with no cap/floor in play', () => {
    // Keep every mastery/confidence combo away from the cap/floor thresholds
    // (mastery strictly between MASTERY_WEAK and MASTERY_STRONG) so this
    // isolates step 2 from steps 3-4.
    const demands: CognitiveDemand[] = ['describe', 'explain', 'justify', 'compare', 'hypothesize'];
    const masteries = [0.5, 0.55, 0.6, 0.45, 0.5];
    const confidences = [0.3, 0.3, 0.3, 0.3, 0.3]; // below RELIABLE_CONFIDENCE -> no cap/floor candidates
    const beliefs: Record<string, DemandBelief> = {};
    demands.forEach((d, i) => {
      beliefs[demandNodeId(d)] = belief({ mastery: masteries[i], confidence: confidences[i] });
    });

    const result = deriveAbility(snapshot(beliefs));

    const points = demands.map((d, i) => ({
      anchor: DEMAND_ANCHORS[d],
      evidence: DEMAND_ANCHORS[d] - (1 - masteries[i]) * 3.0,
      weight: confidences[i],
    }));
    const expectedRaw =
      points.reduce((sum, p) => sum + p.weight * p.evidence, 0) /
      points.reduce((sum, p) => sum + p.weight, 0);

    expect(result.abilityScore).toBeCloseTo(expectedRaw, 5);
    expect(result.overallConfidence).toBeCloseTo(0.3, 5);
    expect(result.measuredAnswers).toBe(5 * 3); // rawEvidenceCount 3 per belief() default
  });
});

describe('deriveAbility — cap binds (reliably weak low demand)', () => {
  it('a reliably weak "describe" caps ability near its anchor + 0.5, even with a strong "hypothesize" reading', () => {
    const result = deriveAbility(
      snapshot({
        [demandNodeId('describe')]: belief({ mastery: MASTERY_WEAK - 0.05, confidence: RELIABLE_CONFIDENCE + 0.1 }),
        [demandNodeId('hypothesize')]: belief({ mastery: 0.95, confidence: RELIABLE_CONFIDENCE + 0.1 }),
      }),
    );
    expect(result.abilityScore).toBeCloseTo(DEMAND_ANCHORS.describe + 0.5, 5);
  });

  it('an UNRELIABLE weak demand (confidence below RELIABLE_CONFIDENCE) does NOT cap', () => {
    const result = deriveAbility(
      snapshot({
        [demandNodeId('describe')]: belief({ mastery: 0.1, confidence: RELIABLE_CONFIDENCE - 0.05 }),
        [demandNodeId('hypothesize')]: belief({ mastery: 0.9, confidence: RELIABLE_CONFIDENCE - 0.05 }),
      }),
    );
    // Neither is reliable enough to cap or floor — falls back to raw weighted mean.
    expect(result.abilityScore).toBeGreaterThan(DEMAND_ANCHORS.describe + 0.5);
  });
});

describe('deriveAbility — floor binds (reliably strong high demand)', () => {
  it('a reliably strong "hypothesize" floors ability near its anchor - 0.5, even with a weak-but-unreliable low demand', () => {
    const result = deriveAbility(
      snapshot({
        [demandNodeId('hypothesize')]: belief({ mastery: MASTERY_STRONG + 0.05, confidence: RELIABLE_CONFIDENCE + 0.1 }),
        [demandNodeId('describe')]: belief({ mastery: 0.1, confidence: RELIABLE_CONFIDENCE - 0.1 }),
      }),
    );
    expect(result.abilityScore).toBeGreaterThanOrEqual(DEMAND_ANCHORS.hypothesize - 0.5);
  });
});

describe('deriveAbility — cap vs floor conflict: cap wins', () => {
  it('when both a reliable weak demand and a reliable strong demand are present, the cap (lower) wins over the floor', () => {
    const result = deriveAbility(
      snapshot({
        [demandNodeId('describe')]: belief({ mastery: 0.1, confidence: 0.9 }), // reliable weak -> cap at anchor+0.5 = 2.5
        [demandNodeId('hypothesize')]: belief({ mastery: 0.95, confidence: 0.9 }), // reliable strong -> floor at anchor-0.5 = 7.5
      }),
    );
    // cap (2.5) < floor (7.5) would be a contradiction if floor won; cap must win.
    expect(result.abilityScore).toBeCloseTo(DEMAND_ANCHORS.describe + 0.5, 5);
    expect(result.abilityScore).toBeLessThan(DEMAND_ANCHORS.hypothesize - 0.5);
  });
});

describe('deriveAbility — sparse evidence below MIN_DEMAND_CONFIDENCE is excluded, not zeroed', () => {
  it('a demand below MIN_DEMAND_CONFIDENCE contributes 0 to overallConfidence but does not participate in the weighted mean', () => {
    const result = deriveAbility(
      snapshot({
        [demandNodeId('justify')]: belief({ mastery: 0.9, confidence: 0.8 }),
        [demandNodeId('compare')]: belief({ mastery: 0.1, confidence: MIN_DEMAND_CONFIDENCE - 0.01 }),
      }),
    );
    // Only 'justify' should drive abilityScore — 'compare' is below the confidence floor.
    const expectedEvidence = DEMAND_ANCHORS.justify - (1 - 0.9) * 3.0;
    expect(result.abilityScore).toBeCloseTo(expectedEvidence, 5);
    // overallConfidence still averages over all 5 demands, absent/sparse counting toward the denominator.
    expect(result.overallConfidence).toBeCloseTo((0.8 + (MIN_DEMAND_CONFIDENCE - 0.01)) / 5, 5);
  });
});

describe('deriveAbility — overallConfidence arithmetic', () => {
  it('averages confidence over exactly 5 demands, absent demands counting as 0', () => {
    const result = deriveAbility(
      snapshot({ [demandNodeId('justify')]: belief({ confidence: 0.9, mastery: 0.5 }) }),
    );
    expect(result.overallConfidence).toBeCloseTo(0.9 / 5, 5);
  });

  it('clamps to [0, 1]', () => {
    const demands: CognitiveDemand[] = ['describe', 'explain', 'justify', 'compare', 'hypothesize'];
    const beliefs: Record<string, DemandBelief> = {};
    demands.forEach((d) => {
      beliefs[demandNodeId(d)] = belief({ confidence: 1.0, mastery: 0.5 });
    });
    const result = deriveAbility(snapshot(beliefs));
    expect(result.overallConfidence).toBe(1);
  });
});

describe('deriveAbility — measuredAnswers', () => {
  it('sums rawEvidenceCount across all demand:* nodes, including ones below MIN_DEMAND_CONFIDENCE', () => {
    const result = deriveAbility(
      snapshot({
        [demandNodeId('justify')]: belief({ confidence: 0.8, mastery: 0.5, rawEvidenceCount: 4 }),
        [demandNodeId('compare')]: belief({ confidence: 0.05, mastery: 0.5, rawEvidenceCount: 2 }),
      }),
    );
    expect(result.measuredAnswers).toBe(6);
  });
});
