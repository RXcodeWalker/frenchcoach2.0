import type { WordId } from './types';

/**
 * Five short mysteries (question-detective §4). Asking the right tool gives
 * a clue; asking the wrong one gets an answer to *that* word.
 */

export interface CaseWitness {
  id: string;
  name: string;
  /** The question word that unlocks this witness's clue. */
  rightWord: WordId;
  clue: string;
  /** Funny replies keyed by the wrong tool the learner picked. */
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
  witnesses: readonly CaseWitness[];
  closing: readonly CaseClosing[];
}

const WRONG_STOCK: Record<WordId, string> = {
  qui: 'Mon cousin !',
  ou: 'À la cantine !',
  quand: 'Hier soir !',
  combien: 'Trois !',
  comment: 'En courant !',
  pourquoi: 'Parce que j’avais faim !',
  quel: 'Le bleu !',
  questce: 'Un sandwich !',
};

function wrongExcept(keep: WordId, extra?: Partial<Record<WordId, string>>): Partial<Record<WordId, string>> {
  const out: Partial<Record<WordId, string>> = {};
  for (const [id, line] of Object.entries(WRONG_STOCK) as [WordId, string][]) {
    if (id === keep) continue;
    out[id] = extra?.[id] ?? line;
  }
  return out;
}

export const DETECTIVE_CASES: readonly DetectiveCase[] = [
  {
    id: 'croissant',
    title: 'The missing croissant',
    mystery: 'Someone ate the last croissant. Find out who.',
    witnesses: [
      {
        id: 'lea',
        name: 'Léa',
        rightWord: 'qui',
        clue: 'J’ai vu Paul près de la cuisine.',
        wrong: wrongExcept('qui', { quand: 'Ce matin !', ou: 'Dans la cour !' }),
      },
      {
        id: 'paul',
        name: 'Paul',
        rightWord: 'quand',
        clue: 'C’était à huit heures, avant l’école.',
        wrong: wrongExcept('quand', { qui: 'Pas moi !', combien: 'Un seul !' }),
      },
      {
        id: 'hugo',
        name: 'Hugo',
        rightWord: 'ou',
        clue: 'Les miettes sont sur la table.',
        wrong: wrongExcept('ou', { questce: 'Du chocolat !', comment: 'Très vite !' }),
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
    witnesses: [
      {
        id: 'amina',
        name: 'Amina',
        rightWord: 'ou',
        clue: 'Je l’ai vu près de la fenêtre.',
        wrong: wrongExcept('ou', { qui: 'Le hamster !', comment: 'Tout doucement !' }),
      },
      {
        id: 'tom',
        name: 'Tom',
        rightWord: 'comment',
        clue: 'Il est sorti par la cage ouverte.',
        wrong: wrongExcept('comment', { ou: 'Sous le bureau !', pourquoi: 'Il avait faim !' }),
      },
      {
        id: 'nina',
        name: 'Nina',
        rightWord: 'pourquoi',
        clue: 'La cage était ouverte parce que j’ai oublié.',
        wrong: wrongExcept('pourquoi', { quand: 'À midi !', combien: 'Un hamster !' }),
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
    witnesses: [
      {
        id: 'sam',
        name: 'Sam',
        rightWord: 'pourquoi',
        clue: 'Le bus n’est pas venu.',
        wrong: wrongExcept('pourquoi', { quand: 'Ce matin !', ou: 'À l’arrêt !' }),
      },
      {
        id: 'inès',
        name: 'Inès',
        rightWord: 'combien',
        clue: 'On a attendu vingt minutes.',
        wrong: wrongExcept('combien', { qui: 'Le chauffeur !', comment: 'En parlant !' }),
      },
      {
        id: 'omar',
        name: 'Omar',
        rightWord: 'comment',
        clue: 'On est venus à pied après ça.',
        wrong: wrongExcept('comment', { ou: 'Devant l’école !', questce: 'Nos sacs !' }),
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
    mystery: 'The birthday cake is gone. Find out how.',
    witnesses: [
      {
        id: 'maya',
        name: 'Maya',
        rightWord: 'questce',
        clue: 'J’ai vu un grand carton vide.',
        wrong: wrongExcept('questce', { qui: 'Mon frère !', quel: 'Le chocolat !' }),
      },
      {
        id: 'ben',
        name: 'Ben',
        rightWord: 'quel',
        clue: 'C’était le gâteau au chocolat.',
        wrong: wrongExcept('quel', { combien: 'Douze parts !', ou: 'Dans le frigo !' }),
      },
      {
        id: 'zoe',
        name: 'Zoé',
        rightWord: 'qui',
        clue: 'C’est le prof qui l’a caché pour plus tard.',
        wrong: wrongExcept('qui', { pourquoi: 'C’est l’anniversaire !', quand: 'À midi !' }),
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
    witnesses: [
      {
        id: 'ravi',
        name: 'Ravi',
        rightWord: 'questce',
        clue: 'Il y a des cartes à l’intérieur.',
        wrong: wrongExcept('questce', { ou: 'Sous le bureau !', combien: 'Plein !' }),
      },
      {
        id: 'lina',
        name: 'Lina',
        rightWord: 'combien',
        clue: 'Il y a cinq cartes.',
        wrong: wrongExcept('combien', { quel: 'Les rouges !', qui: 'Personne !' }),
      },
      {
        id: 'yanis',
        name: 'Yanis',
        rightWord: 'quand',
        clue: 'On l’ouvre vendredi, après le cours.',
        wrong: wrongExcept('quand', { comment: 'Avec une clé !', pourquoi: 'C’est un jeu !' }),
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
