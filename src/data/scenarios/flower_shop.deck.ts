import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- flower_shop`'s word
 * list (140 candidates from the full graph). Only the `bouquet` branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for the
 * other 9 unauthored start intents is a later Stage 9 pass. register is
 * 'informal' to match flower_shop's npc.register.
 */
export const flowerShopDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le bouquet', en: 'bouquet', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'bouquet_start'], rank: 'core',
    },
    {
      fr: 'les couleurs vives', en: 'bright colours', pos: 'phrase',
      register: 'neutral', usedInStates: ['bouquet_start'], rank: 'core',
    },
    {
      fr: 'les tons pastel', en: 'pastel tones', pos: 'phrase',
      register: 'neutral', usedInStates: ['bouquet_start'], rank: 'core',
    },
    {
      fr: 'le budget', en: 'budget', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_budget'], rank: 'core',
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
      fr: "C'est pour offrir ou pour vous ?", en: 'Is it a gift or for yourself?',
      pos: 'question', register: 'informal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Plutôt des tons pastel ou des couleurs vives ?', en: 'More pastel tones or bright colours?',
      pos: 'question', register: 'informal', usedInStates: ['bouquet_start'], rank: 'core',
    },
    {
      fr: 'Quel budget avez-vous prévu ?', en: 'What budget did you have in mind?',
      pos: 'question', register: 'informal', usedInStates: ['ask_budget'], rank: 'core',
    },
    {
      fr: 'Au revoir !', en: 'Goodbye!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'les couleurs', en: 'colours', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les couleurs',
      register: 'neutral', usedInStates: ['ask_colors'], rank: 'extend',
    },
    {
      fr: 'la rose', en: 'rose', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'extend',
    },
    {
      fr: 'la monnaie', en: 'change (coins)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not "money" in general (argent) — only change handed back.',
      register: 'neutral', usedInStates: ['confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: "Voilà, c'est prêt !", en: 'There you go, it\'s ready!',
      pos: 'phrase', register: 'informal', usedInStates: ['go_to_cashier'], rank: 'extend',
    },
    {
      fr: 'Passez une excellente journée !', en: 'Have an excellent day!',
      pos: 'phrase', register: 'neutral', usedInStates: ['end_session'], rank: 'extend',
    },
  ],
};
