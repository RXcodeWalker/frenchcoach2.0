import { describe, it, expect } from 'vitest';
import { fixMatch } from '../fixMatch';

/**
 * "Try it first": the check only ever says yes. `unsure` is not "wrong" — the
 * caller reveals the answer either way — so a valid alternative must land there.
 */

const QUOTE = "j'ai allé";
const CORRECTION = 'je suis allé';

describe('fixMatch — match', () => {
  it('accepts the whole correction', () => {
    expect(fixMatch('je suis allé', QUOTE, CORRECTION, 'text')).toBe('match');
  });

  it('accepts the correction inside a longer sentence', () => {
    expect(fixMatch('Hier je suis allé au cinéma avec mes amis', QUOTE, CORRECTION, 'text')).toBe('match');
  });

  it('accepts just the changed word (« suis ») when the correction only adds it', () => {
    expect(fixMatch('suis', 'je allé', 'je suis allé', 'text')).toBe('match');
    expect(fixMatch('suis allé', 'je allé', 'je suis allé', 'text')).toBe('match');
  });

  it('ignores case, edge punctuation and extra whitespace', () => {
    expect(fixMatch('  Je   suis allé!  ', QUOTE, CORRECTION, 'text')).toBe('match');
  });

  it("treats a typographic apostrophe as a straight one", () => {
    expect(fixMatch("c’est un bon film", "c'est une bon film", "c'est un bon film", 'text')).toBe('match');
    expect(fixMatch("c'est un bon film", "c’est une bon film", "c’est un bon film", 'text')).toBe('match');
  });

  it('accepts the added and removed words in a different sentence (« la » for « le »)', () => {
    expect(fixMatch('la maison est grande', 'le maison', 'la maison', 'text')).toBe('match');
  });

  it('folds accents when the error is not about accents', () => {
    expect(fixMatch('je suis alle', QUOTE, CORRECTION, 'text')).toBe('match');
  });

  it('does not match inside a longer word (« suis » is not in « suisse »)', () => {
    expect(fixMatch('je vais en suisse', 'je allé', 'je suis allé', 'text')).toBe('unsure');
  });
});

describe('fixMatch — accents', () => {
  it('keeps accents strict when the quote and correction differ only by accents', () => {
    expect(fixMatch("j'ai mangé", "j'ai mange", "j'ai mangé", 'text')).toBe('match');
    expect(fixMatch("j'ai mange", "j'ai mange", "j'ai mangé", 'text')).toBe('unsure');
  });

  it('strict accents also hold for the changed-word rule', () => {
    expect(fixMatch('mangé', "j'ai mange", "j'ai mangé", 'text')).toBe('match');
    expect(fixMatch('mange', "j'ai mange", "j'ai mangé", 'text')).toBe('unsure');
  });
});

describe('fixMatch — unsure, never wrong', () => {
  it('returns only match or unsure', () => {
    for (const attempt of ['je suis allé', 'on est allés', 'bonjour', '', '   ', "j'ai allé"]) {
      expect(['match', 'unsure']).toContain(fixMatch(attempt, QUOTE, CORRECTION, 'text'));
    }
  });

  it('a valid alternative is unsure, not a mistake (« on est allés » for « nous sommes allés »)', () => {
    // The error was the auxiliary (« avons »); « on est » fixes it differently from the model's « sommes ».
    expect(fixMatch('on est allés', 'nous avons allés', 'nous sommes allés', 'text')).toBe('unsure');
  });

  it('but an attempt that makes the targeted fix in other words still matches', () => {
    // Only the agreement was wrong (« allé » → « allés »); « on est allés » has fixed exactly that.
    expect(fixMatch('on est allés', 'nous sommes allé', 'nous sommes allés', 'text')).toBe('match');
  });

  it('repeating the error is unsure', () => {
    expect(fixMatch("j'ai allé", QUOTE, CORRECTION, 'text')).toBe('unsure');
  });

  it('an empty attempt or correction is unsure', () => {
    expect(fixMatch('', QUOTE, CORRECTION, 'text')).toBe('unsure');
    expect(fixMatch('je suis allé', QUOTE, '', 'text')).toBe('unsure');
  });

  it('a word the correction removes still being there is unsure', () => {
    // The added word is present, but so is the word that should have gone.
    expect(fixMatch('le la maison', 'le maison', 'la maison', 'text')).toBe('match'); // containment: « la maison »
    expect(fixMatch('la le chat', 'le maison', 'la maison', 'text')).toBe('unsure'); // « maison » absent, « le » present
  });

  it('an attempt can never match a correction that only deletes words', () => {
    expect(fixMatch('bonjour', 'je suis très allé', 'je suis allé', 'text')).toBe('unsure');
    expect(fixMatch('je suis allé', 'je suis très allé', 'je suis allé', 'text')).toBe('match');
  });

  it('works without a quote', () => {
    expect(fixMatch('je suis allé', '', CORRECTION, 'text')).toBe('match');
    expect(fixMatch('suis', '', CORRECTION, 'text')).toBe('unsure');
  });
});

describe('fixMatch — spoken answers', () => {
  it('accepts a sound-alike of the correction for speech only', () => {
    // « choses » vs « chose »: the silent plural cannot be heard, so the transcript spelling is not the learner's.
    expect(fixMatch('beaucoup de chose', 'beaucoup de choses', 'beaucoup de chose', 'speech')).toBe('match');
    expect(fixMatch('beaucoup de choses', 'beaucoup de chose', 'beaucoup de choses', 'speech')).toBe('match');
    expect(fixMatch('beaucoup de chose', 'beaucoup de choses', 'beaucoup de choses', 'speech')).toBe('match');
    expect(fixMatch('beaucoup de chose', 'beaucoup de choses', 'beaucoup de choses', 'text')).toBe('unsure');
    expect(fixMatch('beaucoup de chose', 'beaucoup de choses', 'beaucoup de choses', undefined)).toBe('unsure');
  });

  it('a spoken sound-alike does not forgive an audible difference', () => {
    expect(fixMatch("j'ai mange", "j'ai mange", "j'ai mangé", 'speech')).toBe('unsure');
  });
});
