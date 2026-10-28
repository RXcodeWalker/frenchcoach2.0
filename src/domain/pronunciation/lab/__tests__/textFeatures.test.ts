import { describe, expect, it } from 'vitest';
import { soundFeatures, tokenizeSentence, watchOutFor } from '../textFeatures';

function underlined(sentence: string, feature: ReturnType<typeof soundFeatures>[number]): string[] {
  const tokens = tokenizeSentence(sentence);
  return feature.highlights.map((h) => tokens[h.tokenIndex].text.slice(h.start, h.end));
}

describe('tokenizeSentence', () => {
  it('drops punctuation-only tokens and keeps each word\'s offset into its text', () => {
    const tokens = tokenizeSentence('« Bonjour, ça va ? »');
    expect(tokens.map((t) => t.norm)).toEqual(['bonjour', 'ça', 'va']);
    expect(tokens[0]).toMatchObject({ text: 'Bonjour,', normOffset: 0 });
  });
});

describe('soundFeatures', () => {
  it('finds a liaison across two words and plays the group', () => {
    const sentence = 'Les enfants jouent.';
    const liaison = soundFeatures(sentence).find((f) => f.family === 'liaison')!;
    expect(liaison).toMatchObject({ tokenIndex: 0, endTokenIndex: 1, playText: 'les enfants' });
    expect(underlined(sentence, liaison)).toEqual(['s', 'e']);
  });

  it('underlines the letters of each feature', () => {
    const sentence = 'Mon frère aime le vin rouge.';
    const features = soundFeatures(sentence);
    const r = features.find((f) => f.family === 'frenchR' && f.playText === 'frère')!;
    expect(underlined(sentence, r)).toEqual(['r', 'r']);
    const nasal = features.find((f) => f.family === 'nasalIn')!;
    expect(underlined(sentence, nasal)).toEqual(['in']);
    const accent = features.find((f) => f.family === 'eAccents')!;
    expect(underlined(sentence, accent)).toEqual(['è']);
  });

  it('claims nothing an ambiguous spelling can\'t support', () => {
    // souvent's -ent may be nasal or silent: neither is claimed.
    const families = soundFeatures('Je sors souvent.').filter((f) => f.playText === 'souvent').map((f) => f.family);
    expect(families).not.toContain('nasalAn');
    expect(families).not.toContain('silentFinal');
  });

  it('does not link into h aspiré', () => {
    expect(soundFeatures('Les haricots sont verts.').some((f) => f.family === 'liaison')).toBe(false);
  });

  it('sees elision', () => {
    expect(soundFeatures("J'aime l'école.").filter((f) => f.family === 'elision').map((f) => f.playText)).toEqual(["j'aime", "l'école"]);
  });
});

describe('watchOutFor', () => {
  it('returns at most 3, one per group, in reading order', () => {
    const picks = watchOutFor('Les enfants jouent dans le jardin.');
    expect(picks.length).toBeLessThanOrEqual(3);
    expect(picks.map((f) => f.family)).toEqual(['liaison', 'uOu', 'nasalAn']);
    const indices = picks.map((f) => f.tokenIndex);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it('never names two nasal families for one sentence', () => {
    const picks = watchOutFor('Un bon vin blanc.');
    expect(picks.filter((f) => f.family.startsWith('nasal'))).toHaveLength(1);
  });

  it('finds the classic u / ou pair', () => {
    expect(watchOutFor('Tu as vu tout le monde ?').map((f) => f.family)).toContain('uOu');
  });

  it('is empty for a sentence with nothing to flag', () => {
    expect(watchOutFor('Papa a la pomme.')).toEqual([]);
  });
});
