// ── Phase 2 hard gate ───────────────────────────────────────────────────────
// evidenceBuilder.ts must no longer import FeedbackV2 directly — the actual
// projection logic (and its FeedbackV2 dependency, via the temporary bridge)
// lives entirely in evidenceProjection.ts. This proves the split is real: the
// public entry point re-exports without smuggling in its own FeedbackV2-shaped
// logic (i-am-building-an-cosmic-cascade.md §10.7 Phase 2 exit criterion).
//
// evidenceProjection.ts is intentionally NOT asserted to be FeedbackV2-free —
// it still consumes FeedbackV2 today via wrapFeedbackAsEvidenceObservations,
// the bridge that keeps live behavior correct until a real EvidenceProfile
// producer exists in the app (see that file's header comment). What this test
// pins is that evidenceBuilder.ts, the module the rest of the app imports
// from, is a pure re-export with no FeedbackV2 coupling of its own.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('no FeedbackV2 import in evidenceBuilder.ts', () => {
  it('evidenceBuilder.ts has no import/export statement naming FeedbackV2', () => {
    const source = readFileSync(join(__dirname, '../evidenceBuilder.ts'), 'utf8');
    const importsAndExports = source
      .split('\n')
      .filter(line => /^(import|export)\b/.test(line.trim()));
    for (const line of importsAndExports) {
      expect(line).not.toMatch(/FeedbackV2/);
    }
  });

  it('evidenceBuilder.ts is a thin re-export (no local logic beyond exports)', () => {
    const source = readFileSync(join(__dirname, '../evidenceBuilder.ts'), 'utf8');
    const codeLines = source
      .split('\n')
      .filter(line => !line.trim().startsWith('//') && line.trim().length > 0);
    for (const line of codeLines) {
      expect(line).toMatch(/^(export|import)\b/);
    }
  });
});
