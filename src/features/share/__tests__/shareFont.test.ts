import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Share cards use the site's own face (Bricolage Grotesque) everywhere. The
// quoted-answer serif was tried and removed (owner, 2026-11-18): don't bring it back.
describe('share card typography', () => {
  const dir = join(__dirname, '..');
  const files = readdirSync(dir).filter(f => /\.(ts|tsx)$/.test(f));

  it.each(files)('%s names no serif face', file => {
    const code = readFileSync(join(dir, file), 'utf8');
    expect(code).not.toMatch(/Baskerville|Georgia|Times New Roman|(?<!sans-)\bserif\b|font-exam|exam-serif/i);
  });
});
