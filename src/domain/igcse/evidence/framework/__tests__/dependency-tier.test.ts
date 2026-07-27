import { describe, expect, it } from 'vitest';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from '../../__tests__/fixtures';
import type { Detector } from '../detector';
import { LEGACY_DETECTORS } from '../legacyDetectors';
import { DetectorGraphError, DetectorRegistry } from '../registry';
import { runDetectors } from '../runner';

describe('tier-DAG rules (§9.1)', () => {
  it('every registered detector declares dependsOn targets strictly lower than its own tier', () => {
    const registry = new DetectorRegistry(LEGACY_DETECTORS);
    for (const detector of registry.list()) {
      for (const depId of detector.dependsOn) {
        const dep = registry.get(depId);
        expect(dep).toBeDefined();
        expect(dep!.tier).toBeLessThan(detector.tier);
      }
    }
  });

  it('a 3-tier chain (0 -> 1 -> 2) runs in dependency order and all succeed', () => {
    const order: string[] = [];
    const tier0: Detector = {
      id: 't0',
      version: '1',
      tier: 0,
      dependsOn: [],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => {
        order.push('t0');
        return [];
      },
    };
    const tier1: Detector = {
      id: 't1',
      version: '1',
      tier: 1,
      dependsOn: ['t0'],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => {
        order.push('t1');
        return [];
      },
    };
    const tier2: Detector = {
      id: 't2',
      version: '1',
      tier: 2,
      dependsOn: ['t1'],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => {
        order.push('t2');
        return [];
      },
    };

    const registry = new DetectorRegistry([tier2, tier0, tier1]);
    const result = runDetectors(registry, { transcript: EVIDENCE_GOLDEN_TRANSCRIPT, questionSet: null });

    expect(order).toEqual(['t0', 't1', 't2']);
    expect(result.detectorRuns.every((r) => r.state === 'success')).toBe(true);
  });

  it('a tier-2 detector cannot depend on another tier-2 detector', () => {
    const a: Detector = {
      id: 'a',
      version: '1',
      tier: 2,
      dependsOn: [],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => [],
    };
    const b: Detector = {
      id: 'b',
      version: '1',
      tier: 2,
      dependsOn: ['a'],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => [],
    };
    expect(() => new DetectorRegistry([a, b])).toThrow(DetectorGraphError);
  });

  it('a tier-1 detector cannot depend on a tier-2 detector (upward edge)', () => {
    const tier2: Detector = {
      id: 'agg',
      version: '1',
      tier: 2,
      dependsOn: [],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => [],
    };
    const tier1: Detector = {
      id: 'feature',
      version: '1',
      tier: 1,
      dependsOn: ['agg'],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => [],
    };
    expect(() => new DetectorRegistry([tier2, tier1])).toThrow(DetectorGraphError);
  });

  it('rejects a longer cycle (a -> b -> c -> a) even if declared tiers momentarily look decreasing pairwise', () => {
    // Constructing a true cycle is impossible without breaking the tier rule
    // (§9.1: a cycle would require an equal-or-upward edge). This test
    // documents that guarantee: any attempt to wire a cycle is caught by the
    // per-edge tier check, never reaching the runner's defensive sort.
    const a: Detector = {
      id: 'a',
      version: '1',
      tier: 0,
      dependsOn: ['c'],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => [],
    };
    const b: Detector = {
      id: 'b',
      version: '1',
      tier: 1,
      dependsOn: ['a'],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => [],
    };
    const c: Detector = {
      id: 'c',
      version: '1',
      tier: 2,
      dependsOn: ['b'],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => [],
    };
    expect(() => new DetectorRegistry([a, b, c])).toThrow(DetectorGraphError);
  });
});
