/**
 * Building the kid's target sentence from a frame and the picture they chose.
 * Pure. The lint, and later the mission builder and matcher, all go through here so
 * "the sentence the kid is aiming for" has one definition.
 */
import type { JuniorSlotOption } from './types';

export const SLOT_MARKER = '{slot}';

/** The slot as spoken: « le bleu », « l'été », « dix », « jaune ». */
export function slotText(option: JuniorSlotOption): string {
  if (option.article === null) return option.word;
  return option.article === "l'" ? `l'${option.word}` : `${option.article} ${option.word}`;
}

/** « J'aime {slot}. » + le bleu → « J'aime le bleu. » */
export function renderSentence(template: string, option: JuniorSlotOption): string {
  return template.replace(SLOT_MARKER, slotText(option));
}

/** « I like {slot}. » + blue → « I like blue. » */
export function renderEnglish(templateEn: string, option: JuniorSlotOption): string {
  return templateEn.replace(SLOT_MARKER, option.en);
}

/** Audio id of the recorded sentence for one (question, frame, pick). */
export function sentenceAudioId(questionId: string, frameIndex: number, optionId: string): string {
  return `${questionId}.f${frameIndex}.${optionId}`;
}
