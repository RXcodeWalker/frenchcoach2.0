/**
 * `npm run lab:calibration:sheet [-- --out recording-sheet.md]` — prints (or
 * writes) the recording sheet for the Pronunciation Lab calibration.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderSheet } from './plan';

const i = process.argv.indexOf('--out');
const sheet = renderSheet();
if (i >= 0 && process.argv[i + 1]) {
  const out = resolve(process.argv[i + 1]);
  writeFileSync(out, sheet);
  console.log(`wrote ${out}`);
} else {
  process.stdout.write(sheet);
}
