import { describe, it, expect } from 'vitest';
import {
  CLOSED_CLASSES,
  PATTERN_CLASSES,
  categoryAClass,
  soundsIdentical,
  soundsIdenticalInContext,
} from '../homophones/classes';
import { NEAR_PAIRS, nearPairOf } from '../homophones/nearPairs';

/** Owner's examples of "never penalised" spellings (transcription-accuracy plan, Category A). */
const CATEGORY_A: [string, string, string][] = [
  ['il', 'ils', 'il-ils'],
  ['mange', 'mangent', 'present-e'],
  ['mange', 'manges', 'present-e'],
  ['mangé', 'manger', 'e-sound'],
  ['mangé', 'mangez', 'e-sound'],
  ['mangé', 'mangeait', 'e-sound'],
  ['manger', 'mangeaient', 'e-sound'],
  ['commencé', 'commençait', 'e-sound'],
  ['allé', 'allées', 'e-sound'],
  ['été', 'était', 'e-sound'],
  ['chat', 'chats', 'silent-plural'],
  ['jeu', 'jeux', 'silent-plural'],
  ['an', 'ans', 'silent-plural'],
  ['ami', 'amie', 'silent-agreement'],
  ['ami', 'amies', 'silent-agreement'],
  ['seul', 'seule', 'silent-agreement'],
  ['bel', 'belle', 'silent-agreement'],
  ['pareil', 'pareille', 'silent-agreement'],
  ['vrai', 'vraie', 'silent-agreement'],
  ['fais', 'fait', 'silent-consonant'],
  ['finis', 'finit', 'silent-consonant'],
  ['viens', 'vient', 'silent-consonant'],
  ['connais', 'connaît', 'silent-consonant'],
  ['par', 'part', 'silent-consonant'],
  ['et', 'est', 'et-est'],
  ['a', 'à', 'a'],
  ['ou', 'où', 'ou'],
  ['ces', "c'est", 'ces-cest'],
  ['ses', "s'est", 'ces-cest'],
  ['on', 'ont', 'on-ont'],
  ['son', 'sont', 'son-sont'],
  ['peu', 'peut', 'peu'],
  ['leur', 'leurs', 'leur'],
  ['quel', 'quelle', 'quel'],
  ['la', 'là', 'la'],
  ['ça', 'sa', 'ca-sa'],
  ['cet', 'cette', 'cet'],
];

/** Audibly different pairs that must never be excused as Category A. */
const NOT_CATEGORY_A: [string, string][] = [
  // Owner's Category B list — audible.
  ['un', 'en'], ['ont', 'sont'], ['le', 'les'], ['du', 'de'],
  ['de', 'des'], ['ce', 'ces'], ['me', 'mes'], ['je', "j'ai"], ['en', 'on'],
  // Audible endings.
  ['mange', 'mangé'], ['petit', 'petite'], ['grand', 'grande'], ['gentil', 'gentille'],
  ['vend', 'vendent'], ['prend', 'prennent'], ['finit', 'finissent'], ['fait', 'font'],
  ['est', 'sont'], ['a', 'ont'], ['va', 'vont'],
  // Real words a pattern would otherwise pair.
  ['comme', 'comment'], ['pare', 'parent'], ['conte', 'content'], ['cher', 'chez'],
  ['fil', 'fils'], ['eu', 'eux'], ['bu', 'but'], ['ma', 'mat'], ['di', 'dix'],
  ['nez', 'né'], ['pie', 'pied'], ['fille', 'fil'],
  // Gender and article errors are audible.
  ['un', 'une'], ['le', 'la'], ['mon', 'ma'],
];

describe('Category A classes', () => {
  it.each(CATEGORY_A)('%s / %s sound the same (%s)', (a, b, id) => {
    expect(categoryAClass(a, b)?.id).toBe(id);
    expect(categoryAClass(b, a)?.id).toBe(id);
  });

  it.each(NOT_CATEGORY_A)('%s / %s are audibly different', (a, b) => {
    expect(categoryAClass(a, b)).toBeNull();
  });

  it('ignores case, apostrophe style and edge punctuation', () => {
    expect(categoryAClass('Ces,', 'C’est')?.id).toBe('ces-cest');
    expect(categoryAClass('«Il', 'ils»')?.id).toBe('il-ils');
  });

  it('compares elided words on the word after the apostrophe, with the same prefix', () => {
    expect(categoryAClass("s'appelle", "s'appellent")?.id).toBe('present-e');
    expect(categoryAClass("qu'il", "qu'ils")?.id).toBe('il-ils');
    expect(categoryAClass("s'appelle", "m'appellent")).toBeNull();
  });

  it('identical forms, empty input and multi-word input have no class', () => {
    expect(categoryAClass('mange', 'Mange')).toBeNull();
    expect(categoryAClass('', 'a')).toBeNull();
    expect(categoryAClass('il mange', 'ils mangent')).toBeNull();
  });

  it('every closed form is lower-case and unique across classes', () => {
    const seen = new Map<string, string>();
    for (const c of CLOSED_CLASSES) {
      for (const f of c.forms) {
        expect(f).toBe(f.toLowerCase());
        expect(seen.get(f), `${f} is in ${seen.get(f)} and ${c.id}`).toBeUndefined();
        seen.set(f, c.id);
      }
    }
  });

  it('class ids are unique', () => {
    const ids = [...CLOSED_CLASSES, ...PATTERN_CLASSES].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('liaison', () => {
  it('il / ils are only the same sound before a consonant or a pause', () => {
    expect(soundsIdenticalInContext('il', 'ils', 'mange', false)).toBe(true);
    expect(soundsIdenticalInContext('il', 'ils', 'aime', false)).toBe(false);
    expect(soundsIdenticalInContext('il', 'ils', 'habite', false)).toBe(false);
    expect(soundsIdenticalInContext('il', 'ils', 'aime', true)).toBe(true);
    expect(soundsIdenticalInContext('il', 'ils', undefined, false)).toBe(true);
  });

  it('liaison-free classes ignore the next word', () => {
    expect(soundsIdenticalInContext('mange', 'mangent', 'une', false)).toBe(true);
    expect(soundsIdenticalInContext('et', 'est', 'un', false)).toBe(true);
    expect(soundsIdenticalInContext('ami', 'amis', 'anglais', false)).toBe(true);
  });

  it('determiner classes are liaison-sensitive', () => {
    expect(soundsIdenticalInContext('mes', 'mais', 'amis', false)).toBe(false);
    expect(soundsIdenticalInContext('ces', "c'est", 'un', false)).toBe(false);
    expect(soundsIdenticalInContext('ces', "c'est", 'beau', false)).toBe(true);
  });
});

describe('soundsIdentical (quote vs correction)', () => {
  it.each([
    ['il mange', 'ils mangent'],
    ["j'ai manger", "j'ai mangé"],
    ['les chat', 'les chats'],
    ['il et grand', 'il est grand'],
    ['je vais a Paris', 'je vais à Paris'],
    ['Elle est allé.', 'elle est allée'],
  ])('%s → %s: inaudible', (q, c) => {
    expect(soundsIdentical(q, c)).toBe(true);
  });

  it.each([
    ['il aime', 'ils aiment'],
    ['il vend', 'ils vendent'],
    ['le chat', 'les chats'],
    ['je mange', "j'ai mangé"],
    ['un chien', 'en chien'],
    ['ils ont', 'ils sont'],
    ['petit', 'petite'],
    ['jai', "j'ai"],
    ['', ''],
  ])('%s → %s: audible', (q, c) => {
    expect(soundsIdentical(q, c)).toBe(false);
  });
});

describe('Category B near pairs', () => {
  it("contains the owner's fixed pairs", () => {
    for (const [a, b] of [['un', 'en'], ['ont', 'sont'], ['le', 'les'], ['du', 'de']]) {
      expect(nearPairOf(a, b), `${a}/${b}`).not.toBeNull();
      expect(nearPairOf(b, a), `${b}/${a}`).not.toBeNull();
    }
  });

  it('ignores case and punctuation; identical words are not a pair', () => {
    expect(nearPairOf('Un,', 'EN')?.id).toBe('un~en');
    expect(nearPairOf('un', 'un')).toBeNull();
    expect(nearPairOf('un', 'une')).toBeNull();
  });

  it('no near pair is also Category A (a pair is audible or it is not)', () => {
    for (const p of NEAR_PAIRS) {
      expect(categoryAClass(p.a, p.b), p.id).toBeNull();
    }
  });

  it('ids are unique', () => {
    expect(new Set(NEAR_PAIRS.map((p) => p.id)).size).toBe(NEAR_PAIRS.length);
  });
});
