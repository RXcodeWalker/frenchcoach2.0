import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- bookstore`'s word
 * list (118 candidates from the full graph). Only the `fiction` branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for the
 * other 9 unauthored start intents is a later Stage 9 pass. register is
 * 'formal' to match bookstore's npc.register.
 */
export const bookstoreDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le roman', en: 'novel', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'fiction_start'], rank: 'core',
    },
    {
      fr: 'le roman policier', en: 'detective novel', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['fiction_start'], rank: 'core',
    },
    {
      fr: 'la science-fiction', en: 'science fiction', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['fiction_start'], rank: 'core',
    },
    {
      fr: 'le stock', en: 'stock', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['check_stock'], rank: 'core',
    },
    {
      fr: "l'exemplaire", en: 'copy (of a book)', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['check_stock'], rank: 'core',
    },
    {
      fr: 'la carte', en: 'card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['go_to_cashier', 'confirm_payment_card'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['go_to_cashier', 'confirm_payment_cash'], rank: 'core',
    },
    {
      fr: 'Vous cherchez un livre en particulier ?', en: 'Are you looking for a particular book?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Plutôt roman policier, science-fiction ou classique ?', en: 'More detective, sci-fi, or classic?',
      pos: 'question', register: 'formal', usedInStates: ['fiction_start'], rank: 'core',
    },
    {
      fr: 'Bonne lecture !', en: 'Enjoy your reading!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'classique', en: 'classic', pos: 'adj',
      register: 'neutral', usedInStates: ['fiction_start'], rank: 'extend',
    },
    {
      fr: 'le rayon', en: 'shelf / section', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['check_stock'], rank: 'extend',
    },
    {
      fr: 'la rupture de stock', en: 'out of stock', pos: 'phrase',
      register: 'neutral', usedInStates: ['check_stock'], rank: 'extend',
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
      fr: 'Ça fera 15 euros 90.', en: "That'll be 15 euros 90.",
      pos: 'phrase', register: 'formal', usedInStates: ['go_to_cashier'], rank: 'extend',
    },
    {
      fr: 'Très bien, par carte.', en: 'Very well, by card.',
      pos: 'phrase', register: 'formal', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'À bientôt !', en: 'See you soon!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'extend',
    },
  ],
};
