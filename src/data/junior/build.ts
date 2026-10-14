/** Authoring shorthands for the Junior bank. Plain data builders; no logic. */
import type { JuniorArticle, JuniorGender, JuniorLine, JuniorSlotOption } from './types';

export const line = (audioId: string, fr: string, en: string): JuniorLine => ({ fr, en, audioId });

/** A noun pick: spoken with its article (« le bleu », « une maison »). */
export const noun = (
  id: string,
  word: string,
  emoji: string,
  article: JuniorArticle,
  gender: JuniorGender,
  en: string,
): JuniorSlotOption => ({ id, word, emoji, article, gender, variants: [], en });

/** An adjective pick (« c'est jaune »): no article; `variants` lists the other gendered form. */
export const adj = (id: string, word: string, emoji: string, en: string, variants: readonly string[] = []): JuniorSlotOption => ({
  id,
  word,
  emoji,
  article: null,
  gender: null,
  variants,
  en,
});

/** A number pick (« dix ans »): no article. */
export const num = (id: string, word: string, emoji: string, digits: string): JuniorSlotOption => ({
  id,
  word,
  emoji,
  article: null,
  gender: null,
  variants: [],
  en: digits,
});
