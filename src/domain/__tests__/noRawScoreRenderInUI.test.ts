// ── Phase 4b hard gate ────────────────────────────────────────────────────
// Every UI render of an overall score must go through displayScore()/
// isUnscored() (src/domain/scoring.ts), never read `scores.overall` directly
// — otherwise an offline placeholder 0 renders as a fabricated "0.0" instead
// of "not graded". This test scans src/screens and src/features (the trees
// that render feedback to a user) for any reference to `scores.overall` and
// fails if a file shows up that isn't on the verified-safe allow-list below.
// Adding a new site is fine — verify it's actually safe (guarded by
// isUnscored, or non-render data flow) and add it here with a reason.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '../../..');
const SCAN_DIRS = ['src/screens', 'src/features'];

// Each entry: why this file's `scores.overall` reference(s) are safe.
const ALLOWED: Record<string, string> = {
  'src/features/feedback/components/SnapshotCard.tsx':
    'guarded — early-returns a "not graded" card when isUnscored(feedback), before the scoreEntries render',
  'src/screens/learn/FeedbackPanel.tsx':
    'guarded — isUnscored(feedback) ternary renders a "not graded" block instead of the score grid',
  'src/screens/learn/SessionComplete.tsx':
    'guarded — `unscored ? "Not graded" : scores.overall.toFixed(1)` ternary (component is also dead code, no importer)',
  'src/screens/Learn.tsx':
    'data computation only (XP branch, Session.score write, streak logic) — all gated on the `unscored` flag',
  'src/screens/ScenarioArchitectSession.tsx':
    'fire-and-forget coach-evidence side effect only (finalScore passthrough to observeAttempt) — never rendered',
  'src/screens/StoryMode.tsx':
    'data computation only (overallScore accumulator is never rendered; mood/expression and observeAttempt passthrough, both gated by isUnscored)',
  'src/screens/RoleplaySession.tsx':
    'data computation only (Session.score write, XP calc, and mood/expression selection) — all read inside the `unscored ? ... : finalScore` branch, same shape as StoryMode.tsx',
};

function listFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) files.push(...listFiles(full));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) files.push(full);
  }
  return files;
}

describe('no raw scores.overall render outside the verified-safe allow-list', () => {
  it('every file referencing scores.overall under src/screens or src/features is allow-listed', () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of listFiles(join(ROOT, dir))) {
        const source = readFileSync(file, 'utf8');
        if (!/scores\.overall\b/.test(source)) continue;
        const rel = relative(ROOT, file).replace(/\\/g, '/');
        if (!(rel in ALLOWED)) offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every allow-listed file still exists and still references scores.overall (prevents a stale entry)', () => {
    for (const relPath of Object.keys(ALLOWED)) {
      const source = readFileSync(join(ROOT, relPath), 'utf8');
      expect(source).toMatch(/scores\.overall\b/);
    }
  });

  it('domain/scoring.ts defines the required discriminant + display helpers', () => {
    const source = readFileSync(join(ROOT, 'src/domain/scoring.ts'), 'utf8');
    expect(source).toMatch(/export const isUnscored/);
    expect(source).toMatch(/export const displayScore/);
    expect(source).toMatch(/export function averageRealScores/);
  });
});
