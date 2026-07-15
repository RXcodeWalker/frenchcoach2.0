import { describe, expect, it } from 'vitest';
import { classifyUtteranceIntent } from '../utteranceIntents';

describe('classifyUtteranceIntent', () => {
  const cases: Array<[string, ReturnType<typeof classifyUtteranceIntent>]> = [
    // dont_know — whole-utterance, precision-first
    ['Je ne sais pas', 'dont_know'],
    ['je sais pas', 'dont_know'],
    ["j'ai aucune idée", 'dont_know'],
    ['Aucune idée.', 'dont_know'],
    ['Je ne comprends pas', 'dont_know'],
    ['Je ne comprends pas la question', 'dont_know'],
    ['Euh, je sais pas', 'dont_know'],
    ['JE NE SAIS PAS', 'dont_know'],

    // repeat_request
    ['Peux-tu répéter ?', 'repeat_request'],
    ['Pouvez-vous répéter la question ?', 'repeat_request'],
    ['Pardon ?', 'repeat_request'],
    ['Comment ?', 'repeat_request'],
    ['Encore une fois ?', 'repeat_request'],
    ['Répétez, s\'il vous plaît', 'repeat_request'],

    // non_french — conservative English list
    ['What?', 'non_french'],
    ["I don't know", 'non_french'],
    ['Can you repeat that?', 'non_french'],
    ['Can you repeat the question?', 'non_french'],
    ['Sorry?', 'non_french'],

    // answer — substantive content, including phrases that CONTAIN a non-answer marker
    ['Je fais mes devoirs et je range ma chambre le soir.', 'answer'],
    ['Je ne sais pas exactement mais je pense que le sport est important pour la santé.', 'answer'],
    ["Je ne comprends pas pourquoi mais j'aime beaucoup le français et les mathématiques.", 'answer'],
    ['Hier, je suis allé au marché avec ma mère pour acheter des légumes frais.', 'answer'],
    ['', 'answer'],
    ['   ', 'answer'],
  ];

  it.each(cases)('classifies %j as %s', (input, expected) => {
    expect(classifyUtteranceIntent(input)).toBe(expected);
  });

  it('is anchored on the whole normalized utterance, not a substring match', () => {
    // "comment" appears inside a longer substantive sentence — must not trip repeat_request.
    expect(classifyUtteranceIntent("Comment dit-on 'bibliothèque' en anglais, je me demande souvent.")).toBe('answer');
  });
});
