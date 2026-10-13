import { describe, it, expect } from 'vitest';
import { alignRecognisers, nearPartnersOf } from '../alignRecognisers';
import transcripts from './fixtures/set3Transcripts.json';

const kinds = (a: string, b: string | null) => alignRecognisers(a, b).spans.map((s) => s.kind);

describe('alignRecognisers: agreement', () => {
  it('finds no span when the texts differ only in case, punctuation and accents-kept spelling', () => {
    expect(alignRecognisers("C'est un bon film.", "c'est un bon film").spans).toEqual([]);
    expect(alignRecognisers('Vous aimez le chocolat ?', 'vous aimez le chocolat').spans).toEqual([]);
  });

  it('treats Category A sound-alikes as agreement (il mange / ils mangent, et / est, a / à)', () => {
    expect(alignRecognisers('Ils mangent à midi', 'Ils mangent a midi').spans).toEqual([]);
    expect(alignRecognisers('Il mange du pain', 'Ils mangent du pain').spans).toEqual([]);
    expect(alignRecognisers('Mon frère et sympa', 'Mon frère est sympa').spans).toEqual([]);
  });

  it('does not treat accent differences that change the word as agreement', () => {
    expect(kinds('Il a mangé', 'Il a manger')).toEqual([]); // é / er are one Category A class
    expect(kinds('Je suis né', 'Je suis ne')).toEqual(['different']);
  });
});

describe('alignRecognisers: disagreement', () => {
  it('flags a Category B disagreement as nearHomophone and offers the other recogniser’s word', () => {
    const r = alignRecognisers('Ils sont un chien', 'Ils ont un chien');
    expect(r.spans).toHaveLength(1);
    expect(r.spans[0]).toMatchObject({
      kind: 'nearHomophone',
      primaryStart: 1,
      primaryEnd: 2,
      primaryWords: ['sont'],
      secondaryWords: ['ont'],
      alternatives: ['ont'],
      origin: 'disagreement',
    });
  });

  it('judges each position of an equal-length run on its own', () => {
    expect(kinds('Ils sont en chien', 'Ils ont un chien')).toEqual(['nearHomophone', 'nearHomophone']);
    expect(kinds('Ils sont beau chien', 'Ils ont un chien')).toEqual(['nearHomophone', 'different']);
  });

  it('flags a clearly different word as different and keeps the primary range', () => {
    const r = alignRecognisers("C'est un beau film", "C'est un bon film");
    expect(r.spans).toEqual([
      expect.objectContaining({ kind: 'different', primaryStart: 2, primaryEnd: 3, primaryWords: ['beau'], alternatives: ['bon'] }),
    ]);
  });

  it('keeps unequal runs together as one different span', () => {
    const r = alignRecognisers("J'ai douche", "J'ai deux chats");
    expect(r.spans).toEqual([
      expect.objectContaining({ kind: 'different', primaryStart: 1, primaryEnd: 2, primaryWords: ['douche'], secondaryWords: ['deux', 'chats'], alternatives: ['deux chats'] }),
    ]);
  });

  it('records a word only the other recogniser heard as an empty primary range, and an extra primary word with no alternative', () => {
    const inserted = alignRecognisers('Je mange le matin', 'Je mange du pain le matin');
    expect(inserted.spans[0]).toMatchObject({ kind: 'different', primaryStart: 2, primaryEnd: 2, secondaryWords: ['du', 'pain'] });
    const extra = alignRecognisers('Hello les clés', 'les clés');
    expect(extra.spans[0]).toMatchObject({ kind: 'different', primaryWords: ['Hello'], alternatives: [] });
  });

  it('never throws on empty input', () => {
    expect(alignRecognisers('', '').spans).toEqual([]);
    expect(alignRecognisers('', 'bonjour').spans).toHaveLength(1);
  });
});

describe('alignRecognisers: a single recogniser', () => {
  it('flags every Category B word with its partners, and nothing else', () => {
    const r = alignRecognisers("J'aime un chien et du pain", null);
    expect(r.singleRecogniser).toBe(true);
    expect(r.spans.map((s) => [s.primaryWords[0], s.alternatives, s.origin])).toEqual([
      ['un', ['en'], 'single-recogniser'],
      ['du', ['de'], 'single-recogniser'],
    ]);
    expect(r.spans.every((s) => s.kind === 'nearHomophone')).toBe(true);
  });

  it('treats a blank second opinion as no second opinion', () => {
    expect(alignRecognisers('les chats', '   ').singleRecogniser).toBe(true);
  });

  it('lists all partners of a word that is in several pairs', () => {
    expect(nearPartnersOf('en')).toEqual(['un', 'on']);
    expect(nearPartnersOf('de')).toEqual(['des', 'du']);
    expect(nearPartnersOf('chien')).toEqual([]);
  });
});

/**
 * Real Whisper (large-v3) text for the owner's set-3 clips, against the
 * fixture's `referenceText` as a SYNTHETIC secondary. That reference is the
 * intended sentence, not real Chrome output (see the fixture's _comment), so
 * these tests say nothing about Chrome's accuracy: they exercise the aligner on
 * disagreements real Whisper actually produced.
 */
describe('alignRecognisers: real Whisper text vs a synthetic secondary (set 3)', () => {
  const byId = Object.fromEntries(transcripts.clips.map((c) => [c.clipId, c]));
  const spans = (id: string, field: 'largeV3NoPrompt' | 'largeV3QuestionPrompt') =>
    alignRecognisers(byId[id][field], byId[id].referenceText).spans;

  it('set3-05-correct: "Ils sont en chien" vs the intended "Ils ont un chien" is two Category B spans', () => {
    const s = spans('set3-05-correct', 'largeV3NoPrompt');
    expect(s.map((x) => [x.kind, x.primaryWords[0], x.alternatives[0]])).toEqual([
      ['nearHomophone', 'sont', 'ont'],
      ['nearHomophone', 'en', 'un'],
    ]);
  });

  it('agrees where Whisper is right (clips 01, 02, 04, 09 correct; 06 swap)', () => {
    for (const id of ['set3-01-correct', 'set3-02-correct', 'set3-04-correct', 'set3-09-correct']) {
      expect(spans(id, 'largeV3NoPrompt'), id).toEqual([]);
    }
    expect(spans('set3-06-swap', 'largeV3NoPrompt')).toEqual([]);
    expect(spans('set3-03-correct', 'largeV3NoPrompt')).toEqual([]);
  });

  it('flags clearly different words as different, not nearHomophone', () => {
    expect(spans('set3-03-swap', 'largeV3NoPrompt').map((x) => x.kind)).toEqual(['different']); // beau / bon
    expect(spans('set3-09-swap', 'largeV3QuestionPrompt').map((x) => x.kind)).toEqual(['different']); // vent / vin
    expect(spans('set3-08-swap', 'largeV3NoPrompt').map((x) => x.kind)).toEqual(['different']); // douche / deux chats
    expect(spans('set3-07-correct', 'largeV3NoPrompt').map((x) => x.kind)).toEqual(['different']); // Hello / Elle a
  });

  it('is deterministic over the whole fixture and never yields an inverted range', () => {
    for (const c of transcripts.clips) {
      for (const field of ['turboNoPrompt', 'largeV3NoPrompt', 'largeV3QuestionPrompt'] as const) {
        const a = alignRecognisers(c[field], c.referenceText);
        expect(alignRecognisers(c[field], c.referenceText)).toEqual(a);
        for (const s of a.spans) {
          expect(s.primaryEnd).toBeGreaterThanOrEqual(s.primaryStart);
          expect(s.primaryEnd).toBeLessThanOrEqual(a.primaryTokens.length);
        }
      }
    }
  });
});
