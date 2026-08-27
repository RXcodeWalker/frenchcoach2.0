import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- post_office`'s word
 * list (198 candidates from the full graph). Only the `package` branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for the
 * other 15 unauthored start intents is a later Stage 9 pass. register is
 * 'formal' to match post_office's npc.register.
 */
export const postOfficeDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le colis', en: 'package', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'ask_destination'], rank: 'core',
    },
    {
      fr: 'la destination', en: 'destination', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_destination'], rank: 'core',
    },
    {
      fr: 'standard', en: 'standard', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_delivery_speed'], rank: 'core',
    },
    {
      fr: 'express', en: 'express', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_delivery_speed'], rank: 'core',
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
      fr: "C'est pour un colis ou des timbres ?", en: 'Is it for a package or stamps?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Quelle est la destination de votre colis ?', en: 'What is the destination of your package?',
      pos: 'question', register: 'formal', usedInStates: ['ask_destination'], rank: 'core',
    },
    {
      fr: 'Vous voulez un envoi standard ou en express ?', en: 'Do you want standard or express shipping?',
      pos: 'question', register: 'formal', usedInStates: ['ask_delivery_speed'], rank: 'core',
    },
    {
      fr: 'Bonne journée !', en: 'Have a good day!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'le tarif', en: 'rate / fare', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_delivery_speed'], rank: 'extend',
    },
    {
      fr: 'le suivi', en: 'tracking', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'le reçu', en: 'receipt', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['confirm_payment_card', 'confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'le dépôt', en: 'drop-off / deposit', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['confirm_payment_card', 'confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'la monnaie', en: 'change (coins)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not "money" in general (argent) — only change handed back.',
      register: 'neutral', usedInStates: ['confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'envoyer', en: 'to send', pos: 'verb',
      register: 'neutral', usedInStates: ['start', 'ask_destination'], rank: 'extend',
    },
    {
      fr: 'Ça vous fera 15 euros en tout.', en: 'That will be 15 euros in total.',
      pos: 'phrase', register: 'formal', usedInStates: ['show_total'], rank: 'extend',
    },
    {
      fr: 'Merci, au revoir et bonne journée !', en: 'Thank you, goodbye and have a good day!',
      pos: 'phrase', register: 'formal', usedInStates: ['end_session'], rank: 'extend',
    },
  ],
};
