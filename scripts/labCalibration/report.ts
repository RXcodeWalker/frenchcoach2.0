/**
 * `npm run lab:calibration:report [-- --fixtures <dir>] [--json <out.json>] [--no-sweep]`
 *
 * Reads the fixtures recorded by `backend/scripts/probe_lab_calibration.py`
 * (default `backend/tests/fixtures/pronunciation_lab_calibration/`) and prints
 * PASS / FAIL / INCOMPLETE with the reasons. Exit code: 0 pass, 1 fail,
 * 2 incomplete (including no fixtures at all).
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyseLabCalibration, formatLabCalibrationReport, loadLabCalibrationFixtures, sweepThresholds } from './analyse';

function opt(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const dir = resolve(opt('--fixtures') ?? 'backend/tests/fixtures/pronunciation_lab_calibration');
const fixtures = loadLabCalibrationFixtures(dir);
if (fixtures.length === 0) {
  console.log(`No calibration fixtures in ${dir}.\nRecord them first: npm run lab:calibration:sheet, then prepare, then backend/scripts/probe_lab_calibration.py.`);
  console.log('\nVERDICT: INCOMPLETE');
  process.exit(2);
}
const result = analyseLabCalibration(fixtures);
const sweep = process.argv.includes('--no-sweep') ? [] : sweepThresholds(fixtures);
console.log(formatLabCalibrationReport(result, sweep));
const json = opt('--json');
if (json) writeFileSync(resolve(json), `${JSON.stringify({ result, sweep }, null, 2)}\n`);
process.exit(result.verdict === 'pass' ? 0 : result.verdict === 'fail' ? 1 : 2);
