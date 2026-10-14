/**
 * Sentence patterns. A pattern id is what the scaffold ladder (Echo → Frame → Free)
 * is tracked against, so one id covers every theme that uses the same shape.
 */
import { line } from './build';
import type { JuniorPattern } from './types';

export const JUNIOR_PATTERNS: readonly JuniorPattern[] = [
  {
    id: 'j-ai-N-ans',
    slotKind: 'number',
    coreWords: ["j'ai", 'ans'],
    levelUp: line('levelup.j-ai-n-ans', "Tu n'as plus besoin d'aide pour « J'ai… ans » !", 'You don\'t need help with "J\'ai… ans" any more!'),
  },
  {
    id: 'j-aime-le-X',
    slotKind: 'noun',
    coreWords: ["j'aime"],
    levelUp: line('levelup.j-aime-le-x', "Tu n'as plus besoin d'aide pour « J'aime… » !", 'You don\'t need help with "J\'aime…" any more!'),
  },
  {
    id: 'j-habite-dans-X',
    slotKind: 'noun',
    coreWords: ["j'habite", 'dans'],
    levelUp: line('levelup.j-habite-dans-x', "Tu n'as plus besoin d'aide pour « J'habite dans… » !", 'You don\'t need help with "J\'habite dans…" any more!'),
  },
  {
    id: 'j-ai-un-X',
    slotKind: 'noun',
    coreWords: ["j'ai"],
    levelUp: line('levelup.j-ai-un-x', "Tu n'as plus besoin d'aide pour « J'ai… » !", 'You don\'t need help with "J\'ai…" any more!'),
  },
  {
    id: 'x-c-est-ADJ',
    slotKind: 'adjective',
    coreWords: ["c'est"],
    levelUp: line('levelup.x-c-est-adj', "Tu n'as plus besoin d'aide pour « C'est… » !", 'You don\'t need help with "C\'est…" any more!'),
  },
  {
    id: 'ma-couleur-c-est-X',
    slotKind: 'noun',
    coreWords: ['ma', 'couleur', "c'est"],
    levelUp: line(
      'levelup.ma-couleur-c-est-x',
      "Tu n'as plus besoin d'aide pour « Ma couleur… » !",
      'You don\'t need help with "Ma couleur…" any more!',
    ),
  },
];
