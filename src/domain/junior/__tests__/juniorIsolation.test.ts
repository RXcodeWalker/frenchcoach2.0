// Junior stays local and separate: no sync module, request builder or IGCSE code may touch its state.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');
const rel = (f: string) => f.slice(SRC.length + 1);
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}
const JUNIOR_REF = /frenchCoach_junior|frenchCoach_learnerTrack|STORAGE_KEYS\.(junior|learnerTrack)|domain\/junior|state\.junior|JUNIOR_MISSION|JuniorState/;

describe('Junior state is local and separate', () => {
  it('no service reads it, except the storage registry and account deletion', () => {
    const allowed = new Set(['services/persistence/storage.ts', 'services/account/accountService.ts']);
    const offenders = walk(join(SRC, 'services')).filter((f) => !allowed.has(rel(f))).filter((f) => JUNIOR_REF.test(strip(readFileSync(f, 'utf8')))).map(rel);
    expect(offenders).toEqual([]);
  });
  it('the scored pipeline never mentions it', () => {
    const offenders = walk(join(SRC, 'domain/igcse')).filter((f) => JUNIOR_REF.test(strip(readFileSync(f, 'utf8')))).map(rel);
    expect(offenders).toEqual([]);
  });
  it('the keys are account-scoped, not device-scoped', () => {
    const storage = readFileSync(join(SRC, 'services/persistence/storage.ts'), 'utf8');
    const start = storage.indexOf('const DEVICE_SCOPED');
    const deviceScoped = storage.slice(start, storage.indexOf(']);', start));
    expect(deviceScoped).not.toMatch(/junior|learnerTrack/);
  });
  it('the domain module imports nothing from storage, sessions or XP', () => {
    const code = strip(readFileSync(join(SRC, 'domain/junior/state.ts'), 'utf8'));
    expect(code).not.toMatch(/^import /m);
  });
});
