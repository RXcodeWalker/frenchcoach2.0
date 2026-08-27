import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- pharmacy`'s word
 * list (357 candidates from the full graph). Only the `prescription` branch
 * is authored (Stage 9a), so the deck is scoped to that path — vocab for
 * the other 20 unauthored start intents and the `sick` branch is a later
 * Stage 9 pass. register is 'formal' to match pharmacy's npc.register.
 */
export const pharmacyDeck: ScenarioDeck = {
  entries: [
    {
      fr: "l'ordonnance", en: 'prescription', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['start', 'ask_prescription'], rank: 'core',
    },
    {
      fr: 'le médicament', en: 'medication', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_prescription', 'prepare_meds'], rank: 'core',
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
      fr: 'Que puis-je faire pour vous ?', en: 'What can I do for you?', pos: 'question',
      register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Avez-vous votre ordonnance ?', en: 'Do you have your prescription?',
      pos: 'question', register: 'formal', usedInStates: ['ask_prescription'], rank: 'core',
    },
    {
      fr: 'Puis-je vous aider avec autre chose ?', en: 'Can I help you with anything else?',
      pos: 'question', register: 'formal', usedInStates: ['ask_other_needs'], rank: 'core',
    },
    {
      fr: 'Comment souhaitez-vous régler ?', en: 'How would you like to pay?',
      pos: 'question', register: 'formal', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'Au revoir et bonne guérison !', en: 'Goodbye and get well soon!',
      pos: 'phrase', register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'prescrire', en: 'to prescribe', pos: 'verb',
      register: 'neutral', usedInStates: ['ask_prescription'], rank: 'extend',
    },
    {
      fr: 'préparer', en: 'to prepare', pos: 'verb',
      register: 'neutral', usedInStates: ['prepare_meds'], rank: 'extend',
    },
    {
      fr: 'le stock', en: 'stock', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_prescription'], rank: 'extend',
    },
    {
      fr: 'la notice', en: 'information leaflet', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
    {
      fr: 'la monnaie', en: 'change (coins)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not "money" in general (argent) — only change handed back.',
      register: 'neutral', usedInStates: ['confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'Non merci, ce sera tout.', en: 'No thanks, that will be all.',
      pos: 'phrase', register: 'informal', usedInStates: ['ask_other_needs'], rank: 'extend',
    },
    {
      fr: 'Je vais préparer vos médicaments, un instant s\'il vous plaît !', en: "I'll prepare your medication, one moment please!",
      pos: 'phrase', register: 'formal', usedInStates: ['prepare_meds'], rank: 'extend',
    },
    {
      fr: 'Très bien, par carte.', en: 'Very well, by card.',
      pos: 'phrase', register: 'formal', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
  ],
};
