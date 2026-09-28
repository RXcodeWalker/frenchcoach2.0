/**
 * Pure core of the local-only originality check (ADR 0008,
 * content-authoring §0): compares every authored text in the question bank
 * against a text extraction of the Teacher/Examiner Notes and reports
 * overlaps by set and question id ONLY — never the notes' own wording, so the
 * report can be pasted anywhere without reproducing confidential text.
 *
 * Two signals:
 *  - `five-gram`: the authored text shares at least one 5-token sequence with
 *    the notes (tokens = canonicalized words, see `tokens`).
 *  - `similar-line`: the authored text's token-set similarity to a single line
 *    of the notes is >= SIMILAR_LINE_THRESHOLD (the same Jaccard measure
 *    lint.ts uses for near-duplicates).
 *
 * The CLI (originalityCheck.ts) reads the notes from a path outside both
 * repos; this module never touches the filesystem.
 */
import { canonicalizeForMatch } from '../../src/domain/igcse/text/normalize';
import { tokenSetSimilarity } from '../../src/data/exam/bank/lint';
import type { AuthoredQuestionSet } from '../../src/data/exam/bank/types';

export const NGRAM_SIZE = 5;
export const SIMILAR_LINE_THRESHOLD = 0.6;
/** Lines this short are headings/page furniture, not questions; comparing against them only adds noise. */
const MIN_LINE_TOKENS = 3;

export interface AuthoredText {
  setId: string;
  /** e.g. `rolePlay.tasks[2].secondPartText`, `topic1.questions[4].alternativeTexts[0]`. */
  path: string;
  text: string;
}

export interface OriginalityFinding {
  setId: string;
  path: string;
  kind: 'five-gram' | 'similar-line';
  /** five-gram: number of shared 5-grams; similar-line: best similarity, 2 d.p. */
  value: number;
}

/** Canonicalized word tokens: case/accent-preserving, apostrophes and hyphens split. */
export function tokens(text: string): string[] {
  return canonicalizeForMatch(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function ngrams(toks: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= toks.length; i += 1) out.push(toks.slice(i, i + n).join(' '));
  return out;
}

/** Every piece of authored text in a set that a candidate hears or reads. */
export function authoredTexts(set: AuthoredQuestionSet): AuthoredText[] {
  const id = set.questionSetId;
  const { rolePlay, topic1, topic2 } = set.content;
  const out: AuthoredText[] = [
    { setId: id, path: 'rolePlay.title', text: rolePlay.title },
    { setId: id, path: 'rolePlay.setup', text: rolePlay.setup },
  ];
  rolePlay.tasks.forEach((t, i) => {
    out.push({ setId: id, path: `rolePlay.tasks[${i}].mainText`, text: t.mainText });
    if (t.secondPartText) out.push({ setId: id, path: `rolePlay.tasks[${i}].secondPartText`, text: t.secondPartText });
  });
  for (const [topicPath, topic] of [
    ['topic1', topic1],
    ['topic2', topic2],
  ] as const) {
    out.push({ setId: id, path: `${topicPath}.title`, text: topic.title });
    topic.questions.forEach((q, i) => {
      const p = `${topicPath}.questions[${i}]`;
      out.push({ setId: id, path: `${p}.mainText`, text: q.mainText });
      if (q.secondPartText) out.push({ setId: id, path: `${p}.secondPartText`, text: q.secondPartText });
      q.alternativeTexts.forEach((alt, j) => out.push({ setId: id, path: `${p}.alternativeTexts[${j}]`, text: alt }));
    });
    topic.furtherQuestions.forEach((fq, j) => out.push({ setId: id, path: `${topicPath}.furtherQuestions[${j}]`, text: fq }));
  }
  return out;
}

/** Compares every authored text against the notes' text. Deterministic; findings sorted by set, then path. */
export function findOriginalityIssues(sets: AuthoredQuestionSet[], notesText: string): OriginalityFinding[] {
  const noteLines = notesText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => tokens(l).length >= MIN_LINE_TOKENS);
  const noteGrams = new Set(ngrams(tokens(notesText.replace(/\r?\n/g, ' ')), NGRAM_SIZE));

  const findings: OriginalityFinding[] = [];
  for (const set of sets) {
    for (const item of authoredTexts(set)) {
      const shared = new Set(ngrams(tokens(item.text), NGRAM_SIZE).filter((g) => noteGrams.has(g)));
      if (shared.size > 0) {
        findings.push({ setId: item.setId, path: item.path, kind: 'five-gram', value: shared.size });
      }
      let best = 0;
      for (const line of noteLines) {
        const sim = tokenSetSimilarity(item.text, line);
        if (sim > best) best = sim;
      }
      if (best >= SIMILAR_LINE_THRESHOLD) {
        findings.push({ setId: item.setId, path: item.path, kind: 'similar-line', value: Math.round(best * 100) / 100 });
      }
    }
  }
  return findings.sort((a, b) => a.setId.localeCompare(b.setId) || a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind));
}
