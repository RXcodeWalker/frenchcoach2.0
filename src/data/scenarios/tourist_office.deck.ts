import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- tourist_office`'s
 * word list (565 candidates from the full graph). Only the `activities`
 * branch is authored (Stage 9a), so the deck is scoped to that path —
 * vocab for the other 16 unauthored start intents is a later Stage 9 pass.
 * register is 'formal' to match tourist_office's npc.register.
 */
export const touristOfficeDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'les activités', en: 'activities', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les activités',
      register: 'neutral', usedInStates: ['ask_interests'], rank: 'core',
    },
    {
      fr: "Qu'est-ce qui vous passionne le plus ?", en: 'What fascinates you the most?',
      pos: 'question', register: 'formal', usedInStates: ['ask_interests'], rank: 'core',
    },
    {
      fr: 'la visite guidée', en: 'guided tour', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_tour'], rank: 'core',
    },
    {
      fr: "l'adulte", en: 'adult', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['book_tour'], rank: 'core',
    },
    {
      fr: 'la carte bancaire', en: 'bank card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'Comment puis-je vous aider dans l\'organisation de votre séjour ?', en: 'How can I help you organize your stay?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Cela vous tenterait ?', en: 'Would that interest you?', pos: 'question',
      register: 'formal', usedInStates: ['ask_tour'], rank: 'core',
    },
    {
      fr: 'Combien de personnes souhaitez-vous inscrire ?', en: 'How many people would you like to register?',
      pos: 'question', register: 'formal', usedInStates: ['book_tour'], rank: 'core',
    },
    {
      fr: 'Vous réglez par carte bancaire ou en espèces ?', en: 'Are you paying by card or in cash?',
      pos: 'question', register: 'formal', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: "la confirmation d'inscription", en: 'registration confirmation', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['confirm_payment_card', 'confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'la vieille ville', en: 'old town', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_tour'], rank: 'extend',
    },
    {
      fr: "l'artisan", en: 'craftsperson', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['ask_tour'], rank: 'extend',
    },
    {
      fr: "gratuit", en: 'free (of charge)', pos: 'adj',
      register: 'neutral', usedInStates: ['book_tour'], rank: 'extend',
    },
  ],
};
