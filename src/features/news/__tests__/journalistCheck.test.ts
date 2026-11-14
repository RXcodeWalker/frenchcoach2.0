import { describe, expect, it } from 'vitest';
import { checkJournalistQuestion, questionWordsIn } from '../show/journalistCheck';
import { journalistOutcome } from '../show/journalistReply';

describe('journalistCheck', () => {
  it('hears a question word wherever it sits: front, end, est-ce que, inversion', () => {
    expect(questionWordsIn('Quand est-ce que le train part ?')).toEqual(['quand']);
    expect(questionWordsIn('Le train part quand ?')).toEqual(['quand']);
    expect(questionWordsIn('Quand part le train ?')).toEqual(['quand']);
    expect(questionWordsIn('Pourquoi les marins ont-ils fait ce voyage ?')).toEqual(['pourquoi']);
    expect(questionWordsIn('combien de ruches')).toEqual(['combien']);
  });

  it("reads qu'est-ce que / qu'est-ce qui / quoi / a leading que as one word, never as « qui »", () => {
    expect(questionWordsIn("Qu'est-ce que le robot mesure ?")).toEqual(['questce']);
    expect(questionWordsIn('Qu’est-ce qui a surpris les enfants ?')).toEqual(['questce']);
    expect(questionWordsIn('Sur quoi repose le système ?')).toEqual(['questce']);
    expect(questionWordsIn('Que fais-tu ?')).toEqual(['questce']);
    expect(questionWordsIn('Est-ce que tu viens ?')).toEqual([]);
  });

  it('tells « où » from « ou » (or), and hears « quelle heure » as when', () => {
    expect(questionWordsIn('Où va le train ?')).toEqual(['ou']);
    expect(questionWordsIn("D'où vient cette méthode ?")).toEqual(['ou']);
    expect(questionWordsIn('ou va le train')).toEqual(['ou']); // a recogniser dropping the accent, first word
    expect(questionWordsIn("Tu préfères le train ou l'avion ?")).toEqual([]);
    expect(questionWordsIn('À quelle heure part le train ?')).toEqual(['quand']);
    expect(questionWordsIn('De quelle couleur est la grenouille ?')).toEqual(['quel']);
  });

  it("is right when the goal's word is used, names the other word on a mix-up, and says none otherwise", () => {
    expect(checkJournalistQuestion('Quand est-ce que le train part ?', 'quand')).toEqual({ verdict: 'right' });
    expect(checkJournalistQuestion('Où est-ce que le train part ?', 'quand')).toEqual({ verdict: 'mixup', given: 'ou' });
    expect(checkJournalistQuestion('Le train part ce soir.', 'quand')).toEqual({ verdict: 'none' });
    // A relative « qui » in a right question does not spoil it.
    expect(checkJournalistQuestion('Quand la fille qui chante arrive-t-elle ?', 'quand')).toEqual({ verdict: 'right' });
  });
});

describe('journalistOutcome', () => {
  const target = {
    goal: 'Find out when the train leaves.',
    word: 'quand' as const,
    question: 'Quand part le train ?',
    answer: { fr: 'Il part le soir.', en: 'It leaves in the evening.' },
  };

  it("gives Henri's answer for the right word", () => {
    expect(journalistOutcome(target, 'Quand est-ce que le train part ?')).toEqual({
      response: { kind: 'reply', lead: 'Bonne question !', fr: 'Il part le soir.', en: 'It leaves in the evening.' },
      mixup: null,
    });
  });

  it('nudges with both words on a mix-up, and without giving the word away when none was heard', () => {
    const mix = journalistOutcome(target, 'Où part le train ?');
    expect(mix.mixup).toBe('ou');
    expect(mix.response.kind === 'nudge' && mix.response.message).toMatch(/« où ».*« quand »/);
    const none = journalistOutcome(target, 'Le train part.');
    expect(none.mixup).toBeNull();
    expect(none.response.kind === 'nudge' && none.response.message).not.toContain('quand');
  });
});
