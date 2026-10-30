import { describe, expect, it } from 'vitest';
import { collapseRepeatedArticle, frenchWithArticle } from '../vocabDisplay';

describe('frenchWithArticle', () => {
  it('does not repeat an article already in the entry', () => {
    expect(frenchWithArticle({ fr: 'le pain', pos: 'noun', article: 'le' })).toBe('le pain');
    expect(frenchWithArticle({ fr: "l'ordonnance", pos: 'noun', article: "l'" })).toBe("l'ordonnance");
    expect(frenchWithArticle({ fr: 'les espèces', pos: 'noun', article: 'les' })).toBe('les espèces');
  });
  it('adds the article to a bare noun', () => {
    expect(frenchWithArticle({ fr: 'jour ouvré', pos: 'noun', article: 'le' })).toBe('le jour ouvré');
    expect(frenchWithArticle({ fr: 'horaire', pos: 'noun', article: "l'" })).toBe("l'horaire");
  });
  it('leaves non-nouns alone', () => {
    expect(frenchWithArticle({ fr: 'acheter', pos: 'verb' })).toBe('acheter');
  });
});

describe('collapseRepeatedArticle', () => {
  it('collapses a doubled article', () => {
    expect(collapseRepeatedArticle('le le pain')).toBe('le pain');
    expect(collapseRepeatedArticle('le pain')).toBe('le pain');
  });
});
