/**
 * The release gate for the Pronunciation Lab (plan §7): the `pronunciationLab`
 * flag may be `live` by default only while the calibration recordings on file
 * (`backend/tests/fixtures/pronunciation_lab_calibration/`, written by
 * `backend/scripts/probe_lab_calibration.py`) PASS with the current cut-offs.
 *
 * Today the flag is `coming-soon` and this test is a no-op. Flipping it to
 * `live` without a passing calibration — or changing `LAB_THRESHOLDS` so the
 * recorded result no longer passes — fails CI. (`?ff_pronunciationLab=live`
 * and the localStorage override are for trying it out and are not affected.)
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FEATURE_FLAGS, type FeatureStatus } from '../../../src/config/featureFlags';
import { analyseLabCalibration, formatLabCalibrationReport, loadLabCalibrationFixtures } from '../analyse';

const FIXTURES = fileURLToPath(new URL('../../../backend/tests/fixtures/pronunciation_lab_calibration', import.meta.url));

// Widened on purpose: the flag is a literal type today, and this guard exists for the day it is not.
const readFlag = (): FeatureStatus => FEATURE_FLAGS.pronunciationLab;
const FLAG = readFlag();

describe('Pronunciation Lab release gate', () => {
  if (FLAG !== 'live') {
    it('is not live by default, so no calibration is required yet', () => {
      expect(FLAG).toBe('coming-soon');
    });
    return;
  }

  it('is live by default, so the recorded calibration must PASS with the current cut-offs', () => {
    const result = analyseLabCalibration(loadLabCalibrationFixtures(FIXTURES));
    expect(result.verdict, `\n${formatLabCalibrationReport(result)}`).toBe('pass');
  });
});
