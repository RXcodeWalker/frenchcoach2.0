/**
 * `npm run pronunciation:calibration:report` — prints the Batch 7 calibration
 * verdict for the recorded fixtures (see ./calibration.ts). Exit 0 only on
 * `pass`; `not_run`, `incomplete` and `fail` all exit 1, because only a pass
 * may be logged in verification-log.md as satisfying the release gate.
 *
 *   npm run pronunciation:calibration:report [-- --dir <fixtures dir>] [-- --json]
 */

import { resolve } from 'node:path';
import { evaluateCalibration, formatCalibrationResult, loadCalibrationFixtures } from './calibration';

export const DEFAULT_FIXTURE_DIR = 'backend/tests/fixtures/exam_pronunciation_calibration';

const args = process.argv.slice(2);
const dirFlag = args.indexOf('--dir');
const dir = resolve(dirFlag >= 0 ? args[dirFlag + 1] : DEFAULT_FIXTURE_DIR);
const result = evaluateCalibration(loadCalibrationFixtures(dir));
console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : formatCalibrationResult(result));
process.exit(result.status === 'pass' ? 0 : 1);
