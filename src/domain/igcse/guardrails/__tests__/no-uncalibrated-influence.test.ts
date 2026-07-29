/**
 * Phase 5 (§10.6 step 5) — the CI guard that turns "accelerate build, gate
 * influence" from a discipline into a mechanically-enforced invariant.
 *
 * The design's whole audit story rests on one claim: a detector can exist,
 * emit evidence, and feed coaching WITHOUT being able to move a Cambridge mark
 * until validation data says it may. Code review cannot be trusted to hold that
 * line across dozens of detectors, so these tests hold it instead.
 */

import { describe, expect, it } from 'vitest';
import { registeredDetectors } from '../../evidence/buildEvidence';
import {
  CALIBRATION_REFERENCES,
  findCalibrationReference,
} from '../../evidence/framework/calibrationReferences';
import {
  GRANDFATHERED_ADVISORY_DETECTORS,
  markEligibleDetectorIds,
  resolveFleetInfluence,
  resolveMarkInfluence,
} from '../../evidence/framework/markInfluence';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import { EVIDENCE_CEILINGS } from '../config';
import { _PROMPT_EVIDENCE_ALLOW_LIST, buildJudgementPrompt } from '../../judgement/prompt';
import { PRACTICE_TRANSCRIPT } from '../../judgement/__tests__/fixtures';

describe('no uncalibrated mark influence', () => {
  it('every detector declaring influence is either calibrated or explicitly grandfathered', () => {
    const undocumented = registeredDetectors()
      .filter((detector) => detector.defaultMarkInfluence !== 'forbidden')
      .filter(
        (detector) =>
          !findCalibrationReference(detector.id, detector.version) &&
          !GRANDFATHERED_ADVISORY_DETECTORS.includes(detector.id),
      )
      .map((detector) => `${detector.id}@${detector.version}`);

    expect(
      undocumented,
      'A detector declares advisory/eligible mark-influence with no CalibrationReference ' +
        'and no grandfather entry. Per §10.6, promotion requires a recorded correlation ' +
        'against teacher marks — add a CalibrationReference, or set defaultMarkInfluence ' +
        "to 'forbidden'.",
    ).toEqual([]);
  });

  it('no detector is `eligible` without a calibration reference AND a sourced threshold', () => {
    for (const resolved of resolveFleetInfluence(registeredDetectors())) {
      if (resolved.effective !== 'eligible') {
        continue;
      }
      const reference = findCalibrationReference(resolved.detectorId, resolved.detectorVersion);
      expect(reference, `${resolved.detectorId} is eligible with no calibration reference`).toBeDefined();
      expect(
        reference?.thresholdSource,
        `${resolved.detectorId} is eligible without a Cambridge-sourced or Phase-C-signed-off ` +
          'threshold (§10.6 step 4)',
      ).toBeTruthy();
    }
  });

  it('grandfathering can never grant `eligible` (it only preserves the status quo)', () => {
    for (const id of GRANDFATHERED_ADVISORY_DETECTORS) {
      const detector = registeredDetectors().find((d) => d.id === id);
      expect(detector, `grandfathered detector "${id}" is not registered`).toBeDefined();
      if (!detector) continue;

      const resolved = resolveMarkInfluence(detector);
      if (resolved.basis === 'grandfathered') {
        expect(
          resolved.effective,
          `grandfathering must cap at advisory, but "${id}" resolved to eligible`,
        ).not.toBe('eligible');
      }
    }
  });

  it('the grandfather list is closed to the five pre-framework detectors', () => {
    // §10.3 footnote: "No existing influence changes in this redesign." New
    // detectors must earn influence through the ledger, never by being added here.
    expect([...GRANDFATHERED_ADVISORY_DETECTORS].sort()).toEqual([
      'counts',
      'duration',
      'fillers',
      'parts',
      'time-frame',
    ]);
  });

  it('every declared calibration reference names a registered detector at its current version', () => {
    const registered = new Map(registeredDetectors().map((d) => [d.id, d.version]));

    for (const reference of CALIBRATION_REFERENCES) {
      expect(
        registered.has(reference.detectorId),
        `calibration reference names unknown detector "${reference.detectorId}"`,
      ).toBe(true);
      expect(
        reference.detectorVersion,
        `calibration reference for "${reference.detectorId}" is stale: recorded against version ` +
          `${reference.detectorVersion}, detector is now ${registered.get(reference.detectorId)}. ` +
          'Re-measure the correlation and update the reference.',
      ).toBe(registered.get(reference.detectorId));
      expect(
        reference.calibrationReference.trim().length,
        `calibration reference for "${reference.detectorId}" has an empty source note`,
      ).toBeGreaterThan(0);
      if (reference.grantedInfluence === 'advisory') {
        expect(
          reference.thresholdSource,
          `"${reference.detectorId}" is advisory-only and must not carry an L3 thresholdSource`,
        ).toBeUndefined();
      }
    }
  });

  it('every evidence ceiling names an eligible detector, a produced type, and a sourced threshold', () => {
    const eligible = new Set(markEligibleDetectorIds(registeredDetectors()));
    const detectorsById = new Map(registeredDetectors().map((d) => [d.id, d]));

    for (const ceiling of EVIDENCE_CEILINGS) {
      expect(
        eligible.has(ceiling.detectorId),
        `ceiling references "${ceiling.detectorId}", which is not resolved as eligible. ` +
          'An L3 mark cap requires a calibrated, promoted detector (§10.6).',
      ).toBe(true);
      expect(
        detectorsById.get(ceiling.detectorId)?.produces,
        `ceiling on "${ceiling.detectorId}" cites observation type "${ceiling.observationType}", ` +
          'which that detector does not produce',
      ).toContain(ceiling.observationType);
      expect(
        ceiling.thresholdSource.trim().length,
        `ceiling on "${ceiling.detectorId}" has no thresholdSource — a mark-capping number must ` +
          'be Cambridge-sourced or Phase-C-signed-off (CLAUDE.md constraint #2)',
      ).toBeGreaterThan(0);
      expect(ceiling.maxMark).toBeGreaterThanOrEqual(0);
      expect(ceiling.maxMark).toBeLessThanOrEqual(15);
      expect(ceiling.minConfidence).toBeGreaterThan(0);
      expect(ceiling.minConfidence).toBeLessThanOrEqual(1);
    }
  });

  it('pre-calibration: no detector has effective mark-influence beyond the five grandfathered', () => {
    // The standing state of the repo until a validation phase runs. This test is
    // EXPECTED to be updated by a promotion commit — updating it is the moment a
    // reviewer must confirm §10.6's bumps happened.
    const influential = resolveFleetInfluence(registeredDetectors())
      .filter((resolved) => resolved.effective !== 'forbidden')
      .map((resolved) => `${resolved.detectorId}:${resolved.effective}`)
      .sort();

    expect(influential).toEqual([
      'counts:advisory',
      'duration:advisory',
      'fillers:advisory',
      'parts:advisory',
      'time-frame:advisory',
    ]);
  });

  it('pre-calibration: no evidence ceiling exists, so L3 cannot clamp any mark', () => {
    expect(EVIDENCE_CEILINGS).toEqual([]);
    expect(CALIBRATION_REFERENCES).toEqual([]);
  });

  it('the L2 prompt allow-list has not grown past the five audited subset fields', () => {
    // The prompt is the *other* mark-influence channel (§9.5 R2 point 4).
    // Promotion to `advisory` adds a field here and bumps SCORING_PROMPT_VERSION;
    // nothing may enter silently.
    expect([..._PROMPT_EVIDENCE_ALLOW_LIST]).toEqual([
      'timeFrameAlignmentByQuestion',
      'responseCountsByQuestion',
      'fillerDensityByQuestion',
      'rolePlayPartsByTask',
      'topicConversationDurationByConversation',
    ]);
  });

  it('D1: the RENDERED prompt never leaks a Phase-3-only evidence field, not just the allow-list constant', () => {
    // The test above only pins the constant's shape. formatEvidence is now
    // driven BY that constant (§10.3), so this proves the actual channel —
    // what the LLM receives — carries none of observations/features/
    // detectorRuns/detectorVersions, the other four EvidenceProfile fields.
    const evidence = buildEvidenceProfile(PRACTICE_TRANSCRIPT);
    const prompt = buildJudgementPrompt(PRACTICE_TRANSCRIPT, evidence);

    expect(prompt).not.toContain('"observations"');
    expect(prompt).not.toContain('"features"');
    expect(prompt).not.toContain('"detectorRuns"');
    expect(prompt).not.toContain('"detectorVersions"');
    expect(prompt).not.toMatch(/\bobservationId\b/);
    expect(prompt).not.toMatch(/\bmarkInfluence\b/);
    expect(prompt).not.toMatch(/\bskillNodeId\b/);
  });
});
