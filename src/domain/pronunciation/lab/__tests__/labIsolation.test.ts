/**
 * The Pronunciation Lab never touches marking (pronunciation-lab plan §2):
 * nothing in the scored pipeline names it, and its domain imports nothing
 * from the Cambridge engine or exam feedback (also an ESLint block).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '../../../../..');
const SCORED_PIPELINE_DIRS = ['src/domain/igcse', 'scripts/scoring', 'server'];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(tsx?|js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const nonTest = (files: string[]) => files.filter((f) => !/__tests__|\.test\.tsx?$/.test(f));

describe('pronunciation lab isolation', () => {
  for (const dir of SCORED_PIPELINE_DIRS) {
    it(`no non-test file under ${dir} references the Lab`, () => {
      const files = nonTest(sourceFiles(join(REPO_ROOT, dir)));
      expect(files.length).toBeGreaterThan(0);
      expect(files.filter((f) => /pronunciation\/lab|features\/pronunciation/.test(readFileSync(f, 'utf8')))).toEqual([]);
    });
  }

  it('the Lab domain imports nothing from the engine or exam feedback', () => {
    const files = nonTest(sourceFiles(join(REPO_ROOT, 'src/domain/pronunciation/lab')));
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => /from\s+['"][^'"]*(igcse|examFeedback)\//.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
