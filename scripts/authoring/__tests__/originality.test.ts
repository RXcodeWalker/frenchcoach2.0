import { describe, expect, it } from 'vitest';
import { authoredTexts, findOriginalityIssues } from '../originality';
import { buildCleanSet } from '../../../src/data/exam/bank/__tests__/fixtures';

// Synthetic stand-in for a notes extraction — invented text, never real notes wording.
const NOTES = [
  'Page 3',
  'Le candidat répond aux questions du professeur pendant quatre minutes.',
  'Décris le temps en hiver dans ta région natale.',
  'Quel animal domestique voudrais-tu avoir chez toi ?',
].join('\n');

describe('findOriginalityIssues', () => {
  it('is clean when nothing overlaps', () => {
    expect(findOriginalityIssues([buildCleanSet()], 'Un texte sans aucun rapport avec les questions.\nEncore une ligne différente ici.')).toEqual([]);
  });

  it('flags a shared 5-gram and a similar line, by id only', () => {
    // t2q2 is "Décris le temps en hiver dans ta région." — shares 5-grams with, and is similar to, a notes line.
    const findings = findOriginalityIssues([buildCleanSet()], NOTES);
    const t2q2 = findings.filter((f) => f.path === 'topic2.questions[1].mainText');
    expect(t2q2.map((f) => f.kind).sort()).toEqual(['five-gram', 'similar-line']);
    for (const f of findings) {
      expect(Object.keys(f).sort()).toEqual(['kind', 'path', 'setId', 'value']);
      expect(f.setId).toBe('test-set-1');
    }
  });

  it('does not flag short lines (page furniture) or loosely related text', () => {
    const findings = findOriginalityIssues([buildCleanSet()], NOTES);
    expect(findings.every((f) => f.path === 'topic2.questions[1].mainText')).toBe(true);
  });

  it('covers every candidate-facing text, including setup, titles, second parts, alternatives and further questions', () => {
    const paths = authoredTexts(buildCleanSet()).map((t) => t.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'rolePlay.setup',
        'rolePlay.title',
        'rolePlay.tasks[2].secondPartText',
        'topic1.title',
        'topic1.questions[3].alternativeTexts[1]',
        'topic2.furtherQuestions[1]',
      ]),
    );
  });
});
