/**
 * « Le journaliste, c'est toi » — which question word did the learner ask with?
 * docs/systems/daily-news.md §7. Pure and deterministic: no AI call.
 *
 * The forms come from Question Detective's word list (`QUESTION_WORDS`), so the
 * two features never disagree about what a word looks like. Position does not
 * matter (« Tu arrives quand ? », « Quand arrives-tu ? », « Quand est-ce que tu
 * arrives ? » all ask `quand`). A recogniser writes « ou » for « où » at times,
 * so a bare « ou » counts as `où` only where « or » can't stand: first word,
 * last word, or before « est-ce ».
 *
 * The check only ever says « right », names the word that was used instead
 * (`mixup`), or says it heard no question word (`none`) — never "wrong French".
 */
import { QUESTION_WORDS } from '../../../data/questionWords/words';
import type { WordId } from '../../../data/questionWords/types';

export type JournalistVerdict =
  | { verdict: 'right' }
  | { verdict: 'mixup'; given: WordId }
  | { verdict: 'none' };

function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/** Lower-case words, apostrophes and hyphens split, « où » kept apart from « ou ». */
function tokens(text: string): string[] {
  const marked = text.toLowerCase().replace(/[’‘ʼ`´]/g, "'").replace(/où/g, ' __ou__ ');
  return fold(marked)
    .split(/[^a-z_]+/)
    .filter(Boolean);
}

/** Every question word the text uses, in the order it uses them. */
export function questionWordsIn(text: string): WordId[] {
  const t = tokens(text);
  const found: { id: WordId; at: number }[] = [];
  const add = (id: WordId, at: number) => {
    if (!found.some(f => f.id === id)) found.push({ id, at });
  };
  const used = new Set<number>();

  // qu'est-ce que / qu'est-ce qui / qu'est-ce / quoi / « Que fais-tu ? »
  for (let i = 0; i < t.length; i++) {
    if (t[i] === 'qu' && t[i + 1] === 'est' && t[i + 2] === 'ce') {
      add('questce', i);
      [i, i + 1, i + 2, i + 3].forEach(n => used.add(n)); // the que/qui after it is part of the phrase
    } else if (t[i] === 'quoi' || (i === 0 && t[i] === 'que')) {
      add('questce', i);
      used.add(i);
    }
  }

  const single = new Map<string, WordId>();
  for (const w of QUESTION_WORDS) {
    if (w.id === 'questce') continue;
    for (const form of w.forms) single.set(fold(form), w.id);
  }

  for (let i = 0; i < t.length; i++) {
    if (used.has(i)) continue;
    const tok = t[i];
    if (tok === '__ou__') {
      add('ou', i);
      continue;
    }
    if (tok === 'ou' && (i === 0 || i === t.length - 1 || t[i + 1] === 'est')) {
      add('ou', i);
      continue;
    }
    // « À quelle heure… ? » asks when.
    if ((tok === 'quelle' || tok === 'quel') && t[i + 1] === 'heure') {
      add('quand', i);
      continue;
    }
    const id = single.get(tok);
    if (id && id !== 'ou') add(id, i);
  }

  return found.sort((a, b) => a.at - b.at).map(f => f.id);
}

export function checkJournalistQuestion(text: string, target: WordId): JournalistVerdict {
  const words = questionWordsIn(text);
  if (words.includes(target)) return { verdict: 'right' };
  if (words.length > 0) return { verdict: 'mixup', given: words[0] };
  return { verdict: 'none' };
}
