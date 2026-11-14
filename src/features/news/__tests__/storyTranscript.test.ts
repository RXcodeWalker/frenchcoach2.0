import { describe, expect, it } from 'vitest';
import { segmentWithGlossary } from '../newsText';

describe('segmentWithGlossary', () => {
  it('marks glossary words case-insensitively, longest phrase first, without overlaps', () => {
    const segs = segmentWithGlossary('Les panneaux solaires chargent les batteries.', [
      { fr: 'panneaux', en: 'panels' }, { fr: 'panneaux solaires', en: 'solar panels' }, { fr: 'Batteries', en: 'batteries' },
    ]);
    expect(segs.filter(s => s.gloss).map(s => s.text)).toEqual(['panneaux solaires', 'batteries']);
    expect(segs.map(s => s.text).join('')).toBe('Les panneaux solaires chargent les batteries.');
  });

  it('never marks a word inside a longer word', () => {
    const segs = segmentWithGlossary('Le parking devient un parc.', [{ fr: 'parc', en: 'park' }]);
    expect(segs.filter(s => s.gloss).map(s => s.text)).toEqual(['parc']);
    expect(segs[0].text).toBe('Le parking devient un ');
  });
});
