import { describe, expect, it } from 'vitest';
import { compareRetake } from '../compareRetake';

const AUX = { quote: "j'ai allé", correction: 'je suis allé' };
const ARTICLE = { quote: 'le maison', correction: 'la maison' };

const states = (fixes: Array<{ quote: string; correction: string }>, retake: string) =>
  compareRetake(fixes, [], retake).fixes.map((f) => f.state);

describe('compareRetake — per fix', () => {
  it('heard: the whole correction is in the retake', () => {
    expect(states([AUX], "Hier je suis allé au cinéma avec mes amis")).toEqual(['heard']);
  });

  it('heard: the edit it makes is there, with its neighbouring word', () => {
    // « suis allé » is the edit plus the unchanged word beside it; « je » differs.
    expect(states([{ quote: "j'ai allé au parc", correction: 'je suis allé au parc' }], 'moi je suis allé au parc hier')).toEqual(['heard']);
  });

  it('heard: a retake that only re-says the fix, spelt differently but sounding the same (spoken)', () => {
    // « aux jeux » and « au jeu » sound alike — the recogniser's spelling is not the learner's.
    expect(states([{ quote: 'à jeux', correction: 'aux jeux' }], 'au jeu')).toEqual(['heard']);
  });

  it('still: the exact error words come back and the correction does not', () => {
    expect(states([ARTICLE], "j'ai vu le maison de mon ami")).toEqual(['still']);
  });

  it('absent: a paraphrase that sidesteps the structure is never a miss', () => {
    expect(states([AUX], 'hier nous avons visité un musée')).toEqual(['absent']);
    expect(states([ARTICLE], 'mon appartement est grand')).toEqual(['absent']);
  });

  it('a lone changed word elsewhere in a long answer is not "heard"', () => {
    // « suis » is the added word, but not beside « allé »: that is not the fix.
    expect(states([AUX], 'je suis content parce que le film était long')).toEqual(['absent']);
  });

  it('is not "still" when the error words are part of the correction', () => {
    // quote « allé » sits inside « je suis allé »: hearing it proves nothing.
    expect(states([{ quote: 'allé', correction: 'je suis allé' }], 'hier il est allé au parc')).toEqual(['absent']);
  });

  it('heard wins over still when both are said', () => {
    expect(states([ARTICLE], 'la maison, pas le maison')).toEqual(['heard']);
  });

  it('keeps accents strict when the fix is only an accent', () => {
    const fix = { quote: "j'ai mange", correction: "j'ai mangé" };
    expect(states([fix], "hier j'ai mangé une pizza")).toEqual(['heard']);
    expect(states([fix], "hier j'ai mange une pizza")).toEqual(['still']);
  });

  it('folds case, typographic apostrophes and punctuation', () => {
    expect(states([AUX], 'Hier, JE SUIS ALLÉ.')).toEqual(['heard']);
    expect(states([{ quote: 'je ai', correction: "j'ai" }], 'oui j’ai un chat')).toEqual(['heard']);
  });

  it('judges every fix on its own', () => {
    expect(states([AUX, ARTICLE], 'je suis allé voir le maison')).toEqual(['heard', 'still']);
  });
});

describe('compareRetake — strengths and the empty retake', () => {
  it('lists a strength as kept only when it is said again; otherwise stays silent', () => {
    const r = compareRetake([], ['mes amis', 'mon frère'], "j'ai vu mes amis");
    expect(r.kept).toEqual(['mes amis']);
  });

  it('an empty or non-speech retake is flagged empty, with nothing "heard", "still" or kept', () => {
    for (const retake of ['', '   ', '...']) {
      const r = compareRetake([AUX], ['mes amis'], retake);
      expect(r.empty).toBe(true);
      expect(r.fixes.map((f) => f.state)).toEqual(['absent']);
      expect(r.kept).toEqual([]);
    }
  });

  it('a real retake is not empty even when it hears nothing relevant', () => {
    const r = compareRetake([AUX], [], 'bonjour');
    expect(r.empty).toBe(false);
    expect(r.fixes[0].state).toBe('absent');
  });
});
