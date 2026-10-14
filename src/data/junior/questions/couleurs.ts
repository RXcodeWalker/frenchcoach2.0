/** Pilot theme « Les couleurs ». Colour adjectives only follow « c'est » (never describe the kid). */
import { line } from '../build';
import type { JuniorFrame, JuniorQuestion } from '../types';
import { COLOUR_ADJS as A, COLOUR_NOUNS as N } from '../vocab';

const THEME = 'couleurs';

const likesColour = (slotOptions: JuniorFrame['slotOptions']): JuniorFrame => ({
  patternId: 'j-aime-le-X',
  template: "J'aime {slot}.",
  templateEn: 'I like {slot}.',
  slotOptions,
});
const favourite: JuniorFrame = {
  patternId: 'ma-couleur-c-est-X',
  template: "Ma couleur préférée, c'est {slot}.",
  templateEn: 'My favourite colour is {slot}.',
  slotOptions: [N.rose, N.violet, N.noir, N.blanc, N.marron],
};
const colourOf = (subjectFr: string, subjectEn: string, slotOptions: JuniorFrame['slotOptions']): JuniorFrame => ({
  patternId: 'x-c-est-ADJ',
  template: `${subjectFr}, c'est {slot}.`,
  templateEn: `${subjectEn} is {slot}.`,
  slotOptions,
});

const banana = colourOf('La banane', 'The banana', [A.jaune, A.vert, A.rouge, A.bleu]);
const sky = colourOf('Le ciel', 'The sky', [A.bleu, A.blanc, A.noir, A.orange]);
const strawberry = colourOf('La fraise', 'The strawberry', [A.rouge, A.vert, A.jaune, A.violet]);

export const COULEURS_QUESTIONS: readonly JuniorQuestion[] = [
  {
    id: 'col_01',
    themeId: THEME,
    emoji: '🌈',
    prompt: line('col_01.prompt', 'Tu aimes quelle couleur ?', 'Which colour do you like?'),
    frames: [likesColour([N.bleu, N.rouge, N.vert, N.jaune])],
    modelAnswer: ["J'aime le bleu."],
  },
  {
    id: 'col_02',
    themeId: THEME,
    emoji: '🎨',
    prompt: line('col_02.prompt', 'Quelle est ta couleur préférée ?', 'What is your favourite colour?'),
    frames: [favourite],
    modelAnswer: ["Ma couleur préférée, c'est le rose."],
  },
  {
    id: 'col_03',
    themeId: THEME,
    emoji: '🍌',
    prompt: line('col_03.prompt', "La banane, c'est quelle couleur ?", 'What colour is the banana?'),
    frames: [banana],
    modelAnswer: ["La banane, c'est jaune."],
  },
  {
    id: 'col_04',
    themeId: THEME,
    emoji: '☁️',
    prompt: line('col_04.prompt', "Le ciel, c'est quelle couleur ?", 'What colour is the sky?'),
    frames: [sky],
    modelAnswer: ["Le ciel, c'est bleu."],
  },
  {
    id: 'col_05',
    themeId: THEME,
    emoji: '🍓',
    prompt: line('col_05.prompt', "La fraise, c'est quelle couleur ?", 'What colour is the strawberry?'),
    frames: [strawberry],
    modelAnswer: ["La fraise, c'est rouge."],
  },
  {
    id: 'col_06',
    themeId: THEME,
    emoji: '🆚',
    prompt: line('col_06.prompt', 'Tu aimes le rouge ou le bleu ?', 'Do you like red or blue?'),
    frames: [likesColour([N.rouge, N.bleu])],
    modelAnswer: ["J'aime le rouge."],
  },
  {
    id: 'col_07',
    themeId: THEME,
    emoji: '🖍️',
    prompt: line('col_07.prompt', 'Tu aimes quelle couleur ? Et ta préférée ?', 'Which colour do you like? And your favourite?'),
    frames: [likesColour([N.bleu, N.rouge, N.vert, N.jaune]), favourite],
    modelAnswer: ["J'aime le bleu.", "Ma couleur préférée, c'est le rose."],
  },
  {
    id: 'col_08',
    themeId: THEME,
    emoji: '🍓☁️',
    prompt: line('col_08.prompt', "La fraise, c'est quelle couleur ? Et le ciel ?", 'What colour is the strawberry? And the sky?'),
    frames: [strawberry, sky],
    modelAnswer: ["La fraise, c'est rouge.", "Le ciel, c'est bleu."],
  },
];
