import { describe, expect, it } from 'vitest';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from '../../__tests__/fixtures';
import type { Detector } from '../detector';
import type { Observation } from '../observation';
import { LEGACY_DETECTORS } from '../legacyDetectors';
import { DetectorRegistry } from '../registry';
import { runDetectors } from '../runner';

function makeObservation(overrides: Partial<Observation> & Pick<Observation, 'observationId'>): Observation {
  return {
    detectorId: 'stub',
    detectorVersion: '1',
    type: 'stub_type',
    value: true,
    spans: [{ startOffset: 0, endOffset: 1 }],
    confidence: 0.9,
    markInfluence: 'forbidden',
    skillNodeId: null,
    ...overrides,
  };
}

describe('runDetectors', () => {
  it('runs the real LEGACY_DETECTORS fleet to success on the golden transcript, twice, identically', () => {
    const registry = new DetectorRegistry(LEGACY_DETECTORS);
    const ctx = { transcript: EVIDENCE_GOLDEN_TRANSCRIPT, questionSet: null };

    const first = runDetectors(registry, ctx);
    const second = runDetectors(registry, ctx);

    expect(first).toEqual(second);
    expect(first.detectorRuns.every((run) => run.state === 'success')).toBe(true);
    expect(first.detectorRuns.map((r) => r.detectorId).sort()).toEqual(
      ['counts', 'duration', 'fillers', 'parts', 'time-frame'].sort(),
    );
  });

  it('marks a detector as dependency_unavailable when its dependency fails, without running it', () => {
    let ran = false;
    const failing: Detector = {
      id: 'base',
      version: '1',
      tier: 0,
      dependsOn: [],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => {
        throw new Error('boom');
      },
    };
    const dependent: Detector = {
      id: 'derived',
      version: '1',
      tier: 1,
      dependsOn: ['base'],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => {
        ran = true;
        return [];
      },
    };

    const registry = new DetectorRegistry([failing, dependent]);
    const result = runDetectors(registry, { transcript: EVIDENCE_GOLDEN_TRANSCRIPT, questionSet: null });

    expect(ran).toBe(false);
    const baseRun = result.detectorRuns.find((r) => r.detectorId === 'base');
    const derivedRun = result.detectorRuns.find((r) => r.detectorId === 'derived');
    expect(baseRun?.state).toBe('failed');
    expect(baseRun?.reason).toMatch(/Error: boom/);
    expect(derivedRun?.state).toBe('dependency_unavailable');
  });

  it('records a content-derived reason (no stack/timestamp) for a failed detector', () => {
    const failing: Detector = {
      id: 'broken',
      version: '1',
      tier: 0,
      dependsOn: [],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => {
        throw new TypeError('cannot read property x');
      },
    };
    const registry = new DetectorRegistry([failing]);
    const result = runDetectors(registry, { transcript: EVIDENCE_GOLDEN_TRANSCRIPT, questionSet: null });
    const run = result.detectorRuns[0];
    expect(run.state).toBe('failed');
    expect(run.reason).toBe('TypeError: cannot read property x');
    expect(run.reason).not.toMatch(/at .*:\d+:\d+/);
  });

  it('rejects a detector that emits duplicate observationIds within a single run', () => {
    const duplicateEmitter: Detector = {
      id: 'dup',
      version: '1',
      tier: 0,
      dependsOn: [],
      produces: ['stub_type'],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => [
        makeObservation({ observationId: 'same-id', detectorId: 'dup' }),
        makeObservation({ observationId: 'same-id', detectorId: 'dup' }),
      ],
    };
    const registry = new DetectorRegistry([duplicateEmitter]);
    const result = runDetectors(registry, { transcript: EVIDENCE_GOLDEN_TRANSCRIPT, questionSet: null });
    expect(result.detectorRuns[0].state).toBe('failed');
    expect(result.detectorRuns[0].reason).toMatch(/DuplicateObservationError/);
  });

  it('gives each detector an evidenceView populated only from its own dependsOn', () => {
    const base: Detector = {
      id: 'base',
      version: '1',
      tier: 0,
      dependsOn: [],
      produces: ['stub_type'],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: () => [makeObservation({ observationId: 'base-obs', detectorId: 'base' })],
    };
    let seenView: readonly Observation[] | undefined;
    const dependent: Detector = {
      id: 'derived',
      version: '1',
      tier: 1,
      dependsOn: ['base'],
      produces: [],
      baseConfidence: 0.9,
      defaultMarkInfluence: 'forbidden',
      run: (ctx) => {
        seenView = ctx.evidenceView.get('base');
        return [];
      },
    };
    const registry = new DetectorRegistry([base, dependent]);
    runDetectors(registry, { transcript: EVIDENCE_GOLDEN_TRANSCRIPT, questionSet: null });
    expect(seenView?.map((o) => o.observationId)).toEqual(['base-obs']);
  });
});
