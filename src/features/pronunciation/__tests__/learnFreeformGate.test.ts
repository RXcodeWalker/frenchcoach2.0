/**
 * Owner D1 (pronunciation-lab plan §1.1, §9): while the Lab is live, Learn
 * never sends a free answer for word analysis — the answer's recording only
 * feeds "How it sounded" locally. Learn has no render harness, so this pins the
 * gate in its source: the Lab-live early return sits between getting this
 * attempt's blob and the one freeform request, and "How it sounded" is passed
 * only while the Lab is live.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LEARN = readFileSync(join(__dirname, '../../../screens/Learn.tsx'), 'utf8');

describe('Learn: no freeform pronunciation request while the Lab is live (D1)', () => {
  it('has exactly one freeform request, and the Lab gate returns before it', () => {
    const freeform = [...LEARN.matchAll(/mode: 'freeform'/g)].map((m) => m.index);
    expect(freeform).toHaveLength(1);
    const blob = LEARN.indexOf('await recording.audioBlobPromise();');
    const gate = LEARN.indexOf('if (pronunciationLabLive) {\n        setAnswerBlob(blob);\n        return;\n      }');
    expect(blob).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(blob);
    expect(gate).toBeLessThan(freeform[0]!);
  });

  it('passes "How it sounded" only while the Lab is live', () => {
    expect(LEARN).toMatch(/howItSounded=\{\s*pronunciationLabLive\s*\?/);
  });
});
