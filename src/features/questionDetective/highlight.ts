import { questionWord } from '../../data/questionWords/words';
import type { WordId } from '../../data/questionWords/types';

export interface Highlighted {
  before: string;
  word: string;
  after: string;
}

/** Split a prompt so the question word can be marked, wherever it sits. */
export function highlightWord(prompt: string, wordId: WordId): Highlighted {
  const tool = questionWord(wordId);
  const forms = tool?.forms ?? [wordId];
  const lower = prompt.toLowerCase();
  let best: { start: number; length: number } | null = null;
  for (const form of forms) {
    const idx = lower.indexOf(form.toLowerCase());
    if (idx < 0) continue;
    // Longest match at the leftmost index, so « quelle » is not marked as « quel » + « le ».
    if (!best || idx < best.start || (idx === best.start && form.length > best.length)) {
      best = { start: idx, length: form.length };
    }
  }
  if (!best) return { before: prompt, word: '', after: '' };
  return {
    before: prompt.slice(0, best.start),
    word: prompt.slice(best.start, best.start + best.length),
    after: prompt.slice(best.start + best.length),
  };
}
