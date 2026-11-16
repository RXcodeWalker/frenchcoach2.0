/**
 * Clients have no INSERT on `profiles` (security review 2026-11, F1, backend migration
 * 20261116090000): the signup trigger creates the row and the app only UPDATEs it. An upsert
 * is an INSERT … ON CONFLICT, so it would be refused even for an existing row.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../..');
const PROFILE_WRITE = /from\(\s*['"]profiles['"]\s*\)[\s\S]{0,200}?\.(insert|upsert)\(/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== '__tests__') out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe('profiles rows are never inserted from the client', () => {
  it('no source file inserts or upserts into profiles', () => {
    const files = sourceFiles(SRC);
    expect(files.length).toBeGreaterThan(100);
    expect(files.filter((f) => PROFILE_WRITE.test(readFileSync(f, 'utf8')))).toEqual([]);
  });
});
