import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Dictée is a game for its own sake and has no AI in it. These tests pin both:
 *  - it may not import anything that awards XP, writes a Session, a streak,
 *    mastery or evidence, or reads the app reducer;
 *  - it may not reach a model or any server: no request, no API client, no
 *    quota. (The recorded voice is a pre-made file; the voice service is the
 *    only thing it speaks through.)
 * The one piece of the exam engine it may read is the shared sound-alike
 * table (`domain/igcse/stt/homophones/classes`), so there is one rule about
 * which words sound the same — never the scored pipeline.
 */
const ROOT = resolve(__dirname, '../../..');
const FEATURE = join(ROOT, 'features/dictee');
const SCREEN = join(ROOT, 'screens/Dictee.tsx');
const DATA = join(ROOT, 'data/dictee');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === '__tests__') return [];
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = [...sources(FEATURE), ...sources(DATA), SCREEN];
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const imports = (src: string) => [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);

const FORBIDDEN_MODULES = [
  'progression', 'analytics', 'AppContext', 'sessionOrchestrator', 'domain/xp', 'coach', 'sync', 'supabase',
  'telemetry', 'shop', 'achievement', 'review', 'mastery', 'apiClient', 'services/api', 'authToken', 'quota',
];
const ALLOWED_IGCSE = 'domain/igcse/stt/homophones/classes';

describe('Dictée has no role in XP', () => {
  it('has source to check', () => {
    expect(files.length).toBeGreaterThan(14);
  });

  it.each(files.map(f => [f.replace(ROOT, 'src'), f]))('%s imports nothing that awards or records progress', (_name, file) => {
    for (const spec of imports(strip(readFileSync(file, 'utf8')))) {
      for (const bad of FORBIDDEN_MODULES) expect(spec, `${file} imports ${spec}`).not.toContain(bad);
      if (spec.includes('domain/igcse')) expect(spec, `${file} reaches into the scored pipeline`).toContain(ALLOWED_IGCSE);
    }
  });

  it.each(files.map(f => [f.replace(ROOT, 'src'), f]))('%s never calls an XP or session write', (_name, file) => {
    const src = strip(readFileSync(file, 'utf8'));
    for (const call of ['awardXP', 'computeXPGain', 'ADD_SESSION', 'ADD_XP', 'recordSession', 'persistSession', 'completeMinigameSession', 'xpEarned', 'useApp(', 'dispatch(']) {
      expect(src, `${file} mentions ${call}`).not.toContain(call);
    }
  });

  it('keeps its one write to its own key', () => {
    const src = readFileSync(join(FEATURE, 'store.ts'), 'utf8');
    expect(src.match(/STORAGE_KEYS\.(\w+)/g)?.every(k => k === 'STORAGE_KEYS.dictee')).toBe(true);
  });
});

describe('Dictée has no AI and makes no request', () => {
  it.each(files.map(f => [f.replace(ROOT, 'src'), f]))('%s reaches no server', (_name, file) => {
    const src = strip(readFileSync(file, 'utf8'));
    for (const call of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', '/api/', 'getAIFeedback', 'transcribeAudio', 'Authorization']) {
      expect(src, `${file} mentions ${call}`).not.toContain(call);
    }
  });

  it('plays its lines only through the voice service, as recorded static French', () => {
    const audio = readFileSync(join(FEATURE, 'audio.ts'), 'utf8');
    expect(audio).toContain('recorded: true');
    const results = readFileSync(join(FEATURE, 'ResultsView.tsx'), 'utf8');
    expect(results).toContain('recorded: true');
  });
});
