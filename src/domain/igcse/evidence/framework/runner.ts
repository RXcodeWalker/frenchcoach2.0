/**
 * Pipeline runner — executes a DetectorRegistry's detectors in dependency
 * order, building the shared evidenceView as it goes. Pure: no persistence,
 * no scheduling of its own (§9.4 — it must not become a second orchestrator).
 */

import type { DetectorContext } from './detector';
import type { DetectorRun, Observation } from './observation';
import type { DetectorRegistry } from './registry';

export class RunnerCycleError extends Error {}

export interface RunResult {
  observations: Observation[];
  detectorRuns: DetectorRun[];
}

function toErrorReason(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return 'UnknownError: detector threw a non-Error value';
}

/**
 * D2: the duplicate-observation check keys on the observation's own fields,
 * not on `observationId` (an FNV-1a hash — see framework/text.ts). Hashing
 * first and comparing hashes means a hash collision between two genuinely
 * distinct observations would masquerade as a real duplicate, throw, and
 * silently drop every observation the detector produced (cascading
 * `dependency_unavailable` to dependents). Comparing the composite identity
 * key directly makes that failure mode impossible regardless of hash quality.
 */
function observationIdentityKey(observation: Observation): string {
  const spanKey = observation.spans.map((s) => `${s.startOffset}:${s.endOffset}`).join(',');
  return `${observation.detectorId}|${observation.type}|${spanKey}|${String(observation.value)}`;
}

/**
 * Defensive topological sort, belt-and-braces on top of registry construction
 * validation (§9.1). Should be unreachable if registry validation passed, but
 * the runner does not trust that invariant blindly.
 */
function topologicalOrder(registry: DetectorRegistry): string[] {
  const detectors = registry.list();
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new RunnerCycleError(`Cycle detected at detector "${id}"`);
    }
    const detector = registry.get(id);
    if (!detector) return;
    visiting.add(id);
    for (const depId of detector.dependsOn) {
      visit(depId);
    }
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }

  for (const detector of detectors) {
    visit(detector.id);
  }

  return order;
}

export function runDetectors(
  registry: DetectorRegistry,
  ctx: Omit<DetectorContext, 'evidenceView'>,
): RunResult {
  const order = topologicalOrder(registry);
  const observationsByDetector = new Map<string, Observation[]>();
  const detectorRuns: DetectorRun[] = [];
  const states = new Map<string, DetectorRun['state']>();

  for (const id of order) {
    const detector = registry.get(id);
    if (!detector) continue;

    const unmetDependency = detector.dependsOn.find((depId) => states.get(depId) !== 'success');
    if (unmetDependency) {
      states.set(id, 'dependency_unavailable');
      detectorRuns.push({
        detectorId: id,
        version: detector.version,
        state: 'dependency_unavailable',
        reason: `Dependency "${unmetDependency}" did not reach success`,
      });
      continue;
    }

    const evidenceView = new Map<string, Observation[]>();
    for (const depId of detector.dependsOn) {
      evidenceView.set(depId, observationsByDetector.get(depId) ?? []);
    }

    try {
      const seen = new Set<string>();
      const observations = detector.run({ ...ctx, evidenceView });
      for (const observation of observations) {
        const identityKey = observationIdentityKey(observation);
        if (seen.has(identityKey)) {
          throw new Error(
            `DuplicateObservationError: detector "${id}" emitted duplicate observation (type="${observation.type}", spans=${JSON.stringify(observation.spans)}, value=${String(observation.value)})`,
          );
        }
        seen.add(identityKey);
      }
      observationsByDetector.set(id, observations);
      states.set(id, 'success');
      detectorRuns.push({ detectorId: id, version: detector.version, state: 'success' });
    } catch (error) {
      states.set(id, 'failed');
      detectorRuns.push({
        detectorId: id,
        version: detector.version,
        state: 'failed',
        reason: toErrorReason(error),
      });
    }
  }

  return {
    observations: order.flatMap((id) => observationsByDetector.get(id) ?? []),
    detectorRuns,
  };
}
