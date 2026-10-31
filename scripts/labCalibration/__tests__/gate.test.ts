/**
 * The release gate for the Pronunciation Lab (plan §7): the `pronunciationLab`
 * flag may be `live` by default only while the calibration recordings on file
 * (`backend/tests/fixtures/pronunciation_lab_calibration/`, written by
 * `backend/scripts/probe_lab_calibration.py`) PASS with the current cut-offs.
 *
 * While the flag is `coming-soon` this test is a no-op. Once it is `live`,
 * a passing calibration is required — or an explicit OWNER WAIVER below.
 * Changing `LAB_THRESHOLDS` so a recorded result no longer passes also fails
 * CI. (`?ff_pronunciationLab=live` and the localStorage override are for
 * trying it out and are not affected.)
 *
 * OWNER WAIVER (2026-10-31): the owner switched the Lab live before the gate
 * passed, as they did for `learnMarkingLevels` (2026-10-24). The waiver does
 * not change what the gate measures; it only lets CI accept the flag while the
 * calibration is not in. It is not an exemption from the gate: the report
 * still has to be run (`npm run lab:calibration:report`), and the day it
 * says PASS — or the owner decides word marks stay — delete the waiver and
 * the test goes back to requiring PASS. A FAIL on real recordings is the
 * trigger to hide word states (flag back to `coming-soon`, or ship the Lab
 * without them; plan §7).
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FEATURE_FLAGS, type FeatureStatus } from '../../../src/config/featureFlags';
import { analyseLabCalibration, formatLabCalibrationReport, loadLabCalibrationFixtures } from '../analyse';

const FIXTURES = fileURLToPath(new URL('../../../backend/tests/fixtures/pronunciation_lab_calibration', import.meta.url));

// Widened on purpose: the flag is a literal type today, and this guard exists for the day it is not.
const OWNER_WAIVER: { date: string; reason: string } | null = {
  date: '2026-10-31',
  reason: 'Owner chose to go live before any real calibration recordings exist (verification-log.md, 2026-10-31).',
};

const readFlag = (): FeatureStatus => FEATURE_FLAGS.pronunciationLab;
const FLAG = readFlag();

describe('Pronunciation Lab release gate', () => {
  if (FLAG !== 'live') {
    it('is not live by default, so no calibration is required yet', () => {
      expect(FLAG).toBe('coming-soon');
    });
    return;
  }

  it('is live by default, so the recorded calibration must PASS with the current cut-offs (or the owner waiver stands)', () => {
    const result = analyseLabCalibration(loadLabCalibrationFixtures(FIXTURES));
    if (OWNER_WAIVER) {
      // The waiver covers "not enough recordings yet" and nothing else: a calibration that has
      // actually been run and FAILED is not waived — that is the signal to hide the word marks.
      expect(result.verdict, `\n${formatLabCalibrationReport(result)}\nWaived on ${OWNER_WAIVER.date}: ${OWNER_WAIVER.reason}`).not.toBe('fail');
      return;
    }
    expect(result.verdict, `\n${formatLabCalibrationReport(result)}`).toBe('pass');
  });
});
