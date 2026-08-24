import type { ScenarioDeck } from '../../features/roleplay/types';

export const bakeryDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le pain', en: 'bread', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'ask_bread_type'], rank: 'core',
    },
    {
      fr: 'la baguette', en: 'baguette', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'le croissant', en: 'croissant', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_pastry'], rank: 'core',
    },
    {
      fr: 'la pâtisserie', en: 'pastry', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'la formule petit-déjeuner', en: 'breakfast set menu', pos: 'phrase',
      literalEn: 'the little-breakfast formula', register: 'neutral',
      usedInStates: ['breakfast_formula_start'], rank: 'core',
    },
    {
      fr: 'combien', en: 'how many / how much', pos: 'adv',
      register: 'neutral', usedInStates: ['ask_bread_count'], rank: 'core',
    },
    {
      fr: 'la monnaie', en: 'change (coins)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not "money" in general (argent) — only small change.',
      register: 'neutral', usedInStates: ['small_change_request_start'], rank: 'core',
    },
    {
      fr: 'bien cuite', en: 'well baked (fem.)', pos: 'adj',
      literalEn: 'well cooked', register: 'informal',
      note: 'Agrees with "la baguette" — feminine form.',
      usedInStates: ['start'], rank: 'extend',
    },
    {
      fr: 'C\'est tout pour vous ?', en: 'Is that everything?', pos: 'question',
      literalEn: 'Is it all for you?', register: 'informal',
      usedInStates: ['ask_anything_else'], rank: 'core',
    },
    {
      fr: 'Ça vous fera 4,50 euros', en: 'That\'ll be €4.50', pos: 'phrase',
      literalEn: 'That will make you 4.50 euros', register: 'neutral',
      usedInStates: ['show_total'], rank: 'core',
    },
    {
      fr: 'le sachet', en: 'small bag', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['individual_paper_bag_start'], rank: 'extend',
    },
    {
      fr: 'le levain', en: 'sourdough starter', pos: 'noun', gender: 'm', article: 'le',
      note: 'Masculine despite the "-ain" ending resembling feminine patterns — common learner error.',
      register: 'neutral', usedInStates: ['bread_recipe_info_start'], rank: 'extend',
    },
    {
      fr: 'sans gluten', en: 'gluten-free', pos: 'adj',
      register: 'neutral', usedInStates: ['allergen_free_bread_start'], rank: 'extend',
    },
    {
      fr: 'un gâteau d\'anniversaire', en: 'birthday cake', pos: 'phrase',
      literalEn: 'an anniversary cake', register: 'neutral',
      usedInStates: ['custom_cake_message_start'], rank: 'extend',
    },
    {
      fr: 'la fournée', en: 'batch (out of the oven)', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['fresh_bread_time_start'], rank: 'extend',
    },
    {
      fr: 'rassis', en: 'stale', pos: 'adj',
      register: 'neutral', usedInStates: ['old_bread_start'], rank: 'extend',
    },
    {
      fr: 'sur mesure', en: 'custom-made', pos: 'phrase',
      literalEn: 'to measure', register: 'neutral',
      usedInStates: ['custom_sandwich_start'], rank: 'extend',
    },
    {
      fr: 'Bon appétit !', en: 'Enjoy your meal!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
  ],
};
