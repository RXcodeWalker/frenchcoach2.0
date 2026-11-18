import { describe, expect, it } from 'vitest';
import { tidyAnswer } from '../tidyAnswer';

describe('tidyAnswer', () => {
  it('capitalises the start and closes an unpunctuated caption', () => {
    expect(tidyAnswer("oui j'ai déjà essayé la poterie et c'est très amusant")).toBe("Oui j'ai déjà essayé la poterie et c'est très amusant.");
  });

  it('capitalises after each sentence end, including after a quote mark or accent', () => {
    expect(tidyAnswer('je suis content. élodie aussi ! et toi ? « ça va » oui')).toBe('Je suis content. Élodie aussi ! Et toi ? « ça va » oui.');
  });

  it('keeps already formatted text unchanged (idempotent)', () => {
    const good = "Oui, j'ai essayé. C'était très amusant !";
    expect(tidyAnswer(good)).toBe(good);
    expect(tidyAnswer(tidyAnswer('bonjour tout le monde'))).toBe('Bonjour tout le monde.');
  });

  it('never changes a word or adds interior punctuation', () => {
    const out = tidyAnswer('mon professeur il faisait du poterie donc il m’a aidé');
    expect(out.replace(/[.]$/, '').toLowerCase()).toBe('mon professeur il faisait du poterie donc il m’a aidé');
  });

  it('collapses spaces and handles empty text', () => {
    expect(tidyAnswer('  salut   les   amis ')).toBe('Salut les amis.');
    expect(tidyAnswer('   ')).toBe('');
  });

  it('does not add a full stop after a closing guillemet or question mark', () => {
    expect(tidyAnswer('comment ça va ?')).toBe('Comment ça va ?');
    expect(tidyAnswer('il a dit « bonjour »')).toBe('Il a dit « bonjour »');
  });
});
