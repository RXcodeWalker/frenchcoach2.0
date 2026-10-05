/**
 * The scorer can neither import nor query pronunciation evidence (plan §3c
 * item 2): no non-test file in the scored pipeline mentions the evidence
 * table or the examPronunciation module. That is what makes it irrelevant
 * that Coached evidence can exist before an attempt is scored.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../..');
const SCORED_PIPELINE_DIRS = ['src/domain/igcse', 'scripts/scoring', 'server'];
const FORBIDDEN = /exam_pronunciation|examPronunciation/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(tsx?|js|mjs|sql|json)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('pronunciation evidence is invisible to the scorer', () => {
  for (const dir of SCORED_PIPELINE_DIRS) {
    it(`no non-test file under ${dir} references exam pronunciation`, () => {
      const files = sourceFiles(join(REPO_ROOT, dir)).filter((f) => !/__tests__|\.test\.tsx?$/.test(f));
      expect(files.length).toBeGreaterThan(0);
      expect(files.filter((f) => FORBIDDEN.test(readFileSync(f, 'utf8')))).toEqual([]);
    });
  }
});
