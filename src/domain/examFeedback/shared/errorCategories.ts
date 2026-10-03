/**
 * The nine error categories examiner-style feedback may attach to a mistake
 * (Phase 3 plan, "Shared invariants"). A closed set so the UI can render a
 * chip and a later report can aggregate by category; anything the model
 * invents outside it is coerced to 'other', never shown as free text.
 */

export const ERROR_CATEGORIES = [
  'tense',
  'verb_form',
  'auxiliary',
  'agreement',
  'gender',
  'preposition',
  'word_order',
  'vocabulary',
  'other',
] as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

export const ERROR_CATEGORY_LABELS: Record<ErrorCategory, string> = {
  tense: 'Tense',
  verb_form: 'Verb form',
  auxiliary: 'Auxiliary verb',
  agreement: 'Agreement',
  gender: 'Gender',
  preposition: 'Preposition',
  word_order: 'Word order',
  vocabulary: 'Vocabulary',
  other: 'Other',
};

export function isErrorCategory(value: unknown): value is ErrorCategory {
  return typeof value === 'string' && (ERROR_CATEGORIES as readonly string[]).includes(value);
}

/** An unrecognised category is 'other' rather than a dropped error: the mistake is real, only its label is unknown. */
export function coerceErrorCategory(value: unknown): ErrorCategory {
  return isErrorCategory(value) ? value : 'other';
}
