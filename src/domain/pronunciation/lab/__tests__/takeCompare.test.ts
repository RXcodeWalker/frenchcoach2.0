import { describe, expect, it } from 'vitest';
import { compareTakes } from '../takeCompare';
import { buildLabTake } from '../wordStates';
import { azureWord, scripted } from './labFixtures';

const target = 'Je mange du pain.';
const take = (accuracies: number[], overrides = {}) =>
  buildLabTake(target, scripted(['je', 'mange', 'du', 'pain'].map((w, i) => azureWord(w, accuracies[i])), overrides));

describe('compareTakes (plan §3.2 step 4)', () => {
  it('reports first vs best ("2 → 4 words clear") and which words improved', () => {
    const result = compareTakes([take([90, 50, 70, 95]), take([90, 85, 65, 95]), take([90, 85, 82, 95])]);
    expect(result).toEqual({ firstIndex: 0, bestIndex: 2, firstClear: 2, bestClear: 4, total: 4, improved: [1, 2], improvedOverFirst: true });
  });

  it('a later take that ties the best wins; a worse one never does', () => {
    const tie = compareTakes([take([90, 85, 50, 95]), take([90, 85, 65, 95])]);
    expect(tie?.bestIndex).toBe(1);
    expect(tie?.improvedOverFirst).toBe(false);
    expect(compareTakes([take([90, 85, 82, 95]), take([40, 40, 40, 40])])?.bestIndex).toBe(0);
  });

  it('skips refused takes and takes of another sentence', () => {
    const other = buildLabTake('Tu manges du pain.', scripted(['tu', 'manges', 'du', 'pain'].map((w) => azureWord(w, 95))));
    const result = compareTakes([take([95, 95, 95, 95], { mode: 'freeform' }), take([90, 50, 50, 95]), other]);
    expect(result).toMatchObject({ firstIndex: 1, bestIndex: 1, firstClear: 2 });
  });

  it('is null with no usable take', () => {
    expect(compareTakes([])).toBeNull();
    expect(compareTakes([take([90, 90, 90, 90], { mode: 'freeform' })])).toBeNull();
  });
});
