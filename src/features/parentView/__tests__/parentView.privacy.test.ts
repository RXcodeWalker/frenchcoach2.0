import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The parent view shows effort and progress, never what the learner said:
 * no transcript, question text or notebook leaves the device or the database
 * through it, and the page writes no app state, analytics or sound.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', '..');
const MIGRATION = join(SRC, '..', 'backend', 'supabase', 'migrations', '20261104090000_parent_links.sql');

function read(rel: string): string {
  return readFileSync(join(SRC, rel), 'utf8');
}

describe('parent view isolation', () => {
  const files = [
    'screens/ParentView.tsx',
    ...readdirSync(join(SRC, 'features', 'parentView')).filter(f => /\.tsx?$/.test(f)).map(f => `features/parentView/${f}`),
  ];

  it.each(files)('%s does not touch app state, storage, analytics, sound or the notebook', rel => {
    const src = read(rel);
    for (const banned of ['AppContext', 'useApp', 'persistence/storage', 'localStorage', 'telemetry', 'services/sound', 'notebook', 'posthog']) {
      expect(src, `${rel} mentions ${banned}`).not.toContain(banned);
    }
  });
});

describe.skipIf(!existsSync(MIGRATION))('get_parent_report (backend migration)', () => {
  const sql = existsSync(MIGRATION) ? readFileSync(MIGRATION, 'utf8') : '';
  const body = sql.slice(sql.indexOf('FUNCTION public.get_parent_report'));

  it('never returns transcripts or question text', () => {
    expect(body).not.toMatch(/transcript/i);
    expect(body).not.toMatch(/question_text/);
  });

  it('stores only a hash of the link token', () => {
    expect(sql).toMatch(/token_hash\s+text NOT NULL UNIQUE/);
    expect(sql).not.toMatch(/\btoken\s+text\b/);
  });
});
