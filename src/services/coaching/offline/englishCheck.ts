/**
 * English inside a French answer — a learner reaching for a word they don't
 * have (« je joue au foot with my friends »), or a whole answer given in
 * English. Offline, the rule-based coach used to stay silent on both, or even
 * praise the "longest clean sentence" of an English answer.
 *
 * Deliberately narrow: the word list holds only words that are not also
 * French (« but », « an », « as », « on », « me », « son » are out) and none
 * of the loanwords French uses every day (« sport », « week-end », « cool »,
 * « shopping »…). A correction is offered only from a small phrase glossary,
 * so the Second take always has real French to check against; anything else
 * is noted as a next step, never invented.
 */
import type { BlockedSpan } from './strengths';

const ENGLISH_WORDS = new Set([
  'the', 'and', 'with', 'because', 'my', 'very', 'is', 'was', 'were', 'have', 'has', 'had', 'like', 'they', 'we',
  'you', 'it', "it's", 'this', 'that', 'what', 'when', 'where', 'which', 'who', 'there', 'their', 'then', 'school',
  'friends', 'friend', 'mates', 'family', 'play', 'played', 'playing', 'went', 'go', 'going', 'good', 'really', 'also',
  'of', 'in', 'to', 'for', 'at', 'i', "i'm", "don't", 'think', 'so', 'not', 'are', 'am', 'be', 'been', 'he', 'she',
  'his', 'her', 'them', 'our', 'about', 'after', 'before', 'every', 'day', 'time', 'would', 'will', 'can', 'could',
  'should', 'from', 'home', 'mum', 'mom', 'dad', 'brother', 'sister', 'music', 'games', 'watch', 'eat', 'food', 'big',
  'small', 'lots', 'many', 'much', 'more', 'most', 'some', 'how', 'why', 'yes', 'usually', 'sometimes', 'always',
  'never', 'favourite', 'favorite', 'subject', 'teacher', 'teachers', 'holiday', 'holidays', 'last', 'next', 'year',
  'week', 'summer', 'winter', 'beach', 'town', 'city', 'love', 'hate', 'enjoy', 'boring', 'interesting',
]);
/** Short words that, alone, are too likely to be recogniser noise to point at. */
const TOO_SHORT_ALONE = new Set(['the', 'i', 'it', 'so', 'to', 'in', 'at', 'of', 'is', 'am', 'be', 'he', 'we', 'day', 'go', 'are']);

/** Phrase → French, for the corrections the coach can stand behind. Longest phrases first. */
const GLOSSARY: Array<[string, string]> = [
  ['with my friends', 'avec mes amis'],
  ['with my family', 'avec ma famille'],
  ['with my mates', 'avec mes amis'],
  ['every day', 'tous les jours'],
  ['at school', "à l'école"],
  ['my friends', 'mes amis'],
  ['my family', 'ma famille'],
  ['my brother', 'mon frère'],
  ['my sister', 'ma sœur'],
  ['my mum', 'ma mère'],
  ['my mom', 'ma mère'],
  ['my dad', 'mon père'],
  ['i think', 'je pense'],
  ['i like', "j'aime"],
  ['i love', "j'adore"],
  ['it was', "c'était"],
  ["it's", "c'est"],
  ['it is', "c'est"],
  ['because', 'parce que'],
  ['really', 'vraiment'],
  ['usually', "d'habitude"],
  ['sometimes', 'parfois'],
  ['always', 'toujours'],
  ['never', 'jamais'],
  ['also', 'aussi'],
  ['very', 'très'],
  ['with', 'avec'],
  ['and', 'et'],
  ['boring', 'ennuyeux'],
  ['interesting', 'intéressant'],
  ['holidays', 'les vacances'],
  ['summer', "l'été"],
  ['winter', "l'hiver"],
  ['beach', 'la plage'],
  ['teacher', 'le professeur'],
];
const GLOSSARY_MAP = new Map(GLOSSARY);

export interface EnglishRun extends BlockedSpan {
  text: string;
  /** The French for the whole run, when the glossary knows it. */
  french?: string;
}

export interface EnglishCheck {
  runs: EnglishRun[];
  englishWords: number;
  totalWords: number;
  /** Half or more of the answer is English (and at least four English words). */
  mostlyEnglish: boolean;
}

/** Hyphens stay inside a word, so « week-end » is one French word, not « week » + « end ». */
const WORD_RE = /[\p{L}'’-]+/gu;

export function checkEnglish(transcript: string): EnglishCheck {
  const tokens = [...transcript.matchAll(WORD_RE)].map((m) => ({
    text: m[0],
    key: m[0].toLowerCase().replace('’', "'"),
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
  }));

  const runs: EnglishRun[] = [];
  let englishWords = 0;
  let i = 0;
  while (i < tokens.length) {
    if (!ENGLISH_WORDS.has(tokens[i].key)) {
      i++;
      continue;
    }
    let j = i;
    // A run continues over adjacent tokens separated only by spaces (punctuation ends it).
    while (
      j + 1 < tokens.length &&
      ENGLISH_WORDS.has(tokens[j + 1].key) &&
      /^\s+$/.test(transcript.slice(tokens[j].end, tokens[j + 1].start))
    ) {
      j++;
    }
    const runTokens = tokens.slice(i, j + 1);
    const length = runTokens.length;
    const single = length === 1 ? runTokens[0].key : null;
    const counts = !(single && TOO_SHORT_ALONE.has(single));
    if (counts) {
      englishWords += length;
      const start = runTokens[0].start;
      const end = runTokens[length - 1].end;
      const text = transcript.slice(start, end);
      const french = GLOSSARY_MAP.get(text.toLowerCase().replace('’', "'"));
      runs.push({ start, end, text, ...(french ? { french } : {}) });
    }
    i = j + 1;
  }

  const totalWords = tokens.length;
  return {
    runs,
    englishWords,
    totalWords,
    mostlyEnglish: englishWords >= 4 && totalWords > 0 && englishWords / totalWords >= 0.5,
  };
}
