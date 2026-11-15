import type { WordId } from './types';

/**
 * Five short mysteries (question-detective §5). A case is a chain: every
 * step opens with what the detective already knows and what to find out
 * next, so the right tool is always a reasoned choice, never a guess. The
 * learner picks the tool, the French question fills in, and the witness
 * answers with the next clue.
 */

/** Where the chosen tool goes in a step's French question. */
export const BLANK = '___';

export interface CaseStep {
  id: string;
  /** The witness being questioned. */
  name: string;
  /**
   * English. What the detective knows (the clue from the step before) and
   * what to find out now. It names the kind of answer wanted, never the
   * French word.
   */
  goal: string;
  /** The tool that finds it. */
  rightWord: WordId;
  /** The French question, with `___` where the tool goes. */
  question: string;
  /** What fills the blank when it is not the tool's own lemma (« quoi »). */
  fill?: string;
  questionGloss: string;
  /** The witness's answer: the clue. */
  clue: string;
  clueGloss: string;
  /**
   * Exactly three other tools, each with the confused reply that tool gets.
   * These are the step's wrong choices.
   */
  wrong: Partial<Record<WordId, string>>;
}

export interface CaseClosing {
  prompt: string;
  gloss: string;
  wordId: WordId;
  accepted: readonly string[];
  model: string;
}

export interface DetectiveCase {
  id: string;
  title: string;
  mystery: string;
  steps: readonly CaseStep[];
  closing: readonly CaseClosing[];
}

export const DETECTIVE_CASES: readonly DetectiveCase[] = [
  {
    id: 'croissant',
    title: 'The missing croissant',
    mystery: 'Someone ate the last croissant. Find out who.',
    steps: [
      {
        id: 'lea',
        name: 'Léa',
        goal: 'Someone ate the last croissant. Ask Léa who it was.',
        rightWord: 'qui',
        question: `${BLANK} a mangé le croissant ?`,
        questionGloss: 'Who ate the croissant?',
        clue: 'J’ai vu Paul près de la cuisine.',
        clueGloss: 'I saw Paul near the kitchen.',
        wrong: { quand: 'Ce matin !', ou: 'Dans la cour !', comment: 'Très vite !' },
      },
      {
        id: 'paul',
        name: 'Paul',
        goal: 'Léa saw Paul near the kitchen. Now ask Paul when it happened.',
        rightWord: 'quand',
        question: `C’était ${BLANK} ?`,
        questionGloss: 'When was it?',
        clue: 'C’était à huit heures, avant l’école.',
        clueGloss: 'It was at eight o’clock, before school.',
        wrong: { qui: 'Pas moi !', combien: 'Un seul !', pourquoi: 'J’avais faim !' },
      },
      {
        id: 'hugo',
        name: 'Hugo',
        goal: 'Eight o’clock, before school. Now find the evidence: ask Hugo where the crumbs are.',
        rightWord: 'ou',
        question: `Les miettes sont ${BLANK} ?`,
        questionGloss: 'Where are the crumbs?',
        clue: 'Les miettes sont sur la table.',
        clueGloss: 'The crumbs are on the table.',
        wrong: { questce: 'Du chocolat !', comment: 'Très vite !', quel: 'Le bleu !' },
      },
    ],
    closing: [
      { prompt: 'Qui a mangé le croissant ?', gloss: 'Who ate the croissant?', wordId: 'qui', accepted: ['Paul'], model: 'Paul' },
      { prompt: 'C’était quand ?', gloss: 'When was it?', wordId: 'quand', accepted: ['à huit heures', 'huit heures'], model: 'à huit heures' },
      { prompt: 'Les miettes sont où ?', gloss: 'Where are the crumbs?', wordId: 'ou', accepted: ['sur la table', 'la table'], model: 'sur la table' },
    ],
  },
  {
    id: 'hamster',
    title: 'The hamster escape',
    mystery: 'The class hamster is missing. Find out where it went.',
    steps: [
      {
        id: 'amina',
        name: 'Amina',
        goal: 'The class hamster is missing. Ask Amina where she saw it.',
        rightWord: 'ou',
        question: `Tu l’as vu ${BLANK} ?`,
        questionGloss: 'Where did you see it?',
        clue: 'Je l’ai vu près de la fenêtre.',
        clueGloss: 'I saw it near the window.',
        wrong: { qui: 'Le hamster !', comment: 'Tout doucement !', combien: 'Une fois !' },
      },
      {
        id: 'tom',
        name: 'Tom',
        goal: 'By the window, but hamsters live in cages. Ask Tom how it got out.',
        rightWord: 'comment',
        question: `Il est sorti ${BLANK} ?`,
        questionGloss: 'How did it get out?',
        clue: 'Il est sorti par la cage ouverte.',
        clueGloss: 'It got out through the open cage.',
        wrong: { ou: 'Sous le bureau !', pourquoi: 'Il avait faim !', quand: 'Hier soir !' },
      },
      {
        id: 'nina',
        name: 'Nina',
        goal: 'The cage was open! Ask Nina why.',
        rightWord: 'pourquoi',
        question: `La cage était ouverte ${BLANK} ?`,
        questionGloss: 'Why was the cage open?',
        clue: 'La cage était ouverte parce que j’ai oublié.',
        clueGloss: 'The cage was open because I forgot.',
        wrong: { quand: 'À midi !', combien: 'Un hamster !', qui: 'C’est Tom !' },
      },
    ],
    closing: [
      { prompt: 'Le hamster était où ?', gloss: 'Where was the hamster?', wordId: 'ou', accepted: ['à la fenêtre', 'la fenêtre'], model: 'à la fenêtre' },
      { prompt: 'Il est sorti comment ?', gloss: 'How did it get out?', wordId: 'comment', accepted: ['par la cage', 'la cage ouverte'], model: 'par la cage' },
      { prompt: 'La cage était ouverte pourquoi ?', gloss: 'Why was the cage open?', wordId: 'pourquoi', accepted: ['j’ai oublié', "j'ai oublié"], model: 'j’ai oublié' },
    ],
  },
  {
    id: 'late',
    title: 'The late class',
    mystery: 'The whole class is late. Find out why.',
    steps: [
      {
        id: 'sam',
        name: 'Sam',
        goal: 'The whole class is late. Ask Sam why.',
        rightWord: 'pourquoi',
        question: `Vous êtes en retard ${BLANK} ?`,
        questionGloss: 'Why are you late?',
        clue: 'Le bus n’est pas venu.',
        clueGloss: 'The bus did not come.',
        wrong: { quand: 'Ce matin !', ou: 'À l’arrêt !', combien: 'Trente élèves !' },
      },
      {
        id: 'ines',
        name: 'Inès',
        goal: 'No bus! Ask Inès how long they waited for it.',
        rightWord: 'combien',
        question: `Vous avez attendu ${BLANK} de minutes ?`,
        questionGloss: 'How many minutes did you wait?',
        clue: 'On a attendu vingt minutes.',
        clueGloss: 'We waited twenty minutes.',
        wrong: { qui: 'Le chauffeur !', comment: 'En parlant !', ou: 'Devant l’école !' },
      },
      {
        id: 'omar',
        name: 'Omar',
        goal: 'Twenty minutes, and still no bus. Ask Omar how they finally got to school.',
        rightWord: 'comment',
        question: `Vous êtes venus ${BLANK} ?`,
        questionGloss: 'How did you get here?',
        clue: 'On est venus à pied après ça.',
        clueGloss: 'We came on foot after that.',
        wrong: { quand: 'Ce matin !', questce: 'Nos sacs !', qui: 'Mes amis !' },
      },
    ],
    closing: [
      { prompt: 'Vous êtes en retard pourquoi ?', gloss: 'Why are you late?', wordId: 'pourquoi', accepted: ['le bus', 'pas de bus'], model: 'le bus' },
      { prompt: 'Vous avez attendu combien de minutes ?', gloss: 'How many minutes did you wait?', wordId: 'combien', accepted: ['vingt', 'vingt minutes'], model: 'vingt' },
      { prompt: 'Vous êtes venus comment ?', gloss: 'How did you get here?', wordId: 'comment', accepted: ['à pied'], model: 'à pied' },
    ],
  },
  {
    id: 'cake',
    title: 'The disappearing cake',
    mystery: 'The birthday cake is gone. Find out who took it.',
    steps: [
      {
        id: 'maya',
        name: 'Maya',
        goal: 'The birthday cake is gone! Ask Maya what she saw.',
        rightWord: 'questce',
        question: `Tu as vu ${BLANK} ?`,
        fill: 'quoi',
        questionGloss: 'What did you see?',
        clue: 'J’ai vu un grand carton vide.',
        clueGloss: 'I saw a big empty box.',
        wrong: { qui: 'Mon frère !', ou: 'Dans la cuisine !', quand: 'À midi !' },
      },
      {
        id: 'ben',
        name: 'Ben',
        goal: 'Just an empty box. Ask Ben which cake it was.',
        rightWord: 'quel',
        question: `C’était ${BLANK} gâteau ?`,
        questionGloss: 'Which cake was it?',
        clue: 'C’était le gâteau au chocolat.',
        clueGloss: 'It was the chocolate cake.',
        wrong: { combien: 'Douze parts !', ou: 'Dans le frigo !', comment: 'Avec une fourchette !' },
      },
      {
        id: 'zoe',
        name: 'Zoé',
        goal: 'The chocolate cake! Now ask Zoé who took it.',
        rightWord: 'qui',
        question: `${BLANK} a caché le gâteau ?`,
        questionGloss: 'Who hid the cake?',
        clue: 'C’est le prof qui l’a caché pour plus tard.',
        clueGloss: 'The teacher hid it for later.',
        wrong: { pourquoi: 'C’est l’anniversaire !', quand: 'À midi !', combien: 'Un seul !' },
      },
    ],
    closing: [
      { prompt: 'Tu as vu quoi ?', gloss: 'What did you see?', wordId: 'questce', accepted: ['un carton', 'un carton vide'], model: 'un carton' },
      { prompt: 'C’était quel gâteau ?', gloss: 'Which cake was it?', wordId: 'quel', accepted: ['au chocolat', 'le chocolat'], model: 'au chocolat' },
      { prompt: 'Qui a caché le gâteau ?', gloss: 'Who hid the cake?', wordId: 'qui', accepted: ['le prof', 'mon prof'], model: 'le prof' },
    ],
  },
  {
    id: 'box',
    title: 'The locked box',
    mystery: 'There is a locked box in the classroom. Find out what is inside.',
    steps: [
      {
        id: 'ravi',
        name: 'Ravi',
        goal: 'There is a locked box in the classroom. Ask Ravi what is inside.',
        rightWord: 'questce',
        question: `Il y a ${BLANK} dans la boîte ?`,
        fill: 'quoi',
        questionGloss: 'What is in the box?',
        clue: 'Il y a des cartes à l’intérieur.',
        clueGloss: 'There are cards inside.',
        wrong: { ou: 'Sous le bureau !', combien: 'Plein !', comment: 'Avec une clé !' },
      },
      {
        id: 'lina',
        name: 'Lina',
        goal: 'Cards! Ask Lina how many there are.',
        rightWord: 'combien',
        question: `Il y a ${BLANK} de cartes ?`,
        questionGloss: 'How many cards are there?',
        clue: 'Il y a cinq cartes.',
        clueGloss: 'There are five cards.',
        wrong: { quel: 'Les rouges !', ou: 'Sur la table !', qui: 'Personne !' },
      },
      {
        id: 'yanis',
        name: 'Yanis',
        goal: 'Five cards. Ask Yanis when you can open the box.',
        rightWord: 'quand',
        question: `On l’ouvre ${BLANK} ?`,
        questionGloss: 'When do we open it?',
        clue: 'On l’ouvre vendredi, après le cours.',
        clueGloss: 'We open it on Friday, after class.',
        wrong: { pourquoi: 'C’est un jeu !', qui: 'Le prof !', combien: 'Une fois !' },
      },
    ],
    closing: [
      { prompt: 'Il y a quoi dans la boîte ?', gloss: 'What is in the box?', wordId: 'questce', accepted: ['des cartes', 'les cartes'], model: 'des cartes' },
      { prompt: 'Il y a combien de cartes ?', gloss: 'How many cards are there?', wordId: 'combien', accepted: ['cinq', 'cinq cartes'], model: 'cinq' },
      { prompt: 'On l’ouvre quand ?', gloss: 'When do we open it?', wordId: 'quand', accepted: ['vendredi', 'après le cours'], model: 'vendredi' },
    ],
  },
];

export function caseById(id: string): DetectiveCase | undefined {
  return DETECTIVE_CASES.find(c => c.id === id);
}

/** The French question with the blank filled by `word` (capitalised at the start of a sentence). */
export function fillQuestion(step: CaseStep, word: string): string {
  const filled = step.question.replace(BLANK, word);
  return step.question.startsWith(BLANK) ? filled.charAt(0).toUpperCase() + filled.slice(1) : filled;
}

/** What goes in the blank for the right tool. */
export function rightFill(step: CaseStep, lemma: string): string {
  return step.fill ?? lemma;
}
