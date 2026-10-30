import { normalizeFrench } from '../minigames/utils/normalizeFrench';

/**
 * How Rapid Fire marks one typed answer.
 *
 *   correct  matches an accepted spelling once accents, case and punctuation are
 *            ignored (typing é on a phone keyboard is slow, and a sprint is about
 *            recall). `accentsMissed` says the accents were left off, so the game
 *            can show them without penalising it.
 *   almost   one typo away (a slip, a swapped pair of letters). It costs nothing
 *            but earns nothing, and the right spelling is shown.
 *   wrong    anything else — including the wrong article: "le pomme" is not a typo.
 */
export type Verdict = 'correct' | 'almost' | 'wrong';

export interface Judgement {
  verdict: Verdict;
  /** Correct, but the typed text had fewer accents than the accepted spelling. */
  accentsMissed: boolean;
  /** The accepted spelling to show: the one that matched, else the closest, else the first. */
  expected: string;
}

const ARTICLES = new Set(['le', 'la', 'les', 'un', 'une', 'des']);

/** Accents, case and punctuation ignored; a hyphen reads as a space ("grand père" for "grand-père"). */
function norm(s: string): string {
  return normalizeFrench(s.replace(/-/g, ' '));
}

/** Lower-cases and tidies spacing but keeps accents, for the "did they type the accents" check. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/[‘’]/g, "'")
    .normalize('NFC')
    .replace(/[?.,!;:]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Optimal string alignment distance: insert, delete, substitute or swap neighbours, each 1. */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** The leading article of an already-normalised answer ("l'" counts), or null. */
function leadingArticle(norm: string): string | null {
  const first = norm.split(' ')[0];
  if (ARTICLES.has(first)) return first;
  if (norm.startsWith("l'")) return "l'";
  return null;
}

/** How many single-character slips still read as a typo rather than a different answer. */
function typoBudget(expectedLength: number): number {
  if (expectedLength >= 13) return 2;
  if (expectedLength >= 5) return 1;
  return 0;
}

export function judgeAnswer(input: string, answers: string[]): Judgement {
  const first = answers[0] ?? '';
  const typed = norm(input);
  if (!typed) return { verdict: 'wrong', accentsMissed: false, expected: first };

  const matched = answers.find(a => norm(a) === typed);
  if (matched !== undefined) {
    const typedFolded = fold(input);
    const accentsMissed = !answers.some(a => fold(a) === typedFolded);
    return { verdict: 'correct', accentsMissed, expected: matched };
  }

  let best: { answer: string; distance: number } | null = null;
  for (const answer of answers) {
    const target = norm(answer);
    const typedArticle = leadingArticle(typed);
    const answerArticle = leadingArticle(target);
    // "la pomme" for "le pomme": a gender slip is the thing being practised, not a typo.
    if ((typedArticle ?? '') !== (answerArticle ?? '')) continue;
    const distance = editDistance(typed, target);
    if (distance <= typoBudget(target.length) && (!best || distance < best.distance)) {
      best = { answer, distance };
    }
  }
  if (best) return { verdict: 'almost', accentsMissed: false, expected: best.answer };

  // Show the nearest accepted spelling, so a learner who typed "la proviseure" isn't told "le proviseur".
  let nearest = first;
  let nearestDistance = Infinity;
  for (const answer of answers) {
    const distance = editDistance(typed, norm(answer));
    if (distance < nearestDistance) {
      nearest = answer;
      nearestDistance = distance;
    }
  }
  return { verdict: 'wrong', accentsMissed: false, expected: nearest };
}
