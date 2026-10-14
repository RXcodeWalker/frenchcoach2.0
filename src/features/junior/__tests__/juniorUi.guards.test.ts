// Guards over the Junior UI (junior-track §9, §12; ADR 0012): it reaches the scored pipeline nowhere,
// writes only Junior actions, and takes colour from role tokens like Learn.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const DIRS = ['src/features/junior', 'src/screens/junior'];

function files(dir: string): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(join(ROOT, p)).isDirectory()) return name === '__tests__' ? [] : files(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}
const SOURCES = DIRS.flatMap(files);
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Junior UI guards', () => {
  it('scans a non-trivial set of files', () => {
    expect(SOURCES.length).toBeGreaterThan(10);
  });

  it('imports nothing from the scored pipeline, scoring scripts, the server or exam services', () => {
    const bad = SOURCES.filter((f) =>
      /from\s+['"][^'"]*(domain\/igcse|scripts\/scoring|\/server\/|services\/exam\/|features\/exam\/|domain\/examFeedback|domain\/examPronunciation)/.test(strip(read(f))),
    );
    expect(bad.map((f) => relative(ROOT, join(ROOT, f)))).toEqual([]);
  });

  it('never dispatches or calls anything that writes a Session, XP, mastery, Learn evidence or analytics', () => {
    const FORBIDDEN =
      /ADD_SESSION|ADD_XP|dispatchAddXP|XP_EVENT|UPDATE_MASTERY|recordDemandOnlyAttempt|orchestrateAttempt|analyticsService|trackEvent|sessionToRow|services\/sync|services\/supabase|services\/progression/;
    const bad = SOURCES.filter((f) => FORBIDDEN.test(strip(read(f))));
    expect(bad).toEqual([]);
  });

  it('only dispatches the Junior and learner-track actions', () => {
    const allowed = new Set(['START_JUNIOR_MISSION', 'RECORD_JUNIOR_TURN', 'FINISH_JUNIOR_MISSION', 'MARK_JUNIOR_DEMO_SEEN', 'SET_LEARNER_TRACK']);
    const used = SOURCES.flatMap((f) => [...strip(read(f)).matchAll(/type:\s*'([A-Z_]+)'/g)].map((m) => m[1]));
    expect(used.filter((t) => !allowed.has(t))).toEqual([]);
    expect(new Set(used)).toEqual(allowed);
  });

  it('shows no mark, score, band or grade wording to the learner', () => {
    const bad = SOURCES.filter((f) => /\b(score|marks?|grade|band|points?)\b/i.test(strip(read(f)).replace(/'\.\.\/[^']*'/g, '')));
    // "Grades 4–7" names the audience; it is the only place the word may appear.
    const offenders = bad.filter((f) => strip(read(f)).replace(/Grades 4–7/g, '').match(/\b(score|marks?|grade|band|points?)\b/i));
    expect(offenders).toEqual([]);
  });

  it('takes colour from role tokens: no raw 100–500 Tailwind text colour, no inline hex, no text-white', () => {
    const RAW = /(?<![\w:-])(?:(?:hover|group-hover|focus):)?(?:text|decoration|bg|border)-(?:violet|emerald|amber|cyan|red|rose|orange|teal|sky|yellow|purple|blue|slate|gray|green|indigo|pink)-(?:50|100|200|300|400|500)(?![\w-])/;
    const HEX = /style=\{\{[^}]*#[0-9a-fA-F]{3,8}/;
    const offenders = SOURCES.filter((f) => {
      const code = strip(read(f));
      return RAW.test(code) || HEX.test(code) || /(?<![\w-])text-white(?![\w-])/.test(code);
    });
    expect(offenders).toEqual([]);
  });

  it('Léo animates only under motion-safe (reduced-motion friendly)', () => {
    const bad = SOURCES.filter((f) => /(?<![\w:-])animate-(pulse|bounce|spin|ping)/.test(strip(read(f))));
    expect(bad).toEqual([]);
  });
});
