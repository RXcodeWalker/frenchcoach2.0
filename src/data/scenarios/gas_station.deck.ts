import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- gas_station`'s word
 * list (108 candidates from the full graph). Only the `fuel` branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for the
 * other 9 unauthored start intents is a later Stage 9 pass. register is
 * 'informal' to match gas_station's npc.register.
 */
export const gasStationDeck: ScenarioDeck = {
  entries: [
    {
      fr: "l'essence", en: 'petrol / gasoline', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'le sans plomb', en: 'unleaded petrol', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['fuel_start'], rank: 'core',
    },
    {
      fr: 'le gazole', en: 'diesel', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['fuel_start'], rank: 'core',
    },
    {
      fr: 'la pompe', en: 'pump', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_fuel_pump'], rank: 'core',
    },
    {
      fr: 'la carte', en: 'card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: "C'est pour de l'essence ou juste un passage en boutique ?", en: 'Is it for fuel or just a shop visit?',
      pos: 'question', register: 'informal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: "C'est bien du Sans Plomb 95 ou du Gazole ?", en: 'Is it unleaded 95 or diesel?',
      pos: 'question', register: 'informal', usedInStates: ['fuel_start'], rank: 'core',
    },
    {
      fr: 'Quelle pompe avez-vous utilisée ?', en: 'Which pump did you use?',
      pos: 'question', register: 'informal', usedInStates: ['ask_fuel_pump'], rank: 'core',
    },
    {
      fr: 'Bonne route et soyez prudent !', en: 'Safe travels, be careful!',
      pos: 'phrase', register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'le plein', en: 'full tank', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start'], rank: 'extend',
    },
    {
      fr: 'le pistolet', en: 'fuel nozzle', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['fuel_start'], rank: 'extend',
    },
    {
      fr: 'le ticket', en: 'receipt', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['payment_confirm'], rank: 'extend',
    },
    {
      fr: 'régler', en: 'to pay / settle', pos: 'verb',
      register: 'neutral', usedInStates: ['ask_payment'], rank: 'extend',
    },
    {
      fr: 'Merci. Voulez-vous votre ticket ?', en: 'Thank you. Would you like your receipt?',
      pos: 'question', register: 'informal', usedInStates: ['payment_confirm'], rank: 'extend',
    },
  ],
};
