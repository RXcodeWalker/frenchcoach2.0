import { describe, expect, it } from 'vitest';
import { CHUNK_MAX_WORDS, practiceChunks } from '../practiceChunks';
import { tokenizeSentence } from '../textFeatures';

describe('practiceChunks', () => {
  it('keeps a one-sentence answer whole', () => {
    expect(practiceChunks('Les enfants jouent dans le jardin.')).toEqual(['Les enfants jouent dans le jardin.']);
  });

  it('cuts a longer answer into its sentences, in order, each with its own punctuation', () => {
    const text = "J'habite à Londres. J'aime le football ! Et toi, est-ce que tu aimes le sport ?";
    expect(practiceChunks(text)).toEqual(["J'habite à Londres.", "J'aime le football !", 'Et toi, est-ce que tu aimes le sport ?']);
  });

  it('cuts a very long sentence at its commas, never mid-clause, and every piece stays short', () => {
    const text =
      "Je m'appelle Paul, j'habite à Londres avec ma famille, et j'aime beaucoup jouer au football avec mes amis le week-end, parce que c'est amusant.";
    const chunks = practiceChunks(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(tokenizeSentence(chunk).length).toBeLessThanOrEqual(CHUNK_MAX_WORDS);
    // Nothing is lost or reordered (a cut-off comma aside).
    expect(chunks.join(' ').replace(/,/g, '')).toBe(text.replace(/,/g, ''));
    // The last piece keeps the sentence's own full stop.
    expect(chunks[chunks.length - 1].endsWith('amusant.')).toBe(true);
  });

  it('leaves a long sentence with no comma whole rather than breaking it', () => {
    const text = 'Je pense que le sport est très important pour la santé de tous les jeunes qui vivent dans une grande ville moderne.';
    expect(tokenizeSentence(text).length).toBeGreaterThan(CHUNK_MAX_WORDS);
    expect(practiceChunks(text)).toEqual([text]);
  });

  it('does not leave a tiny tail piece on its own', () => {
    const text = 'Le week-end dernier je suis allé au cinéma avec mes amis et nous avons vu un film très amusant sur les animaux, oui.';
    const chunks = practiceChunks(text);
    for (const chunk of chunks) expect(tokenizeSentence(chunk).length).toBeGreaterThanOrEqual(3);
  });

  it('returns nothing for text with no letters', () => {
    expect(practiceChunks('  … ')).toEqual([]);
    expect(practiceChunks('')).toEqual([]);
  });
});
