import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- flight`'s word list
 * (220 candidates from the full graph). Only the `yes` (found seat) branch
 * is authored (Stage 9a), so the deck is scoped to that path — vocab for
 * the other 15 unauthored start intents is a later Stage 9 pass. register
 * is 'formal' to match flight's npc.register.
 */
export const flightDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le siège', en: 'seat', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'boire', en: 'to drink', pos: 'verb',
      register: 'neutral', usedInStates: ['ask_drink'], rank: 'core',
    },
    {
      fr: 'le repas', en: 'meal', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_meal'], rank: 'core',
    },
    {
      fr: 'manger', en: 'to eat', pos: 'verb',
      register: 'neutral', usedInStates: ['ask_meal'], rank: 'core',
    },
    {
      fr: 'Puis-je vous aider ?', en: 'May I help you?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: "Qu'est-ce que je vous sers à boire ?", en: 'What can I get you to drink?',
      pos: 'question', register: 'formal', usedInStates: ['ask_drink'], rank: 'core',
    },
    {
      fr: "Et pour manger, qu'est-ce que vous prenez ?", en: 'And what will you have to eat?',
      pos: 'question', register: 'formal', usedInStates: ['ask_meal'], rank: 'core',
    },
    {
      fr: 'Autre chose pour votre confort ?', en: 'Anything else for your comfort?',
      pos: 'question', register: 'formal', usedInStates: ['ask_anything_else'], rank: 'core',
    },
    {
      fr: "Bon vol et merci d'avoir choisi notre compagnie !", en: 'Enjoy your flight and thank you for choosing our airline!',
      pos: 'phrase', register: 'formal', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'le vin', en: 'wine', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_drink'], rank: 'extend',
    },
    {
      fr: 'le risotto', en: 'risotto', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_meal'], rank: 'extend',
    },
    {
      fr: 'chaud', en: 'hot', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_drink'], rank: 'extend',
    },
    {
      fr: 'froid', en: 'cold', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_drink'], rank: 'extend',
    },
    {
      fr: 'Non merci, ce sera tout.', en: 'No thanks, that will be all.',
      pos: 'phrase', register: 'informal', usedInStates: ['ask_anything_else'], rank: 'extend',
    },
  ],
};
