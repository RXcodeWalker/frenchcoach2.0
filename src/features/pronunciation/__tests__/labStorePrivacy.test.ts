// Pronunciation Lab Stage 5 — the Lab history is local to this device and
// account. Like the exam notebook, nothing that syncs, builds a request body
// or reports analytics may read it, and the sentence/word text it was made
// from is never an analytics property. These source guards keep it that way.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const rel = (f: string) => f.slice(SRC.length + 1);
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const HISTORY_REF = /frenchCoach_pronunciationLab|STORAGE_KEYS\.pronunciationLab|pronunciation\/lab\/labHistory|labStore|LabHistory/;

describe('the Lab history stays local', () => {
  it('no module under src/services reads it, except the storage registry and account deletion', () => {
    const allowed = new Set(['services/persistence/storage.ts', 'services/account/accountService.ts']);
    const offenders = walk(join(SRC, 'services'))
      .filter((f) => !allowed.has(rel(f)))
      .filter((f) => HISTORY_REF.test(strip(readFileSync(f, 'utf8'))))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('the sync modules, the API client and the skill-context builders never mention it', () => {
    const files = [
      ...walk(join(SRC, 'services/sync')),
      ...walk(join(SRC, 'services/api')),
      join(SRC, 'services/coach/skillProfileProjection.ts'),
      join(SRC, 'services/coaching/diagnosticEngine.ts'),
    ];
    expect(files.filter((f) => HISTORY_REF.test(strip(readFileSync(f, 'utf8')))).map(rel)).toEqual([]);
  });

  it('only the Lab, its home and its storage module read the store', () => {
    const allowed = new Set([
      'features/pronunciation/labStore.ts',
      'features/pronunciation/LabPractice.tsx',
      'features/pronunciation/WordDrill.tsx',
      'features/pronunciation/TrickyWords.tsx',
      // Stage 6: the monthly check saves/reads its own results; Progress reads the history for "Your French sounds";
      // HowItSounded and Learn only record a take (they never read it back into anything that leaves the device).
      'features/pronunciation/MonthlyCheck.tsx',
      'features/pronunciation/HowItSounded.tsx',
      'screens/Progress.tsx',
      'screens/Learn.tsx',
      'screens/LearnSounds.tsx',
      'domain/pronunciation/lab/labHistory.ts',
    ]);
    const offenders = walk(SRC)
      .filter((f) => !allowed.has(rel(f)))
      .filter((f) => HISTORY_REF.test(strip(readFileSync(f, 'utf8'))))
      // SoundsHome only takes the LabHistory type as a prop; storage.ts and accountService name the key.
      .filter((f) => !['features/pronunciation/SoundsHome.tsx', 'services/persistence/storage.ts', 'services/account/accountService.ts'].includes(rel(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('the history key is account-scoped storage, not device-scoped', () => {
    const storage = readFileSync(join(SRC, 'services/persistence/storage.ts'), 'utf8');
    const deviceScoped = storage.slice(storage.indexOf('const DEVICE_SCOPED'), storage.indexOf(']);', storage.indexOf('const DEVICE_SCOPED')));
    expect(deviceScoped).not.toMatch(/pronunciationLab/);
    expect(storage).toMatch(/pronunciationLab:\s+'frenchCoach_pronunciationLab'/);
  });

  it('the Lab home tracks only counts and enums: no event takes a sentence, a word or a family', () => {
    const files = ['EarTraining.tsx', 'TrickyWords.tsx', 'LabPractice.tsx', 'WordDrill.tsx', 'SoundGuide.tsx', 'PracticePicker.tsx', 'SoundsHome.tsx'].map((n) =>
      strip(readFileSync(join(SRC, 'features/pronunciation', n), 'utf8')),
    );
    const props = files.flatMap((src) => [...src.matchAll(/track\(\{\s*name:\s*'(\w+)',\s*props:\s*(\{[^}]*\})/g)].map((m) => `${m[1]} ${m[2]}`));
    expect(props.length).toBeGreaterThan(0);
    for (const p of props) expect(p).not.toMatch(/sentence|word:|text|family|transcript/i);
  });
});
