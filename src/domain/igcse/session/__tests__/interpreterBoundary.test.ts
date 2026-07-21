/**
 * Change A/D Invariant 2: `UtteranceObservation` / `interpretUtterance` must be
 * unreachable from the scored pipeline — buildSessionTranscript.ts, stt/schema.ts,
 * and every scoring module (evidence -> judgement -> guardrails -> envelope,
 * plus scripts/scoring). The interpreter is a throwaway live-routing hint
 * (simulationSession.ts is its only legitimate caller); if any of these files
 * ever import it, the determinism boundary this whole plan rests on has broken.
 *
 * Implemented as a source-text scan (not a bundler graph) — cheap, exact enough
 * for an import statement, and needs no build step to run in `vitest run`.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

const FORBIDDEN_PATTERNS = [/from ['"].*interpretUtterance['"]/, /\bUtteranceObservation\b/, /\binterpretUtterance\(/];

/** Recursively collects every .ts/.tsx file under `dir`, skipping test directories (the boundary is about production code reachability). */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const SCORED_PIPELINE_DIRS = [
  join(REPO_ROOT, 'src/domain/igcse'),
  join(REPO_ROOT, 'scripts/scoring'),
];

describe('Invariant 2: interpretUtterance / UtteranceObservation are unreachable from the scored pipeline', () => {
  for (const dir of SCORED_PIPELINE_DIRS) {
    const files = collectSourceFiles(dir);
    // Fail loudly if the scan finds nothing — a silent 0-file scan would make this test meaningless.
    it(`scans a non-empty file set under ${dir}`, () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it(`no file under ${dir} references interpretUtterance or UtteranceObservation`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (FORBIDDEN_PATTERNS.some((p) => p.test(content))) {
          offenders.push(file);
        }
      }
      expect(offenders).toEqual([]);
    });
  }

  it('buildSessionTranscript.ts specifically has no reference to the interpreter module', () => {
    const content = readFileSync(join(REPO_ROOT, 'src/domain/igcse/session/buildSessionTranscript.ts'), 'utf-8');
    expect(FORBIDDEN_PATTERNS.some((p) => p.test(content))).toBe(false);
  });

  it('stt/schema.ts specifically has no reference to the interpreter module', () => {
    const content = readFileSync(join(REPO_ROOT, 'src/domain/igcse/stt/schema.ts'), 'utf-8');
    expect(FORBIDDEN_PATTERNS.some((p) => p.test(content))).toBe(false);
  });
});
