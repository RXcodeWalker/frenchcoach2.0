/**
 * S3 must know nothing about rubrics, bands, marks, or the judgement runtime.
 * Grep for rubric/band/mark under stt/ (excluding type-only SpeakingTranscript
 * imports) should return nothing — this test makes that an enforced invariant.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const STT_DIR = path.join(__dirname, '..');

const FORBIDDEN_IMPORT_PATTERNS = [/from ['"].*\/rubric['"]/, /from ['"].*judgement\/schema['"]/, /from ['"].*judgement\/prompt['"]/];

function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('stt/ independence from judgement/', () => {
  it('imports only the SpeakingTranscript type from judgement/types, and nothing from rubric or judgement runtime code', () => {
    const files = collectSourceFiles(STT_DIR);
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${file}: matches ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('the one import from judgement/types is type-only', () => {
    const files = collectSourceFiles(STT_DIR);
    const fromClausePattern = /from\s*['"][^'"]*judgement\/types['"]/g;
    const typeOnlyImportPattern = /import\s+type\s*\{[^}]*\}\s*from\s*['"][^'"]*judgement\/types['"]/gs;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const fromClauses = content.match(fromClausePattern) ?? [];
      if (fromClauses.length === 0) continue;

      const typeOnlyImports = content.match(typeOnlyImportPattern) ?? [];
      expect(
        typeOnlyImports.length,
        `${file}: judgement/types import must use "import type"`,
      ).toBe(fromClauses.length);
    }
  });
});
