import { describe, expect, it } from 'vitest';
import { judgeLine, judgeText, toWords, type Mark, type MarkKind } from '../judge';

const kinds = (marks: Mark[]): MarkKind[] => marks.map(m => m.kind);

describe('toWords', () => {
  it('drops edge punctuation and lone marks, and straightens apostrophes', () => {
    expect(toWords('« Où est ton sac ? »').map(w => w.text)).toEqual(['Où', 'est', 'ton', 'sac']);
    expect(toWords('C’est   l’été !').map(w => w.text)).toEqual(["C'est", "l'été"]);
  });

  it('notes a pause after a word, so a liaison is not assumed across a comma', () => {
    expect(toWords('Ils, ont').map(w => w.pause)).toEqual([true, false]);
  });
});

describe('judgeText: right answers', () => {
  it('is perfect for the exact line, whatever the capitals and punctuation', () => {
    for (const typed of ["J'ai un frère et une sœur.", "j'ai un frère et une sœur", "J’AI UN FRÈRE ET UNE SŒUR !!"]) {
      const v = judgeText("J'ai un frère et une sœur.", typed);
      expect(v.perfect, typed).toBe(true);
      expect(v.credit).toBe(1);
    }
  });

  it('ignores extra spaces and a space before « ? »', () => {
    expect(judgeText('Où est ton sac ?', '  où   est ton sac?  ').perfect).toBe(true);
  });
});

describe('judgeText: what is different about a word', () => {
  it('names a missing accent, and gives half credit', () => {
    const v = judgeText("l'été", "l'ete");
    expect(kinds(v.marks)).toEqual(['accent']);
    expect(v.credit).toBe(0.5);
    expect(v.perfect).toBe(false);
  });

  it('treats œ typed as oe as an accent-level slip', () => {
    expect(kinds(judgeText('la sœur', 'la soeur').marks)).toEqual(['ok', 'accent']);
  });

  it('names a missing apostrophe or hyphen', () => {
    expect(kinds(judgeText("J'ai faim", 'Jai faim').marks)).toEqual(['punct', 'ok']);
    expect(kinds(judgeText('le petit-déjeuner', 'le petit déjeuner').marks)).toEqual(['ok', 'punct']);
  });

  it('reads a hyphenated word typed with a space and no accent as one slip, not two', () => {
    const v = judgeText('peut-être', 'peut etre');
    expect(v.marks).toHaveLength(1);
    expect(v.marks[0]).toMatchObject({ target: 'peut-être', typed: 'peut etre' });
    expect(v.credit).toBe(0.5);
  });

  it('reads two words run together as one slip on each word', () => {
    const v = judgeText('je veux', 'jeveux');
    expect(kinds(v.marks)).toEqual(['punct', 'punct']);
    expect(v.marks[0].typed).toBe('jeveux');
    expect(v.marks[1].joined).toBe(true);
  });

  it('finds a close misspelling', () => {
    expect(kinds(judgeText('la bibliothèque', 'la bibliotèque').marks)).toEqual(['ok', 'spelling']);
    // a swapped pair of letters is one slip
    expect(kinds(judgeText('professeur', 'proffesseur').marks)).toEqual(['spelling']);
  });

  it('calls a different word wrong, and a very short near-miss wrong too', () => {
    expect(kinds(judgeText('le chat', 'le chien').marks)).toEqual(['ok', 'wrong']);
    expect(kinds(judgeText('un os', 'un or').marks)).toEqual(['ok', 'wrong']);
    // …whereas lit / li really do sound the same, and the shared table says so
    expect(kinds(judgeText('un lit', 'un li').marks)).toEqual(['ok', 'sound']);
  });
});

describe('judgeText: words that sound the same', () => {
  it('a / à', () => {
    const v = judgeText('Il va à Paris', 'Il va a Paris');
    expect(kinds(v.marks)).toEqual(['ok', 'ok', 'sound', 'ok']);
    expect(v.marks[2]).toMatchObject({ target: 'à', typed: 'a', soundClass: 'a' });
    expect(v.credit).toBe(0.75);
  });

  it('et / est, ces / ses, ou / où', () => {
    expect(judgeText('Il est grand et fort', 'Il et grand est fort').marks.filter(m => m.kind === 'sound')).toHaveLength(2);
    expect(judgeText('ces livres', 'ses livres').marks[0].kind).toBe('sound');
    expect(judgeText('Où est ton sac ?', 'Ou est ton sac').marks[0]).toMatchObject({ kind: 'sound', soundClass: 'ou' });
  });

  it('mangé / manger share a sound (the verb-ending class)', () => {
    expect(judgeText('Elle a mangé', 'Elle a manger').marks[2]).toMatchObject({ kind: 'sound', soundClass: 'e-sound' });
  });

  it('never calls an accent slip a different word, but does call a/à one', () => {
    expect(judgeText("l'école", "l'ecole").marks[0].kind).toBe('accent');
    expect(judgeText('à', 'a').marks[0].kind).toBe('sound');
  });

  it('a liaison tells on/ont apart before a vowel: that is a slip to listen for, not a free pass', () => {
    const v = judgeText('Ses parents ont acheté ces livres.', 'Ses parents on acheté ces livres.');
    const slip = v.marks.find(m => m.target === 'ont')!;
    expect(slip.kind).toBe('wrong');
    expect(slip.liaison).toBe(true);
    // …but before a consonant nothing is audible, so it is a sound-alike
    const before = judgeText('Ils ont deux chats', 'Ils on deux chats').marks.find(m => m.target === 'ont')!;
    expect(before.kind).toBe('sound');
  });
});

describe('judgeText: missing and extra words', () => {
  it('finds a missing word without throwing the rest out of line', () => {
    const v = judgeText('Il a un chat noir', 'Il a chat noir');
    expect(kinds(v.marks)).toEqual(['ok', 'ok', 'missing', 'ok', 'ok']);
    expect(v.credit).toBeCloseTo(0.8);
  });

  it('finds an extra word, and takes a little off', () => {
    const v = judgeText('Il a un chat', 'Il a un petit chat');
    expect(kinds(v.marks)).toEqual(['ok', 'ok', 'ok', 'extra', 'ok']);
    expect(v.credit).toBeCloseTo(0.875);
    expect(v.perfect).toBe(false);
  });

  it('marks a nothing-typed answer as everything missing', () => {
    const v = judgeText('la maison', '   ');
    expect(v.empty).toBe(true);
    expect(kinds(v.marks)).toEqual(['missing', 'missing']);
    expect(v.credit).toBe(0);
  });

  it('never goes below zero', () => {
    expect(judgeText('oui', 'non non non non').credit).toBe(0);
  });

  it('a digit is not the word', () => {
    expect(judgeText('huit heures', '8 heures').marks[0].kind).toBe('wrong');
  });
});

describe('judgeLine', () => {
  it('keeps the spelling the answer matches best', () => {
    const v = judgeLine(['la mer', 'la mère'], 'la mère');
    expect(v.perfect).toBe(true);
    expect(v.against).toBe('la mère');
  });

  it('stays on the main line when nothing matches better', () => {
    expect(judgeLine(['le chat', 'le chien'], 'la table').against).toBe('le chat');
  });
});
