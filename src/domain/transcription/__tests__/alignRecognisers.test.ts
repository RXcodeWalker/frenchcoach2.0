import { describe, expect, it } from 'vitest';
import { alignRecognisers, applyAlternatives } from '../alignRecognisers';

describe('alignRecognisers — agreement', () => {
  it('reports no spans when the two transcripts are the same', () => {
    const a = alignRecognisers("J'ai un frère.", "j'ai un frère");
    expect(a.spans).toEqual([]);
    expect(a.primaryText).toBe("J'ai un frère.");
  });

  it('ignores case, punctuation and extra spaces', () => {
    expect(alignRecognisers('Je  mange, le soir.', 'je mange le soir').spans).toEqual([]);
  });

  it('treats a hyphenated word and its spaced form as the same words', () => {
    expect(alignRecognisers('Je suis peut-être fatigué', 'je suis peut être fatigué').spans).toEqual([]);
  });

  it('returns no spans when either transcript is blank (one recogniser has no second opinion)', () => {
    expect(alignRecognisers('Je mange', '').spans).toEqual([]);
    expect(alignRecognisers('', 'je mange').spans).toEqual([]);
    expect(alignRecognisers('', '').primaryText).toBe('');
  });
});

describe('alignRecognisers — Category A is never a disagreement', () => {
  it('does not flag silent endings that sound the same', () => {
    // Chrome heard the singular, Whisper the plural: same sound before a consonant.
    expect(alignRecognisers('Mes frères mangent beaucoup', 'mes frères mange beaucoup').spans).toEqual([]);
  });

  it('does not flag et / est', () => {
    expect(alignRecognisers('Il est grand et blond', 'il et grand est blond').spans).toEqual([]);
  });

  it('does not flag a / à', () => {
    expect(alignRecognisers("Il a mal à la tête", 'il à mal a la tête').spans).toEqual([]);
  });

  it('shows the primary text in its context-consistent spelling and reports the change', () => {
    const a = alignRecognisers("J'ai un frère. Ils mange du pain.", "j'ai un frère il mange du pain");
    expect(a.primaryText).toContain('Il mange');
    expect(a.respelled.length).toBeGreaterThan(0);
    expect(a.spans).toEqual([]);
  });

  it('keeps the token count of the primary text unchanged', () => {
    const input = "J'ai un frère. Ils mange du pain.";
    expect(alignRecognisers(input, input).primaryText.split(' ')).toHaveLength(input.split(' ').length);
  });
});

describe('alignRecognisers — Category B', () => {
  it('flags a near sound-alike disagreement as nearHomophone', () => {
    const a = alignRecognisers('Ils ont un chien', 'ils sont en chien');
    expect(a.spans.map((s) => [s.kind, s.primaryWords, s.secondaryWords])).toEqual([
      ['nearHomophone', 'ont un', 'sont en'],
    ]);
    expect(a.spans[0].pairIds).toEqual(['ont~sont', 'un~en']);
    expect(a.spans[0].swappable).toBe(true);
  });

  it('flags a single un/en swap on its own', () => {
    const a = alignRecognisers('Il a un chat', 'il a en chat');
    expect(a.spans).toHaveLength(1);
    expect(a.spans[0]).toMatchObject({ kind: 'nearHomophone', start: 2, end: 3, primaryWords: 'un', secondaryWords: 'en' });
  });

  it('does not flag a Category B word both recognisers agree on (an agreed wrong word counts)', () => {
    expect(alignRecognisers('Ils sont un chien', 'ils sont un chien').spans).toEqual([]);
  });

  it('splits a near pair from a clearly different word beside it', () => {
    const a = alignRecognisers('Il a un chien', 'il a en chat');
    expect(a.spans.map((s) => [s.kind, s.primaryWords, s.secondaryWords])).toEqual([
      ['nearHomophone', 'un', 'en'],
      ['different', 'chien', 'chat'],
    ]);
  });
});

describe('alignRecognisers — clearly different words', () => {
  it('flags a substituted word as different', () => {
    const a = alignRecognisers('Je mange du poisson', 'je mange du poison');
    expect(a.spans).toHaveLength(1);
    expect(a.spans[0]).toMatchObject({ kind: 'different', primaryWords: 'poisson', secondaryWords: 'poison', swappable: true });
  });

  it('reports a word only the primary heard as a span with nothing to swap to', () => {
    const a = alignRecognisers('Je vais souvent à la plage', 'je vais à la plage');
    expect(a.spans).toHaveLength(1);
    expect(a.spans[0]).toMatchObject({ kind: 'different', primaryWords: 'souvent', secondaryWords: '', swappable: false });
  });

  it('reports a word only the secondary heard as an empty-range span', () => {
    const a = alignRecognisers('Je vais à la plage', 'je vais souvent à la plage');
    expect(a.spans).toHaveLength(1);
    expect(a.spans[0]).toMatchObject({ kind: 'different', start: 2, end: 2, primaryWords: '', secondaryWords: 'souvent', swappable: false });
  });

  it('widens a span to the whole hyphenated token', () => {
    const a = alignRecognisers('Je suis peut-être fatigué', 'je suis un autre fatigué');
    const span = a.spans[0];
    expect(span.primaryWords).toBe('peut-être');
    expect(span.start).toBe(2);
    expect(span.end).toBe(3);
  });

  it('lists spans in text order without overlap', () => {
    const a = alignRecognisers('Le chat noir dort sur le lit', 'le rat noir dort sous le lit');
    const spans = a.spans;
    expect(spans.length).toBe(2);
    expect(spans[0].end).toBeLessThanOrEqual(spans[1].start);
  });
});

describe('applyAlternatives', () => {
  it('returns the primary text unchanged when nothing is chosen', () => {
    const a = alignRecognisers('Ils ont un chien.', 'ils sont en chien');
    expect(applyAlternatives(a, [])).toBe('Ils ont un chien.');
  });

  it('swaps in the other recogniser’s words for the chosen span', () => {
    const a = alignRecognisers('Ils ont un chien.', 'ils sont en chien');
    expect(applyAlternatives(a, [0])).toBe('Ils sont en chien.');
  });

  it('keeps the punctuation and capital letter around the swapped words', () => {
    const a = alignRecognisers('« Un chat, » dit-il.', 'en chat dit il');
    expect(applyAlternatives(a, [0])).toBe('« En chat, » dit-il.');
  });

  it('swaps only the chosen span', () => {
    const a = alignRecognisers('Il a un chien', 'il a en chat');
    expect(applyAlternatives(a, [1])).toBe('Il a un chat');
    expect(applyAlternatives(a, [0, 1])).toBe('Il a en chat');
  });

  it('never swaps a span the other recogniser did not hear', () => {
    const a = alignRecognisers('Je vais souvent à la plage', 'je vais à la plage');
    expect(applyAlternatives(a, [0])).toBe('Je vais souvent à la plage');
  });

  it('keeps the token count when it swaps one word for one word', () => {
    const a = alignRecognisers('Il a un chat', 'il a en chat');
    expect(applyAlternatives(a, [0]).split(' ')).toHaveLength(4);
  });
});
