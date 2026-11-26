// fluency-trainer §5: drill records stay on this device, per account.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
const REF = /frenchCoach_fluencyDrills|STORAGE_KEYS\.fluencyDrills|fluency\/drillStore|getDrillHistory|saveDrill/;

describe('the drill store', () => {
  it('only its store, the storage registry, account deletion and the two trainer screens mention it', () => {
    const allowed = new Set([
      'services/fluency/drillStore.ts',
      'services/persistence/storage.ts',
      'services/account/accountService.ts',
      'screens/Fluency.tsx',
      'screens/FluencyDrill.tsx',
    ]);
    const offenders = walk(SRC).filter((f) => !allowed.has(rel(f)) && REF.test(strip(readFileSync(f, 'utf8')))).map(rel);
    expect(offenders).toEqual([]);
  });

  it('is account-scoped, not device-scoped', () => {
    const storage = readFileSync(join(SRC, 'services/persistence/storage.ts'), 'utf8');
    const start = storage.indexOf('const DEVICE_SCOPED');
    expect(storage.slice(start, storage.indexOf(']);', start))).not.toMatch(/fluencyDrills/);
  });

  it('is removed when the account is deleted', () => {
    expect(readFileSync(join(SRC, 'services/account/accountService.ts'), 'utf8')).toMatch(/storageRemove\(STORAGE_KEYS\.fluencyDrills\)/);
  });

  it('stores numbers and ids only: the record type has no text, transcript or audio field', () => {
    const domain = readFileSync(join(SRC, 'domain/fluency/drill432.ts'), 'utf8');
    const record = domain.slice(domain.indexOf('export interface DrillRecord'), domain.indexOf('}', domain.indexOf('export interface DrillRecord')));
    expect(record).not.toMatch(/transcript|text|audio|blob/i);
  });
});
