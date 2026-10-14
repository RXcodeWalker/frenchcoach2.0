/**
 * ADR 0012 rule 1: Junior imports nothing from the scored pipeline, not even
 * transitively, and the scored pipeline never imports Junior.
 *
 * Every relative import reachable from Junior's source (src/domain/junior/,
 * src/data/junior/) must stay inside those two folders. That is stricter than
 * "not src/domain/igcse/" on purpose: a helper elsewhere can pull the exam code
 * in (fixMatch.ts does, which is why words.ts is a copy).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../../../..');
const JUNIOR_DIRS = ['src/domain/junior', 'src/data/junior'].map((d) => join(ROOT, d));
const SCORED_DIRS = ['src/domain/igcse', 'scripts/scoring', 'server'].map((d) => join(ROOT, d));

function sourceFiles(dir: string, includeTests = false): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' && !includeTests ? [] : sourceFiles(path, includeTests);
    return /\.tsx?$/.test(name) && (includeTests || !/\.test\.tsx?$/.test(name)) ? [path] : [];
  });
}

const IMPORT = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function imports(file: string): string[] {
  return [...readFileSync(file, 'utf8').matchAll(IMPORT)].map((m) => m[1] ?? m[2]);
}

function resolveImport(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(from), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Cannot resolve ${spec} from ${relative(ROOT, from)}`);
}

const inside = (file: string, dirs: string[]) => dirs.some((d) => file === d || file.startsWith(`${d}/`));

describe('Junior isolation (ADR 0012)', () => {
  it('Junior source reaches no file outside src/domain/junior and src/data/junior', () => {
    const seen = new Set<string>();
    const outside: string[] = [];
    const queue = JUNIOR_DIRS.flatMap((d) => sourceFiles(d));
    expect(queue.length).toBeGreaterThan(10);
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      for (const spec of imports(file)) {
        const target = resolveImport(file, spec);
        if (!target) continue;
        if (!inside(target, JUNIOR_DIRS)) outside.push(`${relative(ROOT, file)} → ${relative(ROOT, target)}`);
        else queue.push(target);
      }
    }
    expect(outside).toEqual([]);
  });

  it('the scored pipeline never imports or names Junior', () => {
    const offenders = SCORED_DIRS.flatMap((d) => sourceFiles(d, true)).filter((f) =>
      imports(f).some((spec) => /(^|\/)junior(\/|$)/.test(spec)),
    );
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });
});
