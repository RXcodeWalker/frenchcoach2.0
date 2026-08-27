import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 4. Like `car_rental`/`job_interview`/`real_estate`,
 * `ski_resort`'s `rent` branch already had extensive `capture`/`intents`
 * structure authored into the graph before Stage 9 — equipment type, body
 * metrics, helmet, pass duration, and payment, far beyond the plan's
 * minimum bar. This pass makes no graph changes; it only authors
 * `.meta.ts` (missions covering the core equipment-rental beats) and
 * `.deck.ts`. Only `rent` is authored as a mission branch; `pass`/
 * `lessons`/etc. and the other `start` side-intents remain unauthored
 * (Stage 9 backlog) even though their graph content is already rich.
 */
export const skiResortMeta: ScenarioMeta = {
  id: 'ski_resort',
  title: 'Ski Resort',
  titleFr: 'La Station de Ski',
  emoji: '⛷️',
  tier: 4,
  category: 'Leisure',
  dependencies: [],
  npc: {
    nameFr: 'Loueur de matériel',
    roleFr: 'le loueur de matériel',
    roleEn: 'equipment rental clerk',
    emoji: '🧑‍💼',
    register: 'informal',
  },
  briefingEn:
    "You're renting ski equipment. Say what level you are, give your measurements, decide on a helmet, then confirm the pass and payment.",
  branches: {
    rent: {
      labelEn: 'Rent ski equipment',
      missions: [
        {
          id: 'ski_ask_rent',
          en: 'Say you want to rent equipment',
          modelFr: "Je voudrais louer du matériel.",
          requires: [{ kind: 'intent', state: 'start', intent: 'rent' }],
        },
        {
          id: 'ski_say_level',
          en: 'Say your skill level',
          modelFr: 'Je suis débutant.',
          requires: [{ kind: 'slot', state: 'ask_equipment_details', slot: 'equip_level', minWords: 2 }],
        },
        {
          id: 'ski_say_metrics',
          en: 'Give your height, weight, and shoe size',
          modelFr: "Je fais 1m75, 70 kilos, et je chausse du 42.",
          requires: [{ kind: 'slot', state: 'ask_body_metrics', slot: 'metrics', minWords: 4 }],
        },
        {
          id: 'ski_accept_helmet',
          en: 'Say yes to renting a helmet',
          modelFr: 'Oui, je veux louer un casque.',
          requires: [{ kind: 'intent', state: 'ask_helmet', intent: 'yes' }],
        },
        {
          id: 'ski_decline_helmet',
          en: 'Say no to renting a helmet',
          modelFr: "Non merci, je n'ai pas besoin de casque.",
          requires: [{ kind: 'intent', state: 'ask_helmet', intent: 'no' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'rent', terms: ['louer', 'location'], priority: 1 },
    { state: 'ask_helmet', intent: 'yes', terms: ['oui', 'casque'], priority: 1 },
    { state: 'ask_helmet', intent: 'no', terms: ['non', 'merci'] },
  ],
};
