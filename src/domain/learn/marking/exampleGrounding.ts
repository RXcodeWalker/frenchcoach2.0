// learn-marking §6.1 — the needs-card example is drop-only.
//
// The checklist (backend lib/learn_ladder.py, `_replaces_linking_word`) already
// drops an example that is the student's sentence with a linking word replaced
// by a different one. This is the same rule, applied again when the card is
// drawn, so a reply from an older checker cannot show "mais" where the student
// said "et". Nothing here is rewritten: a swapped example is discarded.
//
// Kept in step with that Python function. A change to the linking words, the
// normalisation or the alignment is a change in both places.

/** Linking phrases, longest first, on the normalised words. "que" alone is not one. */
const LINKING_PHRASES: readonly (readonly string[])[] = [
  ["c'est", 'pourquoi'],
  ['par', 'contre'],
  ['en', 'revanche'],
  ['alors', 'que'],
  ['meme', 'si'],
  ['parce', 'que'],
  ['tandis', 'que'],
];

const LINKING_WORDS = new Set([
  'et', 'puis', 'mais', 'ou', 'donc', 'car', 'or', 'ni',
  'cependant', 'pourtant', 'alors', 'ensuite', 'apres', 'quand',
  'lorsque', 'puisque', 'quoique', 'sinon', 'toutefois', 'neanmoins',
  "d'abord",
]);

/** The checklist's `_normalise`: case, accents, apostrophes and punctuation ignored. */
export function normaliseLadderText(text: string): string {
  const straight = text.replace(/[’‘ʼ´`′]/g, "'");
  const stripped = straight.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const lowered = stripped.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae');
  const spaced = lowered.replace(/[^\w']+/g, ' ').replace(/_/g, ' ');
  return spaced
    .split(/\s+/)
    .map(token => token.replace(/^'+|'+$/g, ''))
    .filter(Boolean)
    .join(' ');
}

/** 'qu'il' is 'que' + 'il', so 'parce qu'il' is the linking phrase 'parce que'. */
function splitElidedQue(word: string): string[] {
  if (word.startsWith("qu'") && word.length > 3) return ['que', word.slice(3)];
  return [word];
}

type LinkUnit = { word: string; linking: boolean };

function linkUnits(text: string): LinkUnit[] {
  const words = normaliseLadderText(text).split(' ').filter(Boolean).flatMap(splitElidedQue);
  const units: LinkUnit[] = [];
  let i = 0;
  while (i < words.length) {
    const phrase = LINKING_PHRASES.find(candidate =>
      candidate.every((part, offset) => words[i + offset] === part),
    );
    if (phrase) {
      units.push({ word: phrase.join(' '), linking: true });
      i += phrase.length;
    } else {
      const word = words[i];
      units.push({ word, linking: LINKING_WORDS.has(word) });
      i += 1;
    }
  }
  return units;
}

/**
 * True when `example` is a span of `transcript` with a linking word replaced by
 * a different one. Adding a linking word is not a replacement: the words no
 * longer line up one for one, so that example is kept.
 */
export function replacesLinkingWord(example: string, transcript: string): boolean {
  const exampleUnits = linkUnits(example);
  const transcriptUnits = linkUnits(transcript);
  if (exampleUnits.length < 2 || exampleUnits.length > transcriptUnits.length) return false;
  const width = exampleUnits.length;
  for (let start = 0; start <= transcriptUnits.length - width; start += 1) {
    const diffs: Array<[LinkUnit, LinkUnit]> = [];
    for (let offset = 0; offset < width; offset += 1) {
      const left = transcriptUnits[start + offset];
      const right = exampleUnits[offset];
      if (left.word !== right.word) diffs.push([left, right]);
    }
    if (diffs.length > 0 && diffs.every(([left, right]) => left.linking && right.linking)) return true;
  }
  return false;
}
