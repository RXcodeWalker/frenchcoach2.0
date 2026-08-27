import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- cinema`'s word list
 * (211 candidates from the full graph). Only the `movie` branch is authored
 * (Stage 9a), so the deck is scoped to that path — vocab for the other 15
 * unauthored start intents is a later Stage 9 pass. register is 'informal'
 * to match cinema's npc.register.
 */
export const cinemaDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le film', en: 'film', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'la séance', en: 'showtime / screening', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_time'], rank: 'core',
    },
    {
      fr: 'le billet', en: 'ticket', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_ticket_count'], rank: 'core',
    },
    {
      fr: 'la place', en: 'seat / ticket', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start', 'show_total'], rank: 'core',
    },
    {
      fr: 'la carte', en: 'card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['show_total', 'confirm_payment_card'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['confirm_payment_cash'], rank: 'core',
    },
    {
      fr: 'Pour quel film voulez-vous des places ?', en: 'Which film do you want tickets for?',
      pos: 'question', register: 'informal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Pour quelle séance souhaitez-vous des billets ?', en: 'Which showtime do you want tickets for?',
      pos: 'question', register: 'informal', usedInStates: ['ask_time'], rank: 'core',
    },
    {
      fr: 'Combien de billets vous faut-il ?', en: 'How many tickets do you need?',
      pos: 'question', register: 'informal', usedInStates: ['ask_ticket_count'], rank: 'core',
    },
    {
      fr: 'Bon film !', en: 'Enjoy the film!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'le liquide', en: 'cash (colloquial)', pos: 'noun', gender: 'm', article: 'le',
      register: 'informal', usedInStates: ['show_total'], rank: 'extend',
    },
    {
      fr: 'imprimer', en: 'to print', pos: 'verb',
      register: 'neutral', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'la monnaie', en: 'change (coins)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not "money" in general (argent) — only change handed back.',
      register: 'neutral', usedInStates: ['confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'Ça vous fera 24 euros pour deux places.', en: "That'll be 24 euros for two seats.",
      pos: 'phrase', register: 'informal', usedInStates: ['show_total'], rank: 'extend',
    },
    {
      fr: 'Très bien, par carte.', en: 'Very well, by card.',
      pos: 'phrase', register: 'informal', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'Merci et bonne séance !', en: 'Thanks, enjoy the show!',
      pos: 'phrase', register: 'informal', usedInStates: ['end_session'], rank: 'extend',
    },
  ],
};
