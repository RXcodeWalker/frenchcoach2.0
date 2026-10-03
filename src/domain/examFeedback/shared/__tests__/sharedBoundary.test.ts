/**
 * domain/examFeedback/shared/ is pure (ADR 0009): its only imports from the
 * audited engine are the text normalizer and `isQuoteGrounded`, and apart
 * from those only each other. This scans the real files, so a new import
 * fails here even if lint were bypassed.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SHARED_DIR = join(__dirname, '..');
const files = readdirSync(SHARED_DIR).filter((f) => f.endsWith('.ts'));

const ALLOWED = new Set(['../../igcse/text/normalize', '../../igcse/judgement/schema']);

function importPaths(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

describe('examFeedback/shared import boundary', () => {
  it('finds the five helper modules', () => {
    expect(files.sort()).toEqual([
      'descriptorCopyFilter.ts',
      'errorCategories.ts',
      'markClaimFilter.ts',
      'quoteRules.ts',
      'spellingOnly.ts',
    ]);
  });

  for (const file of files) {
    it(`${file} imports only the normalizer, isQuoteGrounded, or a sibling helper`, () => {
      const paths = importPaths(readFileSync(join(SHARED_DIR, file), 'utf8'));
      for (const p of paths) {
        const ok = ALLOWED.has(p) || /^\.\/[A-Za-z]+$/.test(p);
        expect(ok, `${file} imports ${p}`).toBe(true);
      }
    });
  }

  it('only quoteRules.ts reaches into judgement/, and only for isQuoteGrounded', () => {
    for (const file of files) {
      const source = readFileSync(join(SHARED_DIR, file), 'utf8');
      const imp = [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\.\/\.\.\/igcse\/judgement\/schema'/g)];
      if (file === 'quoteRules.ts') {
        expect(imp.map((m) => m[1].trim())).toEqual(['isQuoteGrounded']);
      } else {
        expect(imp).toEqual([]);
      }
    }
  });
});
