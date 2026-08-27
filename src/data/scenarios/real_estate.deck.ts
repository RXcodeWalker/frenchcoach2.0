import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- real_estate`'s word
 * list (544 candidates from the full graph — a large, pre-existing deeply-
 * branched graph). Scoped to the `rent` branch's core decision points
 * (property type, location, budget, listing, visit). register is 'formal'
 * to match real_estate's npc.register.
 */
export const realEstateDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'louer', en: 'to rent', pos: 'verb',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: "l'appartement", en: 'apartment', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['ask_rent_criteria'], rank: 'core',
    },
    {
      fr: 'le studio', en: 'studio apartment', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_rent_criteria'], rank: 'core',
    },
    {
      fr: 'le secteur', en: 'area / district', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_location'], rank: 'core',
    },
    {
      fr: 'le centre-ville', en: 'city centre', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_location'], rank: 'core',
    },
    {
      fr: 'le budget', en: 'budget', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_budget_rent'], rank: 'core',
    },
    {
      fr: 'la fiche', en: 'listing sheet', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['check_listings'], rank: 'core',
    },
    {
      fr: 'la visite', en: 'viewing / visit', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['provide_details'], rank: 'core',
    },
    {
      fr: 'Souhaitez-vous louer, acheter ou vendre un bien ?', en: 'Would you like to rent, buy, or sell a property?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Quel type de bien cherchez-vous ?', en: 'What type of property are you looking for?',
      pos: 'question', register: 'formal', usedInStates: ['ask_rent_criteria'], rank: 'core',
    },
    {
      fr: 'Dans quel secteur géographique souhaitez-vous concentrer vos recherches ?', en: 'Which area would you like to focus your search on?',
      pos: 'question', register: 'formal', usedInStates: ['ask_location'], rank: 'core',
    },
    {
      fr: 'Quel est votre budget mensuel maximum ?', en: 'What is your maximum monthly budget?',
      pos: 'question', register: 'formal', usedInStates: ['ask_budget_rent'], rank: 'core',
    },
    {
      fr: 'À bientôt !', en: 'See you soon!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'le loyer', en: 'rent (payment)', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_budget_rent'], rank: 'extend',
    },
    {
      fr: 'le bien', en: 'property', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'provide_details'], rank: 'extend',
    },
    {
      fr: "l'agence", en: 'agency', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['start'], rank: 'extend',
    },
    {
      fr: 'lumineux', en: 'bright / light-filled', pos: 'adj',
      register: 'neutral', usedInStates: ['provide_details'], rank: 'extend',
    },
    {
      fr: 'confirmer', en: 'to confirm', pos: 'verb',
      register: 'neutral', usedInStates: ['confirm_visit'], rank: 'extend',
    },
  ],
};
