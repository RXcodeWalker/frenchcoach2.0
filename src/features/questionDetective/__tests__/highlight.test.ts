import { describe, expect, it } from 'vitest';
import { highlightWord } from '../highlight';

describe('highlightWord', () => {
  it('marks quelle as the whole word, not quel plus le', () => {
    const parts = highlightWord('Tu aimes quelle couleur ?', 'quel');
    expect(parts.word).toBe('quelle');
    expect(parts.before).toBe('Tu aimes ');
    expect(parts.after).toBe(' couleur ?');
  });

  it('marks the word at the end, front and est-ce que', () => {
    expect(highlightWord('Tu habites où ?', 'ou').word).toBe('où');
    expect(highlightWord('Où habites-tu ?', 'ou').word).toBe('Où');
    expect(highlightWord('Où est-ce que tu habites ?', 'ou').word).toBe('Où');
  });
});
