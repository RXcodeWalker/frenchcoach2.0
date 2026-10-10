// Learn feedback Batch 6d — the exam notebook is the learner's own words, kept on
// this device for a signed-in account only. These source guards keep it that way:
// nothing that syncs, calls the network, or builds a request body may read it,
// and nothing about it is ever logged or tracked.
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

/** Anything that names the notebook's storage key, type or state slice. */
const NOTEBOOK_REF = /frenchCoach_notebook|STORAGE_KEYS\.notebook|domain\/learn\/notebook|NotebookEntry|NotebookDraft|state\.notebook|SAVE_NOTEBOOK_ENTRY|SET_NOTEBOOK/;

describe('the exam notebook stays local', () => {
  it('no module under src/services reads it, except the storage registry and account deletion', () => {
    const allowed = new Set(['services/persistence/storage.ts', 'services/account/accountService.ts']);
    const offenders = walk(join(SRC, 'services'))
      .filter((f) => !allowed.has(rel(f)))
      .filter((f) => NOTEBOOK_REF.test(strip(readFileSync(f, 'utf8'))))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('the sync modules and the skill-context builders never mention it', () => {
    const files = [
      ...walk(join(SRC, 'services/sync')),
      join(SRC, 'services/coach/skillProfileProjection.ts'),
      join(SRC, 'services/coaching/diagnosticEngine.ts'),
    ];
    expect(files.filter((f) => /notebook/i.test(strip(readFileSync(f, 'utf8')))).map(rel)).toEqual([]);
  });

  it('the API client never names its key, type or state (ExaminerVerdict.notebook is an unrelated report field)', () => {
    const offenders = walk(join(SRC, 'services/api'))
      .filter((f) => NOTEBOOK_REF.test(strip(readFileSync(f, 'utf8'))))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('the notebook key is account-scoped storage, not device-scoped', () => {
    const storage = readFileSync(join(SRC, 'services/persistence/storage.ts'), 'utf8');
    const deviceScoped = storage.slice(storage.indexOf('const DEVICE_SCOPED'), storage.indexOf(']);', storage.indexOf('const DEVICE_SCOPED')));
    expect(deviceScoped).not.toMatch(/notebook/);
    expect(storage).toMatch(/notebook:\s+'frenchCoach_notebook'/);
  });

  it('the cross-tab handler follows the notebook key', () => {
    const app = strip(readFileSync(join(SRC, 'context/AppContext.tsx'), 'utf8'));
    expect(app).toMatch(/matchesScopedKey\(e\.key, STORAGE_KEYS\.notebook\)/);
  });

  it('notebook code never logs or tracks', () => {
    const files = [
      ...walk(join(SRC, 'domain/learn/notebook')),
      ...walk(join(SRC, 'features/notebook')),
      join(SRC, 'screens/Notebook.tsx'),
      join(SRC, 'features/feedback/teacher/SaveToNotebook.tsx'),
    ];
    for (const f of files) {
      const code = strip(readFileSync(f, 'utf8'));
      expect(code, rel(f)).not.toMatch(/\bconsole\./);
      expect(code, rel(f)).not.toMatch(/\btrack\(|from '[./]*\/?(services\/)?analytics/);
    }
  });
});
