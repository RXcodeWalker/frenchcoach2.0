import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- cafe`'s word list
 * (184 candidates from the full graph). Only the `coffee` branch is authored
 * (Stage 9a), so the deck is scoped to that path — vocab for the other 20
 * unauthored start intents is a later Stage 9 pass. register is 'informal'
 * to match cafe's npc.register (a café waiter addresses customers as tu/vous
 * informally in this corpus's convention).
 */
export const cafeDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le café', en: 'coffee', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'ask_coffee'], rank: 'core',
    },
    {
      fr: 'le lait', en: 'milk', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_milk_sugar'], rank: 'core',
    },
    {
      fr: 'le sucre', en: 'sugar', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_milk_sugar'], rank: 'core',
    },
    {
      fr: 'nature', en: 'plain / black (no milk or sugar)', pos: 'adj',
      note: 'Used invariably here for a coffee taken with nothing added.',
      register: 'neutral', usedInStates: ['ask_milk_sugar'], rank: 'core',
    },
    {
      fr: 'la carte', en: 'card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['show_total', 'confirm_payment_card'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['show_total', 'confirm_payment_cash'], rank: 'core',
    },
    {
      fr: 'la monnaie', en: 'change (coins)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not "money" in general (argent) — only change handed back.',
      register: 'neutral', usedInStates: ['confirm_payment_cash'], rank: 'core',
    },
    {
      fr: 'Qu\'est-ce que je vous sers ?', en: 'What can I get you?',
      pos: 'question', literalEn: 'What do I serve you?',
      register: 'informal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Qu\'est-ce que vous prendrez comme café ?', en: 'What coffee will you have?',
      pos: 'question', register: 'informal',
      usedInStates: ['ask_coffee'], rank: 'core',
    },
    {
      fr: 'Avec du lait, du sucre, ou nature ?', en: 'With milk, sugar, or plain?',
      pos: 'question', register: 'informal',
      usedInStates: ['ask_milk_sugar'], rank: 'core',
    },
    {
      fr: 'Ça vous fera 4 euros.', en: 'That will be 4 euros.',
      pos: 'phrase', literalEn: 'That will make you 4 euros.',
      register: 'informal', usedInStates: ['show_total'], rank: 'core',
    },
    {
      fr: 'Bonne journée !', en: 'Have a good day!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'le terminal', en: 'card machine', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'sans contact', en: 'contactless', pos: 'phrase',
      register: 'neutral', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'insérer', en: 'to insert', pos: 'verb',
      register: 'neutral', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'préparer', en: 'to prepare', pos: 'verb',
      register: 'neutral', usedInStates: ['confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'boire', en: 'to drink', pos: 'verb',
      register: 'neutral', usedInStates: ['start'], rank: 'extend',
    },
    {
      fr: 'Parfait, je vous apporte le terminal tout de suite.', en: 'Perfect, I\'ll bring the card machine right away.',
      pos: 'phrase', register: 'informal',
      usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'Très bien, en espèces alors.', en: 'Very well, cash then.',
      pos: 'phrase', register: 'informal',
      usedInStates: ['confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'Merci et à très bientôt !', en: 'Thanks and see you soon!',
      pos: 'phrase', register: 'neutral',
      usedInStates: ['end_session'], rank: 'extend',
    },
  ],
};
