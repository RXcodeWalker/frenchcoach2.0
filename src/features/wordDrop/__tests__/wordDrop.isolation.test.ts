import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Word Drop is a game for its own sake (owner, 2026-10-30): it has no role in
 * XP. These tests pin that — it may not import anything that awards XP, writes
 * a Session, a streak, mastery or evidence, or reads the app reducer.
 */
const ROOT = resolve(__dirname, '../../..');
const FEATURE = join(ROOT, 'features/wordDrop');
const SCREEN = join(ROOT, 'screens/WordDrop.tsx');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === '__tests__') return [];
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = [...sources(FEATURE), SCREEN];
const imports = (src: string) => [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);

const FORBIDDEN_MODULES = [
  'progression', 'analytics', 'AppContext', 'sessionOrchestrator', 'domain/xp', 'coach', 'sync', 'supabase',
  'telemetry', 'shop', 'achievement', 'review', 'mastery', 'domain/igcse',
];

describe('Word Drop has no role in XP', () => {
  it('has source to check', () => {
    expect(files.length).toBeGreaterThan(6);
  });

  it.each(files.map(f => [f.replace(ROOT, 'src'), f]))('%s imports nothing that awards or records progress', (_name, file) => {
    const src = readFileSync(file, 'utf8');
    for (const spec of imports(src)) {
      for (const bad of FORBIDDEN_MODULES) {
        expect(spec, `${file} imports ${spec}`).not.toContain(bad);
      }
    }
  });

  it.each(files.map(f => [f.replace(ROOT, 'src'), f]))('%s never calls an XP or session write', (_name, file) => {
    const src = readFileSync(file, 'utf8');
    for (const call of ['awardXP', 'computeXPGain', 'ADD_SESSION', 'recordSession', 'persistSession', 'xpEarned', 'useApp(', 'dispatch(']) {
      expect(src, `${file} mentions ${call}`).not.toContain(call);
    }
  });

  it('keeps its one write to its own best-score key', () => {
    const src = readFileSync(join(FEATURE, 'bestStore.ts'), 'utf8');
    expect(src.match(/STORAGE_KEYS\.(\w+)/g)?.every(k => k === 'STORAGE_KEYS.wordDropBests')).toBe(true);
  });
});
