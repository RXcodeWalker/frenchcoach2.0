import { describe, expect, it } from 'vitest';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from './fixtures';
import { detectPartsAddressed, rolePlayPartsByTask } from '../parts';

describe('detectPartsAddressed', () => {
  it('two-part task both addressed -> 2', () => {
    expect(detectPartsAddressed('C est combien ? Je paie par carte.', 2)).toBe(2);
  });

  it('two-part task second part dropped -> 1', () => {
    expect(detectPartsAddressed('C est combien ?', 2)).toBe(1);
  });

  it('single-part task -> 1', () => {
    expect(detectPartsAddressed('Bonjour madame.', 1)).toBe(1);
  });
});

describe('rolePlayPartsByTask', () => {
  it('uses partsExpected from transcript', () => {
    const rows = rolePlayPartsByTask(EVIDENCE_GOLDEN_TRANSCRIPT);
    const task = rows.find((row) => row.taskId === 't2');
    expect(task?.partsExpected).toBe(2);
    expect(task?.partsAddressed).toBe(2);
  });
});
