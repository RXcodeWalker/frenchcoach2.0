import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- ski_resort`'s word
 * list (460 candidates from the full graph — a large, pre-existing deeply-
 * branched graph). Scoped to the `rent` branch's core decision points
 * (equipment, metrics, helmet). register is 'informal' to match
 * ski_resort's npc.register.
 */
export const skiResortDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'la location', en: 'rental', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'les skis', en: 'skis', pos: 'noun', gender: 'm', article: 'les', pluralFr: 'les skis',
      register: 'neutral', usedInStates: ['ask_equipment_details'], rank: 'core',
    },
    {
      fr: 'débutant', en: 'beginner', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_equipment_details'], rank: 'core',
    },
    {
      fr: 'la taille', en: 'height / size', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_body_metrics'], rank: 'core',
    },
    {
      fr: 'la pointure', en: 'shoe size', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_body_metrics'], rank: 'core',
    },
    {
      fr: 'le casque', en: 'helmet', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_helmet'], rank: 'core',
    },
    {
      fr: "C'est pour des skis, un snowboard ou des raquettes ?", en: 'Is it for skis, a snowboard, or snowshoes?',
      pos: 'question', register: 'informal', usedInStates: ['ask_equipment_details'], rank: 'core',
    },
    {
      fr: "J'ai besoin de votre taille, de votre poids et de votre pointure.", en: 'I need your height, weight, and shoe size.',
      pos: 'phrase', register: 'informal', usedInStates: ['ask_body_metrics'], rank: 'core',
    },
    {
      fr: 'Voulez-vous louer un casque pour votre sécurité ?', en: 'Would you like to rent a helmet for your safety?',
      pos: 'question', register: 'informal', usedInStates: ['ask_helmet'], rank: 'core',
    },
    {
      fr: 'Bonne glisse !', en: 'Have a good ski!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'le snowboard', en: 'snowboard', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_equipment_details'], rank: 'extend',
    },
    {
      fr: 'le poids', en: 'weight', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_body_metrics'], rank: 'extend',
    },
    {
      fr: 'la sécurité', en: 'safety', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_helmet'], rank: 'extend',
    },
    {
      fr: 'ajustable', en: 'adjustable', pos: 'adj',
      register: 'neutral', usedInStates: ['set_helmet'], rank: 'extend',
    },
    {
      fr: 'le forfait', en: 'ski pass', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_pass_confirm'], rank: 'extend',
    },
  ],
};
