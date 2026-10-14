/** Pilot theme « Moi » (about me). No gendered adjectives anywhere; the kid's gender is never asked. */
import { line } from '../build';
import type { JuniorFrame, JuniorQuestion } from '../types';
import { AGES, FOODS, HOMES, LIKES, PETS, SEASONS } from '../vocab';

const THEME = 'moi';

const age: JuniorFrame = { patternId: 'j-ai-N-ans', template: "J'ai {slot} ans.", templateEn: 'I am {slot} years old.', slotOptions: AGES };
const likes = (slotOptions: JuniorFrame['slotOptions']): JuniorFrame => ({
  patternId: 'j-aime-le-X',
  template: "J'aime {slot}.",
  templateEn: 'I like {slot}.',
  slotOptions,
});
const home: JuniorFrame = { patternId: 'j-habite-dans-X', template: "J'habite dans {slot}.", templateEn: 'I live in {slot}.', slotOptions: HOMES };
const pet: JuniorFrame = { patternId: 'j-ai-un-X', template: "J'ai {slot}.", templateEn: 'I have {slot}.', slotOptions: PETS };

export const MOI_QUESTIONS: readonly JuniorQuestion[] = [
  {
    id: 'moi_01',
    themeId: THEME,
    emoji: '🎂',
    prompt: line('moi_01.prompt', 'Tu as quel âge ?', 'How old are you?'),
    frames: [age],
    modelAnswer: ["J'ai dix ans."],
  },
  {
    id: 'moi_02',
    themeId: THEME,
    emoji: '🍽️',
    prompt: line('moi_02.prompt', "Qu'est-ce que tu aimes manger ?", 'What do you like to eat?'),
    frames: [likes(FOODS)],
    modelAnswer: ["J'aime la pizza."],
  },
  {
    id: 'moi_03',
    themeId: THEME,
    emoji: '💛',
    prompt: line('moi_03.prompt', 'Tu aimes quoi ?', 'What do you like?'),
    frames: [likes(LIKES)],
    modelAnswer: ["J'aime le foot."],
  },
  {
    id: 'moi_04',
    themeId: THEME,
    emoji: '🏡',
    prompt: line('moi_04.prompt', 'Tu habites où ?', 'Where do you live?'),
    frames: [home],
    modelAnswer: ["J'habite dans une maison."],
  },
  {
    id: 'moi_05',
    themeId: THEME,
    emoji: '🐾',
    prompt: line('moi_05.prompt', 'Tu as un animal ?', 'Do you have a pet?'),
    frames: [pet],
    modelAnswer: ["J'ai un chat."],
  },
  {
    id: 'moi_06',
    themeId: THEME,
    emoji: '🗓️',
    prompt: line('moi_06.prompt', 'Tu aimes quelle saison ?', 'Which season do you like?'),
    frames: [likes(SEASONS)],
    modelAnswer: ["J'aime l'été."],
  },
  {
    id: 'moi_07',
    themeId: THEME,
    emoji: '🙋',
    prompt: line('moi_07.prompt', 'Tu as quel âge ? Tu as un animal ?', 'How old are you? Do you have a pet?'),
    frames: [age, pet],
    modelAnswer: ["J'ai dix ans.", "J'ai un chat."],
  },
  {
    id: 'moi_08',
    themeId: THEME,
    emoji: '🌟',
    prompt: line('moi_08.prompt', 'Tu habites où ? Tu aimes quoi ?', 'Where do you live? What do you like?'),
    frames: [home, likes(LIKES)],
    modelAnswer: ["J'habite dans une maison.", "J'aime la musique."],
  },
];
