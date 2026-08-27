import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- camping`'s word list
 * (293 candidates from the full graph). Only the reservation `yes` branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for `no`
 * and the other 20 unauthored start intents is a later Stage 9 pass.
 * register is 'informal' to match camping's npc.register.
 */
export const campingDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'la réservation', en: 'reservation', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start', 'ask_reservation_name'], rank: 'core',
    },
    {
      fr: 'le nom', en: 'name', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_reservation_name'], rank: 'core',
    },
    {
      fr: 'la nuit', en: 'night', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_nights'], rank: 'core',
    },
    {
      fr: "l'emplacement", en: 'pitch (campsite plot)', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['give_pitch'], rank: 'core',
    },
    {
      fr: 'la carte', en: 'card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['give_pitch', 'confirm_payment_card'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['give_pitch', 'confirm_payment_cash'], rank: 'core',
    },
    {
      fr: 'Vous avez une réservation ?', en: 'Do you have a reservation?',
      pos: 'question', register: 'informal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Vous avez réservé sous quel nom ?', en: 'Under what name did you book?',
      pos: 'question', register: 'informal', usedInStates: ['ask_reservation_name'], rank: 'core',
    },
    {
      fr: 'Combien de nuits restez-vous ?', en: 'How many nights are you staying?',
      pos: 'question', register: 'informal', usedInStates: ['ask_nights'], rank: 'core',
    },
    {
      fr: 'Bonnes vacances !', en: 'Enjoy your holiday!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'le lac', en: 'lake', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['give_pitch'], rank: 'extend',
    },
    {
      fr: 'le portail', en: 'gate / barrier', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['confirm_payment_card', 'confirm_payment_cash'], rank: 'extend',
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
    {
      fr: 'trouver', en: 'to find', pos: 'verb',
      register: 'neutral', usedInStates: ['give_pitch'], rank: 'extend',
    },
    {
      fr: 'rester', en: 'to stay', pos: 'verb',
      register: 'neutral', usedInStates: ['ask_nights'], rank: 'extend',
    },
    {
      fr: 'Je vous ai trouvé !', en: "I've found you!", pos: 'phrase',
      register: 'informal', usedInStates: ['give_pitch'], rank: 'extend',
    },
    {
      fr: 'Très bien, par carte.', en: 'Very well, by card.',
      pos: 'phrase', register: 'informal', usedInStates: ['confirm_payment_card'], rank: 'extend',
    },
  ],
};
