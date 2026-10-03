/**
 * Examiner-style feedback is unreachable from the scored pipeline (ADR 0009):
 * nothing under src/domain/igcse, scripts/scoring or server may import
 * src/domain/examFeedback, the examiner-feedback module, or its UI/hooks. This
 * is why the feedback helpers live OUTSIDE src/domain/igcse — that directory is
 * itself scanned as "the scored pipeline" by interpreterBoundary.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../..');

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectSourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const FEEDBACK_REFERENCE_PATTERNS = [
  /domain\/examFeedback/,
  /\.\.\/examFeedback/,
  /coaching\/examinerFeedback/,
  /ExaminerFeedbackCard/,
  /services\/exam\/turnFeedback/,
];

const SCORED_PIPELINE_DIRS = ['src/domain/igcse', 'scripts/scoring', 'server'].map((d) => join(REPO_ROOT, d));

describe('examiner feedback is unreachable from the scored pipeline', () => {
  it('lives outside src/domain/igcse', () => {
    expect(existsSync(join(REPO_ROOT, 'src/domain/examFeedback/shared'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'src/domain/igcse/examFeedback'))).toBe(false);
  });

  for (const dir of SCORED_PIPELINE_DIRS) {
    it(`scans a non-empty file set under ${dir.replace(REPO_ROOT, '')}`, () => {
      expect(collectSourceFiles(dir).length).toBeGreaterThan(0);
    });

    it(`no non-test file under ${dir.replace(REPO_ROOT, '')} references examiner feedback`, () => {
      const offenders = collectSourceFiles(dir)
        .filter((f) => !/__tests__|\.test\.tsx?$/.test(f))
        .filter((f) => {
          const src = readFileSync(f, 'utf8');
          return FEEDBACK_REFERENCE_PATTERNS.some((p) => p.test(src));
        });
      expect(offenders).toEqual([]);
    });
  }
});
