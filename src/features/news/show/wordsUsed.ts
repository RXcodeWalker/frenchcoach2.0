/**
 * "Story words you used" — docs/systems/daily-news.md §7. Pure: which glossary
 * words of today's story the learner reused in their own answers. Deterministic
 * (newsMatch.ts), so it costs no AI call and works offline.
 */
import type { NewsGlossaryEntry } from '../../../data/news/types';
import { usedPhrase } from '../newsMatch';

export interface StoryWord extends NewsGlossaryEntry {
  used: boolean;
}

export function wordsUsed(glossary: readonly NewsGlossaryEntry[], answers: readonly string[]): StoryWord[] {
  const text = answers.join(' ');
  return glossary.map(g => ({ ...g, used: usedPhrase(text, g.fr) }));
}
