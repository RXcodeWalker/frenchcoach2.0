/**
 * Detector registry — enforces the tier-DAG rule from §9.1 at construction
 * time: dependencies flow strictly downward across tiers 0 → 1 → 2, never
 * sideways or upward. A cycle is structurally impossible under this rule
 * because it would require an equal-or-upward edge, which is rejected here.
 */

import type { Detector } from './detector';

export class DetectorGraphError extends Error {}

export class DetectorRegistry {
  private readonly detectors = new Map<string, Detector>();

  constructor(detectors: Detector[]) {
    for (const detector of detectors) {
      if (this.detectors.has(detector.id)) {
        throw new DetectorGraphError(`Duplicate detector id "${detector.id}"`);
      }
      this.detectors.set(detector.id, detector);
    }
    this.validate();
  }

  private validate(): void {
    for (const detector of this.detectors.values()) {
      for (const depId of detector.dependsOn) {
        const dep = this.detectors.get(depId);
        if (!dep) {
          throw new DetectorGraphError(
            `Detector "${detector.id}" depends on unknown detector "${depId}"`,
          );
        }
        if (dep.tier >= detector.tier) {
          throw new DetectorGraphError(
            `Detector "${detector.id}" (tier ${detector.tier}) depends on "${depId}" ` +
              `(tier ${dep.tier}) — dependencies must be strictly lower tier`,
          );
        }
      }
    }
  }

  /** Topological order (tier ascending, then declared order) — see runner.ts for execution. */
  list(): Detector[] {
    return [...this.detectors.values()].sort((a, b) => a.tier - b.tier);
  }

  get(id: string): Detector | undefined {
    return this.detectors.get(id);
  }

  has(id: string): boolean {
    return this.detectors.has(id);
  }
}
