import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 4. Like `car_rental`/`job_interview`, `real_estate`'s `rent`
 * branch already had extensive `capture`/`intents` structure authored into
 * the graph before Stage 9 — property type, location, budget, listing
 * review, visit scheduling, and document collection, far beyond the plan's
 * minimum bar. This pass makes no graph changes; it only authors
 * `.meta.ts` (missions covering the core rental-search beats) and
 * `.deck.ts`. Only `rent` is authored as a mission branch; `buy`/`sell`/
 * `commercial`/etc. and the other `start` side-intents remain unauthored
 * (Stage 9 backlog) even though their graph content is already rich.
 */
export const realEstateMeta: ScenarioMeta = {
  id: 'real_estate',
  title: 'Real Estate Agency',
  titleFr: "L'Agence Immobilière",
  emoji: '🏠',
  tier: 4,
  category: 'Services',
  dependencies: [],
  npc: {
    nameFr: 'Agent immobilier',
    roleFr: "l'agent immobilier",
    roleEn: 'estate agent',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're looking to rent a property. Say what type you want, where, and your budget, then confirm a listing and schedule a visit.",
  branches: {
    rent: {
      labelEn: 'Look for a rental',
      missions: [
        {
          id: 'realestate_ask_rent',
          en: 'Say you want to rent',
          modelFr: 'Je voudrais louer un logement.',
          requires: [{ kind: 'intent', state: 'start', intent: 'rent' }],
        },
        {
          id: 'realestate_say_property_type',
          en: 'Say what type of property you want',
          modelFr: 'Je cherche un appartement T2.',
          requires: [{ kind: 'slot', state: 'ask_rent_criteria', slot: 'property_type', minWords: 3 }],
        },
        {
          id: 'realestate_say_location',
          en: 'Say what area you want',
          modelFr: 'Je préfère le centre-ville.',
          requires: [{ kind: 'slot', state: 'ask_location', slot: 'location_preference', minWords: 2 }],
        },
        {
          id: 'realestate_say_budget',
          en: 'Say your monthly budget',
          modelFr: "Mon budget est de 700 euros par mois.",
          requires: [{ kind: 'slot', state: 'ask_budget_rent', slot: 'budget', minWords: 3 }],
        },
        {
          id: 'realestate_accept_listing',
          en: 'Say yes, you want to see the listing',
          modelFr: 'Oui, je veux bien voir la fiche.',
          requires: [{ kind: 'intent', state: 'check_listings', intent: 'yes' }],
        },
        {
          id: 'realestate_accept_visit',
          en: 'Say yes, you want a visit',
          modelFr: 'Oui, une visite serait parfaite.',
          requires: [{ kind: 'intent', state: 'provide_details', intent: 'yes' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'rent', terms: ['louer'], priority: 1 },
    { state: 'check_listings', intent: 'yes', terms: ['oui'], priority: 1 },
    { state: 'check_listings', intent: 'no', terms: ['non'] },
    { state: 'provide_details', intent: 'yes', terms: ['oui', 'visite'], priority: 1 },
    { state: 'provide_details', intent: 'no', terms: ['non'] },
  ],
};
