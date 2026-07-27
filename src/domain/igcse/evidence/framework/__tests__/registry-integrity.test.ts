import { describe, expect, it } from 'vitest';
import type { Detector } from '../detector';
import { LEGACY_DETECTORS } from '../legacyDetectors';
import { DetectorGraphError, DetectorRegistry } from '../registry';

function stubDetector(overrides: Partial<Detector> & Pick<Detector, 'id' | 'tier'>): Detector {
  return {
    version: '1',
    dependsOn: [],
    produces: [],
    baseConfidence: 0.9,
    defaultMarkInfluence: 'forbidden',
    run: () => [],
    ...overrides,
  };
}

describe('DetectorRegistry', () => {
  it('accepts the real registered LEGACY_DETECTORS fleet', () => {
    const registry = new DetectorRegistry(LEGACY_DETECTORS);
    expect(registry.list().map((d) => d.id).sort()).toEqual(
      ['counts', 'duration', 'fillers', 'parts', 'time-frame'].sort(),
    );
  });

  it('accepts a valid strictly-decreasing-tier dependency', () => {
    const tier0 = stubDetector({ id: 'a', tier: 0 });
    const tier1 = stubDetector({ id: 'b', tier: 1, dependsOn: ['a'] });
    const registry = new DetectorRegistry([tier0, tier1]);
    expect(registry.has('a')).toBe(true);
    expect(registry.has('b')).toBe(true);
  });

  it('rejects a dependency on an unknown detector id', () => {
    const detector = stubDetector({ id: 'a', tier: 1, dependsOn: ['ghost'] });
    expect(() => new DetectorRegistry([detector])).toThrow(DetectorGraphError);
  });

  it('rejects a same-tier dependency, even though it is acyclic', () => {
    const a = stubDetector({ id: 'a', tier: 1 });
    const b = stubDetector({ id: 'b', tier: 1, dependsOn: ['a'] });
    expect(() => new DetectorRegistry([a, b])).toThrow(DetectorGraphError);
  });

  it('rejects an upward dependency (tier 0 depending on tier 1)', () => {
    const tier1 = stubDetector({ id: 'a', tier: 1 });
    const tier0 = stubDetector({ id: 'b', tier: 0, dependsOn: ['a'] });
    expect(() => new DetectorRegistry([tier1, tier0])).toThrow(DetectorGraphError);
  });

  it('rejects a duplicate detector id', () => {
    const a = stubDetector({ id: 'a', tier: 0 });
    const aAgain = stubDetector({ id: 'a', tier: 0 });
    expect(() => new DetectorRegistry([a, aAgain])).toThrow(DetectorGraphError);
  });

  it('list() returns detectors ordered by ascending tier', () => {
    const tier2 = stubDetector({ id: 'c', tier: 2, dependsOn: ['b'] });
    const tier0 = stubDetector({ id: 'a', tier: 0 });
    const tier1 = stubDetector({ id: 'b', tier: 1, dependsOn: ['a'] });
    const registry = new DetectorRegistry([tier2, tier0, tier1]);
    expect(registry.list().map((d) => d.tier)).toEqual([0, 1, 2]);
  });
});
