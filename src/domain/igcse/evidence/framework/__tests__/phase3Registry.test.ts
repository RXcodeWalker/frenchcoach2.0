/**
 * Phase 3 (§10.7 Phase 3 exit criterion): the full registered fleet — legacy
 * (5) + Phase-3 (20) — must satisfy the same tier-DAG rules as the framework
 * itself (§9.1), construct without error, and every detector must declare
 * dependsOn targets strictly lower tier than itself.
 */

import { describe, expect, it } from 'vitest';
import { LEGACY_DETECTORS } from '../legacyDetectors';
import { PHASE3_DETECTORS } from '../phase3Detectors';
import { DetectorRegistry } from '../registry';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from '../../__tests__/fixtures';
import { runDetectors } from '../runner';

const FULL_FLEET = [...LEGACY_DETECTORS, ...PHASE3_DETECTORS];

describe('Phase 3 full fleet registry', () => {
  it('constructs without a DetectorGraphError (25 detectors, tier-DAG valid)', () => {
    expect(() => new DetectorRegistry(FULL_FLEET)).not.toThrow();
  });

  it('registers exactly 25 detectors with no duplicate ids', () => {
    const registry = new DetectorRegistry(FULL_FLEET);
    expect(registry.list()).toHaveLength(25);
  });

  it('every detector declares dependsOn targets strictly lower than its own tier', () => {
    const registry = new DetectorRegistry(FULL_FLEET);
    for (const detector of registry.list()) {
      for (const depId of detector.dependsOn) {
        const dep = registry.get(depId);
        expect(dep, `${detector.id} depends on unknown "${depId}"`).toBeDefined();
        expect(dep!.tier, `${detector.id} (tier ${detector.tier}) -> ${depId} (tier ${dep!.tier})`).toBeLessThan(
          detector.tier,
        );
      }
    }
  });

  it('Tier-0 detectors declare no dependsOn (primitives depend on the transcript only, §9.1)', () => {
    const registry = new DetectorRegistry(FULL_FLEET);
    const tier0 = registry.list().filter((d) => d.tier === 0);
    expect(tier0.map((d) => d.id).sort()).toEqual(['segment', 'tag-verbs', 'tokenize'].sort());
    for (const detector of tier0) {
      expect(detector.dependsOn, detector.id).toEqual([]);
    }
  });

  it('every new (Phase-3) detector defaults to forbidden mark influence at birth (§10.6 step 1)', () => {
    for (const detector of PHASE3_DETECTORS) {
      expect(detector.defaultMarkInfluence, detector.id).toBe('forbidden');
    }
  });

  it('runs the full fleet on the golden transcript with every detector reaching success', () => {
    const registry = new DetectorRegistry(FULL_FLEET);
    const result = runDetectors(registry, { transcript: EVIDENCE_GOLDEN_TRANSCRIPT, questionSet: null });
    const nonSuccess = result.detectorRuns.filter((r) => r.state !== 'success');
    expect(nonSuccess, JSON.stringify(nonSuccess)).toEqual([]);
    expect(result.detectorRuns).toHaveLength(25);
  });

  it('running the full fleet twice on the same input is byte-identical (determinism property)', () => {
    const registry = new DetectorRegistry(FULL_FLEET);
    const first = runDetectors(registry, { transcript: EVIDENCE_GOLDEN_TRANSCRIPT, questionSet: null });
    const second = runDetectors(registry, { transcript: EVIDENCE_GOLDEN_TRANSCRIPT, questionSet: null });
    expect(first).toEqual(second);
  });
});
