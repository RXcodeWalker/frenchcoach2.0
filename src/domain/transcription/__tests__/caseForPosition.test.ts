import { describe, expect, it } from 'vitest';
import { caseForPosition } from '../caseForPosition';

describe('caseForPosition', () => {
  it('lower-cases a re-said word mid-sentence (« Je Le fais » never happens)', () => {
    expect(caseForPosition('le', 'Le', false)).toBe('le');
    expect(caseForPosition('gourmand', 'Gourmande', false)).toBe('gourmande');
  });

  it('capitalises at the start of a sentence', () => {
    expect(caseForPosition('je', 'je', true)).toBe('Je');
  });

  it('keeps a name that was already capitalised mid-sentence', () => {
    expect(caseForPosition('Paris', 'Paris', false)).toBe('Paris');
  });
});
