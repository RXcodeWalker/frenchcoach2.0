import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- market`'s word list
 * (254 candidates from the full graph). Only the `fruit` branch is authored
 * (Stage 9a), so the deck is scoped to that path — vocab for the other 19
 * unauthored start intents and the `vegetable` branch is a later Stage 9
 * pass. register is 'informal' to match market's npc.register.
 */
export const marketDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'les fruits', en: 'fruit', pos: 'noun', gender: 'm', article: 'les', pluralFr: 'les fruits',
      register: 'neutral', usedInStates: ['start', 'ask_fruit_type'], rank: 'core',
    },
    {
      fr: 'la pomme', en: 'apple', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_fruit_type'], rank: 'core',
    },
    {
      fr: 'la fraise', en: 'strawberry', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_fruit_type'], rank: 'core',
    },
    {
      fr: 'le kilo', en: 'kilogram', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_quantity'], rank: 'core',
    },
    {
      fr: 'la quantité', en: 'quantity', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_quantity'], rank: 'core',
    },
    {
      fr: 'la carte', en: 'card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_payment', 'confirm_payment_card'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['ask_payment', 'confirm_payment_cash'], rank: 'core',
    },
    {
      fr: 'Regardez mes beaux fruits et légumes !', en: 'Look at my beautiful fruit and vegetables!',
      pos: 'phrase', register: 'informal',
      usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Quels fruits est-ce que vous voulez ?', en: 'Which fruit do you want?',
      pos: 'question', register: 'informal',
      usedInStates: ['ask_fruit_type'], rank: 'core',
    },
    {
      fr: 'Quelle quantité est-ce que je vous mets ?', en: 'How much shall I give you?',
      pos: 'question', literalEn: 'What quantity do I put for you?', register: 'informal',
      usedInStates: ['ask_quantity'], rank: 'core',
    },
    {
      fr: 'Et avec ça, je vous mets autre chose ?', en: 'Anything else with that?',
      pos: 'question', literalEn: 'And with that, do I put something else for you?', register: 'informal',
      usedInStates: ['ask_anything_else'], rank: 'core',
    },
    {
      fr: 'Comment vous réglez ?', en: 'How are you paying?', pos: 'question',
      literalEn: 'How do you settle?', register: 'informal',
      usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'Merci beaucoup et à bientôt !', en: 'Thank you very much, see you soon!',
      pos: 'phrase', register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'peser', en: 'to weigh', pos: 'verb',
      register: 'neutral', usedInStates: ['ask_quantity'], rank: 'extend',
    },
    {
      fr: 'mûr', en: 'ripe', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_fruit_type'], rank: 'extend',
    },
    {
      fr: 'frais', en: 'fresh', pos: 'adj',
      register: 'neutral', usedInStates: ['start'], rank: 'extend',
    },
    {
      fr: 'le ticket', en: 'receipt', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'la monnaie', en: 'change (coins)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not "money" in general (argent) — only change handed back.',
      register: 'neutral', usedInStates: ['confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'Non merci, ce sera tout.', en: 'No thanks, that will be all.',
      pos: 'phrase', register: 'informal', usedInStates: ['ask_anything_else'], rank: 'extend',
    },
    {
      fr: 'Très bien, on prend la carte depuis cette année.', en: "Very well, we've taken cards since this year.",
      pos: 'phrase', register: 'informal', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
  ],
};
