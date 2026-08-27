import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- restaurant`'s word
 * list (232 candidates from the full graph). Only the `no` (walk-in) branch
 * is authored (Stage 9a), so the deck is scoped to that path — vocab for
 * `yes` and the other 19 unauthored start intents is a later Stage 9 pass.
 * register is 'formal' to match restaurant's npc.register.
 */
export const restaurantDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'la réservation', en: 'reservation', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'la table', en: 'table', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['offer_table'], rank: 'core',
    },
    {
      fr: 'le plat', en: 'main dish', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['order_main'], rank: 'core',
    },
    {
      fr: "l'addition", en: 'the bill', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['ask_bill'], rank: 'core',
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
      fr: 'Est-ce que vous avez réservé une table ?', en: 'Have you booked a table?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Vous êtes combien de personnes ce soir ?', en: 'How many people are you this evening?',
      pos: 'question', register: 'formal', usedInStates: ['check_availability'], rank: 'core',
    },
    {
      fr: 'Qu\'est-ce que vous prenez comme plat ?', en: 'What will you have for your main?',
      pos: 'question', register: 'formal', usedInStates: ['order_main'], rank: 'core',
    },
    {
      fr: 'Comment souhaitez-vous régler ?', en: 'How would you like to pay?',
      pos: 'question', register: 'formal', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'Merci et bonne soirée !', en: 'Thank you and have a good evening!',
      pos: 'phrase', register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'la fenêtre', en: 'window', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['offer_table'], rank: 'extend',
    },
    {
      fr: 'la commande', en: 'order', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['confirm_order'], rank: 'extend',
    },
    {
      fr: 'la cuisine', en: 'kitchen', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['confirm_order'], rank: 'extend',
    },
    {
      fr: 'le reçu', en: 'receipt', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'la monnaie', en: 'change (coins)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not "money" in general (argent) — only change handed back.',
      register: 'neutral', usedInStates: ['confirm_payment_cash'], rank: 'extend',
    },
  ],
};
