import { describe, expect, it } from 'vitest';
import { JUNIOR_PATTERNS, JUNIOR_QUESTIONS } from '../../../data/junior';
import { adj } from '../../../data/junior/build';
import type { JuniorPattern, JuniorSlotOption } from '../../../data/junior/types';
import { AGES, COLOUR_ADJS, COLOUR_NOUNS, PETS, SEASONS } from '../../../data/junior/vocab';
import { frameTarget, freeFrameTarget, matchAnswer, optionForms, themeVocabulary, type FrameTarget } from '../matchAnswer';

const pattern = (id: string): JuniorPattern => JUNIOR_PATTERNS.find((p) => p.id === id)!;
const target = (patternId: string, option: JuniorSlotOption): FrameTarget => frameTarget(pattern(patternId), option);

const aimeBleu = target('j-aime-le-X', COLOUR_NOUNS.bleu);
const aimeRouge = target('j-aime-le-X', COLOUR_NOUNS.rouge);
const aimeVert = target('j-aime-le-X', COLOUR_NOUNS.vert);
const aimeEte = target('j-aime-le-X', SEASONS[0]);
const ageDix = target('j-ai-N-ans', AGES.find((a) => a.id === 'dix')!);
const cielBleu = target('x-c-est-ADJ', COLOUR_ADJS.bleu);
const bananeVert = target('x-c-est-ADJ', COLOUR_ADJS.vert);
const grand = target('x-c-est-ADJ', adj('grand', 'grand', '🦒', 'tall', ['grande']));
const unChat = target('j-ai-un-X', PETS[0]);

/** The golden table: transcript → outcome for one target (junior-track §6). */
const GOLDEN: Array<[string, FrameTarget, string, 'got' | 'almost' | 'none']> = [
  // Plain and accented / unaccented
  ['exact sentence', aimeBleu, "J'aime le bleu.", 'got'],
  ['lower case, no punctuation', aimeBleu, "j'aime le bleu", 'got'],
  ['typographic apostrophe', aimeBleu, 'J’aime le bleu', 'got'],
  ['recogniser dropped the apostrophe', aimeBleu, 'j aime le bleu', 'got'],
  ['accented, elided article', aimeEte, "J'aime l'été", 'got'],
  ['unaccented, elided article', aimeEte, "j'aime l'ete", 'got'],
  ['unaccented, no elision', aimeEte, "j'aime le ete", 'got'],
  // le / la variants: the article is not a key word
  ['la instead of le', aimeBleu, "J'aime la bleu", 'got'],
  ['no article at all', aimeBleu, "J'aime bleu", 'got'],
  // 10 vs dix
  ['number as a word', ageDix, "J'ai dix ans", 'got'],
  ['number as digits', ageDix, "J'ai 10 ans", 'got'],
  ['number without « ans »', ageDix, "J'ai dix", 'almost'],
  ['a different number', ageDix, "J'ai onze ans", 'almost'],
  // grand / grande, and the other gendered colour forms
  ['masculine form', grand, "C'est grand", 'got'],
  ['feminine form', grand, "C'est grande", 'got'],
  ['feminine colour variant', bananeVert, "La banane, c'est verte", 'got'],
  // Empty and noise
  ['empty transcript', aimeBleu, '', 'none'],
  ['whitespace only', aimeBleu, '   ', 'none'],
  ['punctuation only', aimeBleu, '… ?', 'none'],
  ['unrelated French', aimeBleu, 'bonjour Léo', 'none'],
  // Partial
  ['only the chosen word', aimeBleu, 'bleu', 'almost'],
  ['only the core words', aimeBleu, "J'aime", 'almost'],
  ['the wrong colour', aimeBleu, "J'aime le rouge", 'almost'],
  ['core word inside the sentence', cielBleu, "Le ciel c'est bleu", 'got'],
  ['un chat', unChat, "J'ai un chat", 'got'],
  ['une chat (article not a key)', unChat, "J'ai une chat", 'got'],
  // English look-alikes are never the French word
  ['English « blue »', aimeBleu, 'blue', 'none'],
  ['recogniser spelling « blou »', aimeBleu, 'blou', 'none'],
  ['English « red »', aimeRouge, 'red', 'none'],
  ['English « green »', aimeVert, 'green', 'none'],
  ['English sentence', aimeBleu, 'I like blue', 'none'],
  ['French frame, English colour', aimeBleu, "J'aime le blue", 'almost'],
  ['French frame, « blou »', aimeBleu, "J'aime le blou", 'almost'],
  ['French frame, English « green »', aimeVert, "J'aime le green", 'almost'],
  ['English adjective after « c\'est »', cielBleu, "Le ciel c'est blue", 'almost'],
  // Whole words only
  ['« bleuet » is not « bleu » (whole words only)', aimeBleu, "J'aime bleuet", 'almost'],
];

describe('matchAnswer — golden table', () => {
  it.each(GOLDEN)('%s', (_name, t, transcript, expected) => {
    expect(matchAnswer(transcript, [t]).outcome).toBe(expected);
  });

  it('English look-alikes are never "got it" for bleu/rouge/vert, alone or in a French frame', () => {
    const cases: Array<[FrameTarget, string[]]> = [
      [aimeBleu, ['blue', 'blou', 'bleu-e', "J'aime le blue", "J'aime le blou", 'I like blue']],
      [aimeRouge, ['red', "J'aime le red", 'I like red']],
      [aimeVert, ['green', "J'aime le green", 'I like green', 'vair']],
    ];
    for (const [t, transcripts] of cases) {
      for (const tr of transcripts) expect(matchAnswer(tr, [t]).outcome, tr).not.toBe('got');
    }
  });
});

describe('matchAnswer — what was heard', () => {
  it('lists the authored key words heard and missing, never the transcript', () => {
    const r = matchAnswer('j aime le BLEU', [aimeBleu]);
    expect(r.frames[0]).toEqual({ outcome: 'got', heard: ["j'aime", 'bleu'], missing: [], slotOptionId: 'bleu' });
    expect(r.heard).toEqual(["j'aime", 'bleu']);
  });

  it('names the chosen word as missing when only the frame was said', () => {
    expect(matchAnswer("J'aime", [aimeBleu]).frames[0]).toEqual({
      outcome: 'almost',
      heard: ["j'aime"],
      missing: ['bleu'],
      slotOptionId: null,
    });
  });

  it('reports the authored word for a digit transcript', () => {
    expect(matchAnswer("J'ai 10 ans", [ageDix]).heard).toEqual(["j'ai", 'ans', 'dix']);
  });

  it('accepts digits only for a number slot', () => {
    expect(optionForms(AGES[2], 'number')).toEqual(['dix', '10']);
    expect(optionForms(COLOUR_NOUNS.bleu, 'noun')).toEqual(['bleu']);
    expect(optionForms(COLOUR_ADJS.vert, 'adjective')).toEqual(['vert', 'verte']);
  });
});

describe('matchAnswer — two-sentence turns', () => {
  const both = [ageDix, unChat];

  it('is got when every key word of both frames is heard', () => {
    const r = matchAnswer("J'ai dix ans. J'ai un chat.", both);
    expect(r.outcome).toBe('got');
    expect(r.frames.map((f) => f.outcome)).toEqual(['got', 'got']);
  });

  it('is almost when one sentence is missing', () => {
    const r = matchAnswer("J'ai dix ans", both);
    expect(r.outcome).toBe('almost');
    expect(r.frames.map((f) => f.outcome)).toEqual(['got', 'almost']);
  });

  it('is none when nothing is heard', () => {
    const r = matchAnswer('', both);
    expect(r.outcome).toBe('none');
    expect(r.frames.map((f) => f.outcome)).toEqual(['none', 'none']);
  });
});

describe('matchAnswer — Free step (any theme word)', () => {
  const vocab = themeVocabulary(JUNIOR_QUESTIONS, 'couleurs');
  const free = freeFrameTarget(pattern('j-aime-le-X'), vocab);

  it('collects each picture of the theme once', () => {
    const ids = vocab.map((o) => `${o.id}|${o.word}`);
    expect(new Set(ids).size).toBe(ids.length);
    expect(vocab.some((o) => o.word === 'bleu')).toBe(true);
    expect(themeVocabulary(JUNIOR_QUESTIONS, 'couleurs').some((o) => o.word === 'chat')).toBe(false);
  });

  it('counts the pattern with any theme word as got', () => {
    for (const tr of ["J'aime le vert", "J'aime le rose", "J'aime le marron"]) {
      expect(matchAnswer(tr, [free]).outcome, tr).toBe('got');
    }
    expect(matchAnswer("J'aime le vert", [free]).frames[0].slotOptionId).toBe('vert');
  });

  it('is almost for the pattern without a theme word, with nothing named missing', () => {
    const r = matchAnswer("J'aime le chat", [free]);
    expect(r.outcome).toBe('almost');
    expect(r.frames[0].missing).toEqual([]);
  });

  it('still never accepts an English look-alike', () => {
    expect(matchAnswer("J'aime le blue", [free]).outcome).toBe('almost');
    expect(matchAnswer('blue', [free]).outcome).toBe('none');
  });
});
