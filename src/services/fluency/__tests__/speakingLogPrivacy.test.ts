// The speaking log stays on this device, per account: nothing that syncs,
// builds a request body or reports analytics may read it.
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
const LOG_REF = /frenchCoach_speakingLog|STORAGE_KEYS\.speakingLog|fluency\/speakingLog|SpeakingSample|getSpeakingLog|appendSpeakingSample/;

describe('the speaking log stays local', () => {
  it('only its store, the storage registry, account deletion and Learn mention it', () => {
    const allowed = new Set([
      'services/fluency/speakingLog.ts',
      'services/persistence/storage.ts',
      'services/account/accountService.ts',
      'screens/Learn.tsx',
    ]);
    const offenders = walk(SRC)
      .filter((f) => !allowed.has(rel(f)))
      .filter((f) => LOG_REF.test(strip(readFileSync(f, 'utf8'))))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('is account-scoped, not device-scoped', () => {
    const storage = readFileSync(join(SRC, 'services/persistence/storage.ts'), 'utf8');
    const deviceBlock = storage.slice(storage.indexOf('const DEVICE_SCOPED'), storage.indexOf(']);', storage.indexOf('const DEVICE_SCOPED')));
    expect(deviceBlock).not.toMatch(/speakingLog/);
  });

  it('is removed when the account is deleted', () => {
    const account = readFileSync(join(SRC, 'services/account/accountService.ts'), 'utf8');
    expect(account).toMatch(/storageRemove\(STORAGE_KEYS\.speakingLog\)/);
  });
});
