import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * The Sentence Rebuilder is a game for its own sake (owner, 2026-10-30): it has
 * no role in XP. These tests pin that — it may not import anything that awards
 * XP, writes a Session, a streak, mastery or evidence, or reads the app reducer.
 */
const ROOT = resolve(__dirname, '../../..');
const FEATURE = join(ROOT, 'features/sentenceRebuilder');
const SCREEN = join(ROOT, 'screens/SentenceRebuilder.tsx');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === '__tests__') return [];
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = [...sources(FEATURE), SCREEN];
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const imports = (src: string) => [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);

const FORBIDDEN_MODULES = [
  'progression', 'analytics', 'AppContext', 'sessionOrchestrator', 'domain/xp', 'coach', 'sync', 'supabase',
  'telemetry', 'shop', 'achievement', 'review', 'mastery', 'domain/igcse',
];

describe('Sentence Rebuilder has no role in XP', () => {
  it('has source to check', () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it.each(files.map(f => [f.replace(ROOT, 'src'), f]))('%s imports nothing that awards or records progress', (_name, file) => {
    for (const spec of imports(strip(readFileSync(file, 'utf8')))) {
      for (const bad of FORBIDDEN_MODULES) expect(spec, `${file} imports ${spec}`).not.toContain(bad);
    }
  });

  it.each(files.map(f => [f.replace(ROOT, 'src'), f]))('%s never calls an XP or session write', (_name, file) => {
    const src = strip(readFileSync(file, 'utf8'));
    for (const call of [
      'awardXP', 'computeXPGain', 'dispatchAddXP', 'completeMinigameSession', 'ADD_XP', 'ADD_SESSION', 'recordSession',
      'persistSession', 'xpEarned', 'useApp(', 'dispatch(', 'track(',
    ]) {
      expect(src, `${file} mentions ${call}`).not.toContain(call);
    }
  });

  it('keeps its one write to its own storage key', () => {
    const src = readFileSync(join(FEATURE, 'store.ts'), 'utf8');
    expect(src.match(/STORAGE_KEYS\.(\w+)/g)?.every(k => k === 'STORAGE_KEYS.sentenceRebuilder')).toBe(true);
  });

  it('never styles the points counter or a solve as XP (the reward colour is for the trophy only)', () => {
    for (const name of ['PlayView.tsx', 'AnswerPanel.tsx']) {
      const src = strip(readFileSync(join(FEATURE, name), 'utf8'));
      expect(src, name).not.toMatch(/reward/);
      expect(src, name).not.toMatch(/\bXP\b/);
    }
  });
});
