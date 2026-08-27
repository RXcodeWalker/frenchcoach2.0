import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- police_station`'s
 * word list (398 candidates from the full graph — a large, pre-existing
 * deeply-branched graph). Scoped to the `theft` branch's core reporting
 * beats (incident, description, ID, receipt). register is 'formal' to
 * match police_station's npc.register.
 */
export const policeStationDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'la plainte', en: 'complaint (legal)', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'dérobé', en: 'stolen', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_theft_details'], rank: 'core',
    },
    {
      fr: 'la description', en: 'description', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_description'], rank: 'core',
    },
    {
      fr: "la pièce d'identité", en: 'ID document', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_id'], rank: 'core',
    },
    {
      fr: 'le récépissé', en: 'receipt (of a report)', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['provide_copy'], rank: 'core',
    },
    {
      fr: 'Que puis-je faire pour vous ?', en: 'What can I do for you?', pos: 'question',
      register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: "Où et quand cela s'est-il passé ?", en: 'Where and when did it happen?',
      pos: 'question', register: 'formal', usedInStates: ['ask_theft_details'], rank: 'core',
    },
    {
      fr: "Pouvez-vous me donner une description précise de l'objet ?", en: 'Can you give me a precise description of the item?',
      pos: 'question', register: 'formal', usedInStates: ['ask_description'], rank: 'core',
    },
    {
      fr: "J'ai besoin de votre pièce d'identité pour enregistrer votre déclaration.", en: 'I need your ID to register your statement.',
      pos: 'phrase', register: 'formal', usedInStates: ['ask_id'], rank: 'core',
    },
    {
      fr: 'Au revoir.', en: 'Goodbye.', pos: 'phrase',
      register: 'formal', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'la déclaration', en: 'statement / declaration', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_id'], rank: 'extend',
    },
    {
      fr: 'enregistrer', en: 'to register / record', pos: 'verb',
      register: 'neutral', usedInStates: ['ask_id', 'process_report'], rank: 'extend',
    },
    {
      fr: 'conserver', en: 'to keep', pos: 'verb',
      register: 'neutral', usedInStates: ['provide_copy'], rank: 'extend',
    },
  ],
};
