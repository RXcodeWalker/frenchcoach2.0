import type { QuestionWord } from './types';

/**
 * The eight detective tools. Each word finds one kind of answer
 * (question-detective §1).
 */
export const QUESTION_WORDS: readonly QuestionWord[] = [
  {
    id: 'qui',
    lemma: 'qui',
    forms: ['qui'],
    finds: 'a person',
    hint: 'this one wants a person',
    examples: [
      { prompt: 'Tu parles à qui ?', position: 'end' },
      { prompt: 'Qui habite ici ?', position: 'front' },
      { prompt: 'Qui est-ce que tu invites ?', position: 'estCeQue' },
    ],
  },
  {
    id: 'ou',
    lemma: 'où',
    forms: ['où'],
    finds: 'a place',
    hint: 'this one wants a place',
    examples: [
      { prompt: 'Tu habites où ?', position: 'end' },
      { prompt: 'Où habites-tu ?', position: 'front' },
      { prompt: 'Où est-ce que tu habites ?', position: 'estCeQue' },
    ],
  },
  {
    id: 'quand',
    lemma: 'quand',
    forms: ['quand'],
    finds: 'a time',
    hint: 'this one wants a time',
    examples: [
      { prompt: 'Tu arrives quand ?', position: 'end' },
      { prompt: 'Quand arrives-tu ?', position: 'front' },
      { prompt: 'Quand est-ce que tu arrives ?', position: 'estCeQue' },
    ],
  },
  {
    id: 'combien',
    lemma: 'combien',
    forms: ['combien'],
    finds: 'a number',
    hint: 'this one wants a number',
    examples: [
      { prompt: 'Tu as combien de frères ?', position: 'end' },
      { prompt: 'Combien de frères as-tu ?', position: 'front' },
      { prompt: 'Combien est-ce que ça coûte ?', position: 'estCeQue' },
    ],
  },
  {
    id: 'comment',
    lemma: 'comment',
    forms: ['comment'],
    finds: 'a way or manner',
    hint: 'this one wants a way of doing something',
    examples: [
      { prompt: 'Tu vas à l’école comment ?', position: 'end' },
      { prompt: 'Comment vas-tu à l’école ?', position: 'front' },
      { prompt: 'Comment est-ce que tu y vas ?', position: 'estCeQue' },
    ],
  },
  {
    id: 'pourquoi',
    lemma: 'pourquoi',
    forms: ['pourquoi'],
    finds: 'a reason',
    hint: 'this one wants a reason (often « parce que »)',
    examples: [
      { prompt: 'Tu es fatigué pourquoi ?', position: 'end' },
      { prompt: 'Pourquoi es-tu fatigué ?', position: 'front' },
      { prompt: 'Pourquoi est-ce que tu souris ?', position: 'estCeQue' },
    ],
  },
  {
    id: 'quel',
    lemma: 'quel',
    forms: ['quel', 'quelle', 'quels', 'quelles'],
    finds: 'a choice',
    hint: 'this one wants which one',
    examples: [
      { prompt: 'Tu aimes quelle couleur ?', position: 'end' },
      { prompt: 'Quelle couleur aimes-tu ?', position: 'front' },
      { prompt: 'Quelle couleur est-ce que tu aimes ?', position: 'estCeQue' },
    ],
  },
  {
    id: 'questce',
    lemma: 'qu’est-ce que',
    forms: ['qu’est-ce que', "qu'est-ce que", 'qu’est-ce', "qu'est-ce"],
    finds: 'a thing or action',
    hint: 'this one wants a thing or an action',
    examples: [
      { prompt: 'Tu manges quoi ?', position: 'end' },
      { prompt: 'Qu’est-ce que tu manges ?', position: 'front' },
      { prompt: 'Qu’est-ce que tu fais ?', position: 'estCeQue' },
    ],
  },
];

export function questionWord(id: string): QuestionWord | undefined {
  return QUESTION_WORDS.find(w => w.id === id);
}
