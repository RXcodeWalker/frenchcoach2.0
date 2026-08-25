import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- store`'s word list
 * (227 candidates from the full graph). Only the `clothing` branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for the
 * other 16 unauthored start intents and the `shoes` branch is a later
 * Stage 9 pass. register is 'formal' to match store's npc.register.
 */
export const storeDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le vêtement', en: 'garment / item of clothing', pos: 'noun', gender: 'm', article: 'le', pluralFr: 'les vêtements',
      register: 'neutral', usedInStates: ['ask_clothing_type'], rank: 'core',
    },
    {
      fr: 'le pull', en: 'sweater', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_clothing_type'], rank: 'core',
    },
    {
      fr: 'le manteau', en: 'coat', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_clothing_type'], rank: 'core',
    },
    {
      fr: 'la taille', en: 'size (clothing)', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_size'], rank: 'core',
    },
    {
      fr: 'le stock', en: 'stock', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['check_stock'], rank: 'core',
    },
    {
      fr: 'la caisse', en: 'checkout / till', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['go_to_cashier'], rank: 'core',
    },
    {
      fr: 'la carte bancaire', en: 'bank card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_payment', 'confirm_payment_card'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['ask_payment', 'confirm_payment_cash'], rank: 'core',
    },
    {
      fr: 'Je peux vous aider à trouver quelque chose ?', en: 'Can I help you find something?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Quel type de vêtement cherchez-vous ?', en: 'What type of clothing are you looking for?',
      pos: 'question', register: 'formal', usedInStates: ['ask_clothing_type'], rank: 'core',
    },
    {
      fr: 'Vous faites quelle taille ?', en: 'What size are you?',
      pos: 'question', register: 'formal', usedInStates: ['ask_size'], rank: 'core',
    },
    {
      fr: 'Comment souhaitez-vous régler ?', en: 'How would you like to pay?',
      pos: 'question', register: 'formal', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'Au revoir et bonne journée !', en: 'Goodbye and have a good day!',
      pos: 'phrase', register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'la réserve', en: 'stockroom', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_size', 'check_stock'], rank: 'extend',
    },
    {
      fr: 'le coloris', en: 'colour (of a product)', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['check_stock'], rank: 'extend',
    },
    {
      fr: 'accompagner', en: 'to accompany', pos: 'verb',
      register: 'neutral', usedInStates: ['go_to_cashier'], rank: 'extend',
    },
    {
      fr: 'le ticket de caisse', en: 'receipt', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'la monnaie', en: 'change (coins)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not "money" in general (argent) — only change handed back.',
      register: 'neutral', usedInStates: ['confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'Bonne nouvelle, on a votre taille en stock !', en: 'Good news, we have your size in stock!',
      pos: 'phrase', register: 'formal', usedInStates: ['check_stock'], rank: 'extend',
    },
    {
      fr: 'Parfait, suivez-moi à la caisse !', en: 'Perfect, follow me to the till!',
      pos: 'phrase', register: 'formal', usedInStates: ['go_to_cashier'], rank: 'extend',
    },
  ],
};
