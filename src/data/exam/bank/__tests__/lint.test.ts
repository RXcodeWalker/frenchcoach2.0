import { describe, expect, it } from 'vitest';
import { lintAuthoredContent } from '../lint';
import { validateAuthoredQuestionSet } from '../validate';
import { buildCleanSet } from './fixtures';

describe('lintAuthoredContent — quiet on clean content', () => {
  it('produces no warnings on the clean fixture', () => {
    const set = buildCleanSet();
    const issues = lintAuthoredContent(set.content);
    expect(issues).toEqual([]);
  });
});

describe('lintAuthoredContent — fires on deliberately weak content', () => {
  it('flags near-duplicate mainText within a set', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[1].mainText = set.content.topic1.questions[0].mainText;
    const issues = lintAuthoredContent(set.content);
    expect(issues.some((i) => i.code === 'duplicate-main-text')).toBe(true);
  });

  it('flags an alternativeText that merely rephrases its own mainText', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].alternativeTexts = [set.content.topic1.questions[0].mainText];
    const issues = lintAuthoredContent(set.content);
    expect(issues.some((i) => i.code === 'weak-alternative')).toBe(true);
  });

  it('flags time-frame monotony when a topic never exercises past+future', () => {
    const set = buildCleanSet();
    for (const q of set.content.topic1.questions) q.expectedTimeFrame = 'present';
    const issues = lintAuthoredContent(set.content);
    expect(issues.some((i) => i.code === 'time-frame-monotony' && i.path === 'topic1')).toBe(true);
  });

  it('flags low lexical variation when 3+ questions share the same opening stem', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].mainText = "Qu'est-ce que tu manges ?";
    set.content.topic1.questions[1].mainText = "Qu'est-ce que tu bois ?";
    set.content.topic1.questions[2].mainText = "Qu'est-ce que tu portes ?";
    const issues = lintAuthoredContent(set.content);
    expect(issues.some((i) => i.code === 'low-lexical-variation')).toBe(true);
  });
});

describe('validator folds lint results into the warnings bucket, never errors', () => {
  it('a lint smell does not block validation', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[1].mainText = set.content.topic1.questions[0].mainText;
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors).toEqual([]);
    expect(report.warnings.some((w) => w.code === 'duplicate-main-text')).toBe(true);
  });
});
