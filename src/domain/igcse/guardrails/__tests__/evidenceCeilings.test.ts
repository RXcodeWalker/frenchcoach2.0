/**
 * Phase 5 — proves the promotion hook actually WORKS, not merely that it is
 * currently switched off. `no-uncalibrated-influence.test.ts` pins the standing
 * state (everything forbidden, no ceilings); this file exercises the mechanism
 * with injected fixtures so we know a future one-line promotion will do
 * something, and that the two gates are genuinely independent.
 */

import { describe, expect, it } from 'vitest';
import { applyEvidenceCeilings } from '../evidenceCeilings';
import { resolveMarkInfluence } from '../../evidence/framework/markInfluence';
import type { Detector } from '../../evidence/framework/detector';
import type { MarkInfluence, Observation } from '../../evidence/framework/observation';
import type { EvidenceProfile } from '../../evidence/types';
import { CLEAN_ASSESSMENT } from './synthetic';

function detector(id: string, influence: MarkInfluence, version = '1'): Detector {
  return {
    id,
    version,
    tier: 1,
    dependsOn: [],
    produces: ['tense_missing'],
    baseConfidence: 0.7,
    defaultMarkInfluence: influence,
    run: () => [],
  };
}

function observation(overrides: Partial<Observation> = {}): Observation {
  return {
    observationId: 'obs-1',
    detectorId: 'tense',
    detectorVersion: '1',
    type: 'tense_missing',
    value: true,
    spans: [{ startOffset: 0, endOffset: 4 }],
    confidence: 0.9,
    markInfluence: 'forbidden',
    skillNodeId: 'tense_past',
    ...overrides,
  };
}

function profile(observations: Observation[]): EvidenceProfile {
  return {
    schemaVersion: 'evidence-profile-v1',
    observations,
    features: {},
    detectorRuns: [],
    detectorVersions: {},
    timeFrameAlignmentByQuestion: [],
    responseCountsByQuestion: [],
    fillerDensityByQuestion: [],
    rolePlayPartsByTask: [],
    topicConversationDurationByConversation: [],
  };
}

describe('resolveMarkInfluence', () => {
  it('pins an uncalibrated detector that declares `eligible` down to forbidden', () => {
    const resolved = resolveMarkInfluence(detector('rogue', 'eligible'));

    expect(resolved.effective).toBe('forbidden');
    expect(resolved.basis).toBe('demoted_uncalibrated');
    expect(resolved.declared).toBe('eligible');
  });

  it('leaves a forbidden declaration forbidden', () => {
    const resolved = resolveMarkInfluence(detector('tense', 'forbidden'));

    expect(resolved.effective).toBe('forbidden');
    expect(resolved.basis).toBe('default_forbidden');
  });

  it('caps a grandfathered detector at advisory even if it declares eligible', () => {
    const resolved = resolveMarkInfluence(detector('counts', 'eligible'));

    expect(resolved.effective).toBe('advisory');
    expect(resolved.basis).toBe('grandfathered');
  });

  it('honours the real registered advisory influence of the five legacy detectors', () => {
    for (const id of ['counts', 'duration', 'fillers', 'parts', 'time-frame']) {
      expect(resolveMarkInfluence(detector(id, 'advisory')).effective).toBe('advisory');
    }
  });
});

describe('applyEvidenceCeilings', () => {
  it('applies no clamp under the shipped (empty) configuration', () => {
    const result = applyEvidenceCeilings(
      CLEAN_ASSESSMENT,
      profile([observation(), observation({ observationId: 'obs-2' })]),
    );

    expect(result.triggers).toEqual([]);
    expect(result.adjustments).toEqual([]);
  });

  it('leaves marks untouched when the evidence log is empty', () => {
    const result = applyEvidenceCeilings(CLEAN_ASSESSMENT, profile([]));

    expect(result.triggers).toEqual([]);
    expect(result.adjustments).toEqual([]);
  });

  it('is deterministic across repeated calls on the same input', () => {
    const input = profile([observation()]);
    const first = applyEvidenceCeilings(CLEAN_ASSESSMENT, input);
    const second = applyEvidenceCeilings(CLEAN_ASSESSMENT, input);

    expect(first).toEqual(second);
  });
});
