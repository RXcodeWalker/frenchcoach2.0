/**
 * Examiner-style feedback is unreachable from the scored pipeline (ADR 0009):
 * nothing under src/domain/igcse, scripts/scoring or server may import
 * src/domain/examFeedback, the examiner-feedback module, or its UI/hooks. This
 * is why the feedback helpers live OUTSIDE src/domain/igcse — that directory is
 * itself scanned as "the scored pipeline" by interpreterBoundary.test.ts.
 *
 * ADR 0009 amendment (Phase 3 Batch A): the post-marking exam report has its
 * own server route and store, which by design live beside the scoring service.
 * Exactly these feedback-surface files are exempt from the scan
 * (FEEDBACK_SURFACE_FILES); in exchange, the transitive import graph of the
 * scorer itself (scoreAttempt.ts and everything under src/domain/igcse) must
 * never reach src/domain/examFeedback or any of those files.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

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

/** The Batch A report surface: the route, its store, and the judge:check measurement harness. */
const FEEDBACK_SURFACE_FILES = [
  'server/feedbackRoute.ts',
  'scripts/scoring/supabaseFeedbackStore.ts',
  'scripts/scoring/judgeCheck.ts',
  'scripts/scoring/judgeCheck/feedbackCheck.ts',
].map((f) => join(REPO_ROOT, f));

const IMPORT_SPECIFIER = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveRelative(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = join(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Every repo file reachable from `entry` through relative imports. */
function importClosure(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...entries];
  while (stack.length > 0) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, 'utf8').matchAll(IMPORT_SPECIFIER)) {
      const next = resolveRelative(file, m[1] ?? m[2]);
      if (next && !seen.has(next)) stack.push(next);
    }
  }
  return seen;
}

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
        .filter((f) => !FEEDBACK_SURFACE_FILES.includes(f))
        .filter((f) => {
          const src = readFileSync(f, 'utf8');
          return FEEDBACK_REFERENCE_PATTERNS.some((p) => p.test(src));
        });
      expect(offenders).toEqual([]);
    });
  }

  it('the scorer\'s transitive import graph never reaches the feedback modules', () => {
    const scorerEntries = [
      join(REPO_ROOT, 'scripts/scoring/scoreAttempt.ts'),
      ...collectSourceFiles(join(REPO_ROOT, 'src/domain/igcse')).filter((f) => !/__tests__|\.test\.tsx?$/.test(f)),
    ];
    const closure = importClosure(scorerEntries);
    expect(closure.size).toBeGreaterThan(scorerEntries.length);
    const reached = [...closure].filter(
      (f) => f.includes(`${join('src', 'domain', 'examFeedback')}`) || FEEDBACK_SURFACE_FILES.includes(f),
    );
    expect(reached).toEqual([]);
  });

  it('the feedback-surface exemption list names files that exist', () => {
    for (const f of FEEDBACK_SURFACE_FILES) expect(existsSync(f)).toBe(true);
  });
});
