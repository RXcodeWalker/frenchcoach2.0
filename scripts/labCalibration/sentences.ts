/**
 * The Pronunciation Lab calibration sentences (pronunciation-lab plan §7).
 *
 * The owner reads each sentence twice: once correctly, and once saying a
 * different word in place of one word (`swapWord` → `swapTo`, a real minimal
 * pair from `lab/minimalPairs.ts`). The scripted check is always given the
 * ORIGINAL sentence as its target, exactly as a learner's take is, so the
 * question is whether the Lab then calls the swapped word "Practise this" or
 * "Not heard" — the thing the freeform exam analysis could not do (0 of 9).
 *
 * Authored once and frozen. Changing a sentence changes what a recording
 * means: recordings already made are for the old text. Add new sentences at
 * the end instead, and bump `CALIBRATION_SET_VERSION`.
 */

export const CALIBRATION_SET_VERSION = 'lab-calibration-set-v1';

export interface CalibrationSentence {
  /** `s01`…; used in recording file names. */
  id: string;
  /** What the learner is shown and what Azure is given as the target. */
  sentence: string;
  /** The word of the sentence that is swapped, as written in `sentence` (case and accents as spelled). */
  swapWord: string;
  /** What the speaker says instead. */
  swapTo: string;
}

export const CALIBRATION_SENTENCES: readonly CalibrationSentence[] = [
  { id: 's01', sentence: "J'ai mangé tout le gâteau hier soir.", swapWord: 'tout', swapTo: 'tu' },
  { id: 's02', sentence: "Mets le sac dessus, s'il te plaît.", swapWord: 'dessus', swapTo: 'dessous' },
  { id: 's03', sentence: "J'habite dans une petite rue calme.", swapWord: 'rue', swapTo: 'roue' },
  { id: 's04', sentence: 'Ce pull est très doux et chaud.', swapWord: 'doux', swapTo: 'du' },
  { id: 's05', sentence: 'Vous avez un frère ou une sœur ?', swapWord: 'Vous', swapTo: 'vu' },
  { id: 's06', sentence: "J'ai acheté un cadeau pour ma mère.", swapWord: 'pour', swapTo: 'pur' },
  { id: 's07', sentence: "Aujourd'hui, il y a beaucoup de vent.", swapWord: 'vent', swapTo: 'vin' },
  { id: 's08', sentence: 'Mes amis vont au cinéma ce soir.', swapWord: 'vont', swapTo: 'vent' },
  { id: 's09', sentence: 'Je prends un café sans sucre.', swapWord: 'sans', swapTo: 'son' },
  { id: 's10', sentence: "C'est un voyage très long en train.", swapWord: 'long', swapTo: 'lent' },
  { id: 's11', sentence: 'Ce gâteau est vraiment bon.', swapWord: 'bon', swapTo: 'banc' },
  { id: 's12', sentence: "Il fait beau et chaud aujourd'hui.", swapWord: 'beau', swapTo: 'bon' },
  { id: 's13', sentence: 'On traverse le pont pour aller au parc.', swapWord: 'pont', swapTo: 'pain' },
  { id: 's14', sentence: 'Mon père boit un verre de vin.', swapWord: 'vin', swapTo: 'vent' },
  { id: 's15', sentence: 'Je ne bois pas de lait le matin.', swapWord: 'lait', swapTo: 'les' },
  { id: 's16', sentence: "J'invite mes amis samedi soir.", swapWord: 'mes', swapTo: 'mais' },
  { id: 's17', sentence: "J'ai deux frères et une sœur.", swapWord: 'deux', swapTo: 'des' },
  { id: 's18', sentence: 'Je parle un peu français.', swapWord: 'peu', swapTo: 'pu' },
  { id: 's19', sentence: "L'école n'est pas très loin de chez moi.", swapWord: 'loin', swapTo: 'loi' },
  { id: 's20', sentence: 'Il fait moins chaud que hier.', swapWord: 'moins', swapTo: 'moi' },
];
