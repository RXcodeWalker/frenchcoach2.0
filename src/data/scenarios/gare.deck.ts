import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- gare`'s word list
 * (243 candidates from the full graph). Only the `ticket` branch is authored
 * (Stage 9a), so the deck is scoped to that path — vocab for the other 15
 * unauthored start intents is a later Stage 9 pass. register is 'formal'
 * to match gare's npc.register (a station agent addresses customers as vous).
 */
export const gareDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le billet', en: 'ticket', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'show_total', 'confirm_purchase_card', 'confirm_purchase_cash'], rank: 'core',
    },
    {
      fr: 'la destination', en: 'destination', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_destination'], rank: 'core',
    },
    {
      fr: 'aujourd\'hui', en: 'today', pos: 'adv',
      register: 'neutral', usedInStates: ['ask_departure_time'], rank: 'core',
    },
    {
      fr: 'une autre date', en: 'another date', pos: 'phrase',
      literalEn: 'another date', register: 'neutral',
      usedInStates: ['ask_departure_time'], rank: 'core',
    },
    {
      fr: 'les euros', en: 'euros', pos: 'noun', gender: 'm', article: 'les', pluralFr: 'les euros',
      register: 'neutral', usedInStates: ['show_total'], rank: 'core',
    },
    {
      fr: 'la carte bancaire', en: 'bank card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_payment_method', 'confirm_purchase_card'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['ask_payment_method', 'confirm_purchase_cash'], rank: 'core',
    },
    {
      fr: 'le tarif', en: 'fare / rate', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['show_total'], rank: 'core',
    },
    {
      fr: 'C\'est pour un billet de train ?', en: 'Is it for a train ticket?',
      pos: 'question', literalEn: 'It\'s for a train ticket?',
      register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Quelle est votre destination ?', en: 'What is your destination?',
      pos: 'question', register: 'formal',
      usedInStates: ['ask_destination'], rank: 'core',
    },
    {
      fr: 'Vous le prenez ?', en: 'Will you take it?', pos: 'question',
      literalEn: 'You take it?', register: 'formal',
      usedInStates: ['show_total'], rank: 'core',
    },
    {
      fr: 'Comment souhaitez-vous payer ?', en: 'How would you like to pay?',
      pos: 'question', register: 'formal',
      usedInStates: ['ask_payment_method'], rank: 'core',
    },
    {
      fr: 'Bon voyage !', en: 'Have a good trip!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'le trajet', en: 'the journey', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['show_total', 'end_session'], rank: 'extend',
    },
    {
      fr: 'l\'horaire', en: 'timetable / time slot', pos: 'noun', gender: 'm', article: 'l\'',
      register: 'neutral', usedInStates: ['ask_destination', 'offer_alternative'], rank: 'extend',
    },
    {
      fr: 'la réduction', en: 'discount', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['offer_alternative'], rank: 'extend',
    },
    {
      fr: 'la monnaie', en: 'change (coins)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not "money" in general (argent) — only change handed back.',
      register: 'neutral', usedInStates: ['confirm_purchase_cash'], rank: 'extend',
    },
    {
      fr: 'imprimé', en: 'printed', pos: 'adj',
      register: 'neutral', usedInStates: ['confirm_purchase_card'], rank: 'extend',
    },
    {
      fr: 'remboursable', en: 'refundable', pos: 'adj',
      register: 'neutral', usedInStates: ['ticket_refund_request_start'], rank: 'extend',
    },
    {
      fr: 'Ça vous coûtera 45 euros.', en: 'That will cost you 45 euros.',
      pos: 'phrase', literalEn: 'That to you will cost 45 euros.',
      register: 'formal', usedInStates: ['show_total'], rank: 'extend',
    },
    {
      fr: 'Pas de souci.', en: 'No problem.', pos: 'phrase',
      literalEn: 'No worry.', register: 'neutral',
      usedInStates: ['offer_alternative'], rank: 'extend',
    },
    {
      fr: 'C\'est réglé.', en: 'It\'s settled / paid.', pos: 'phrase',
      literalEn: 'It is settled.', register: 'neutral',
      usedInStates: ['confirm_purchase_card', 'confirm_purchase_cash'], rank: 'extend',
    },
  ],
};
