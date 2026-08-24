import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Reference implementation (Stage 1). bakery has two intent-bearing states
 * (`start`, `ask_anything_else`), enough to demonstrate a real multi-mission
 * branch: order something, then decide whether to add more before paying.
 * Missions are authored per branch — see "Mission semantics" in the plan.
 */
export const bakeryMeta: ScenarioMeta = {
  id: 'bakery',
  title: 'Bakery',
  titleFr: 'La Boulangerie',
  emoji: '🥖',
  tier: 1,
  category: 'Basics',
  dependencies: [],
  npc: {
    nameFr: 'Boulangère',
    roleFr: 'la boulangère',
    roleEn: 'baker',
    emoji: '👩‍🍳',
    register: 'informal',
  },
  briefingEn:
    "You're at the bakery. Order some bread, then decide whether you'd like anything else before you pay.",
  branches: {
    bread: {
      labelEn: 'Order bread',
      missions: [
        {
          id: 'bakery_ask_bread',
          en: 'Ask for bread',
          modelFr: 'Je voudrais du pain, s\'il vous plaît.',
          requires: [{ kind: 'intent', state: 'start', intent: 'bread' }],
        },
        {
          id: 'bakery_decline_more',
          en: 'Say no when asked if you want anything else',
          modelFr: 'Non merci, ce sera tout.',
          requires: [{ kind: 'intent', state: 'ask_anything_else', intent: 'no' }],
        },
      ],
    },
    pastry: {
      labelEn: 'Order a pastry',
      missions: [
        {
          id: 'bakery_ask_pastry',
          en: 'Ask for a pastry',
          modelFr: 'Je voudrais un croissant, s\'il vous plaît.',
          requires: [{ kind: 'intent', state: 'start', intent: 'pastry' }],
        },
        {
          id: 'bakery_add_more',
          en: 'Say yes when asked if you want anything else, then order something else',
          modelFr: 'Oui, je voudrais aussi une baguette.',
          requires: [
            { kind: 'intent', state: 'ask_anything_else', intent: 'yes' },
            { kind: 'intent', state: 'start', intent: 'bread' },
          ],
        },
      ],
    },
    breakfast: {
      labelEn: 'Order the breakfast formula',
      missions: [
        {
          id: 'bakery_ask_breakfast',
          en: 'Ask about the breakfast formula',
          modelFr: 'C\'est quoi la formule petit-déjeuner ?',
          requires: [{ kind: 'intent', state: 'start', intent: 'breakfast' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'bread', terms: ['pain', 'baguette'], priority: 1 },
    { state: 'start', intent: 'pastry', terms: ['patisserie', 'croissant', 'pain au chocolat'] },
    { state: 'start', intent: 'breakfast', terms: ['formule petit-dejeuner', 'petit-dejeuner', 'formule'] },
    { state: 'start', intent: 'special', terms: ['pain special', 'pains speciaux'] },
    { state: 'start', intent: 'birds', terms: ['pain rassis', 'oiseaux'] },
    { state: 'start', intent: 'custom', terms: ['sandwich sur mesure', 'sandwich'] },
    { state: 'start', intent: 'today', terms: ['specialite du jour', 'aujourdhui'] },
    { state: 'start', intent: 'slice', terms: ['trancher', 'couper le pain'] },
    { state: 'start', intent: 'change', terms: ['monnaie'] },
    { state: 'start', intent: 'hot', terms: ['cafe a emporter', 'cafe'] },
    { state: 'start', intent: 'box', terms: ['boite cadeau', 'coffret'] },
    { state: 'start', intent: 'ingredients', terms: ['ingredients', 'liste des ingredients'] },
    { state: 'start', intent: 'owner', terms: ['patron', 'proprietaire'] },
    { state: 'ask_anything_else', intent: 'yes', terms: ['oui'], priority: 1 },
    { state: 'ask_anything_else', intent: 'no', terms: ['non', 'ce sera tout', 'c\'est tout'] },
  ],
};
