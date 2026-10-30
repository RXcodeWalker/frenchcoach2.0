import type { VocabEntry } from './types';

// Articles a deck entry's `fr` can already start with. Most authored entries
// write the noun with its article ("le pain") *and* set `article`, a few write
// the bare noun ("jour ouvré"), so the article is only added when it's missing.
const LEADING_ARTICLE = /^(le|la|les|l['’]|un|une|des|du|de la|de l['’]|au|aux)(\s|(?<=['’]))/i;

/** The French form to show for a vocab entry — its article exactly once. */
export function frenchWithArticle(entry: Pick<VocabEntry, 'fr' | 'pos' | 'article'>): string {
  const fr = entry.fr.trim();
  if (entry.pos !== 'noun' || !entry.article || LEADING_ARTICLE.test(fr)) return fr;
  const article = entry.article.trim();
  return /['’]$/.test(article) ? `${article}${fr}` : `${article} ${fr}`;
}

/** Collapses a doubled leading article ("le le pain" → "le pain") in AI-written vocab. */
export function collapseRepeatedArticle(text: string): string {
  return text.trim().replace(/^(le|la|les|un|une|des)\s+\1\s+/i, '$1 ');
}
