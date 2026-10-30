import type { EmojiQuestion } from '../../data/emojiQuestions';

/**
 * Every spelling accepted for a typed answer. `matchTypedAnswer` already
 * ignores case, accents and punctuation; this adds the two spellings that
 * normalisation can't see: "oe" for the ligature, and a space for a hyphen
 * (it deletes hyphens, so "arc en ciel" would otherwise miss "arc-en-ciel").
 */
export function acceptableAnswers(question: Pick<EmojiQuestion, 'french'>): string[] {
  const { french } = question;
  return [
    ...new Set([french, french.replace(/œ/g, 'oe').replace(/Œ/g, 'Oe'), french.replace(/-/g, ' ')]),
  ];
}
