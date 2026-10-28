import { describe, expect, it } from 'vitest';
import { guideTexts, isRecordableWord, lexiconTexts } from '../lexicon';
import { SOUND_TIPS } from '../tips';
import { tokenizeSentence, wordPlayTexts } from '../textFeatures';

describe('lexiconTexts', () => {
  it('holds every word as the Lab plays it: lowercase, edge punctuation off, inner apostrophe kept', () => {
    const texts = lexiconTexts(["J'aime « Les Enfants », c'est l'été !"]);
    expect(texts).toEqual(expect.arrayContaining(["j'aime", 'les', 'enfants', "c'est", "l'été"]));
    expect(texts.every((t) => t === t.toLowerCase())).toBe(true);
  });

  it('adds the two-word group of a liaison, because a word recorded alone loses it', () => {
    expect(lexiconTexts(['Les enfants jouent.'])).toContain('les enfants');
  });

  it('is exactly what wordPlayTexts asks for, sentence by sentence', () => {
    const sentences = ["Nous avons un grand appartement près de l'école.", 'Mes amis habitent en France.', 'Ils sont contents.'];
    const lexicon = new Set(lexiconTexts(sentences));
    for (const sentence of sentences) {
      tokenizeSentence(sentence).forEach((_, i) => {
        for (const text of wordPlayTexts(sentence, i)) expect(lexicon.has(text), `${sentence} → ${text}`).toBe(true);
      });
    }
  });

  it('lists each text once', () => {
    const texts = lexiconTexts(['Le chat. Le chat.', 'le CHAT']);
    expect(texts).toEqual(['le', 'chat']);
  });

  it('leaves out what Azure would have to guess at', () => {
    expect(lexiconTexts(['Je regarde la 3D et le co2, pas y penser.'])).toEqual(
      expect.not.arrayContaining(['3d', 'co2', 'y']),
    );
    expect(lexiconTexts(['Il a 16 ans.'])).toContain('16');
  });
});

describe('isRecordableWord', () => {
  it.each([['bonjour'], ["l'école"], ['est-ce'], ['les enfants'], ['2000']])('accepts %s', (w) => {
    expect(isRecordableWord(w)).toBe(true);
  });
  it.each([['y'], ['co2'], ['2d'], ['chargé(e'], ['le/la'], ['']])('rejects %s', (w) => {
    expect(isRecordableWord(w)).toBe(false);
  });
});

describe('guideTexts', () => {
  it('has every sound-guide example and minimal-pair word, exactly as authored', () => {
    const texts = new Set(guideTexts());
    for (const tip of Object.values(SOUND_TIPS)) {
      for (const text of [...tip.examples, ...(tip.minimalPair ?? [])]) expect(texts.has(text), text).toBe(true);
    }
  });

  it('is all recordable', () => {
    for (const text of guideTexts()) expect(isRecordableWord(text), text).toBe(true);
  });
});
