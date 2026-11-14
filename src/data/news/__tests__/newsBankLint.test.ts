import { describe, expect, it } from 'vitest';
import { NEWS_EDITIONS, NEWS_SEGMENTS, NEWS_STORIES } from '..';
import { lintNewsBank, lintSegmentCoverage } from '../newsBankLint';
import type { NewsEdition } from '../types';

describe('news bank lint', () => {
  it('the shipped bank has no lint errors', () => {
    const errors = [...lintNewsBank(NEWS_EDITIONS), ...lintSegmentCoverage(NEWS_STORIES, NEWS_SEGMENTS)]
      .filter(i => i.severity === 'error');
    expect(errors.map(e => `${e.editionId}/${e.level ?? '-'} ${e.code}: ${e.message}`)).toEqual([]);
  });

  it('every story is in the bank with its segments', () => {
    expect(NEWS_EDITIONS.map(e => e.id)).toEqual(NEWS_STORIES.map(s => s.id));
  });

  it('flags an unchanged fake, an interview with no past question, a missing question mark and a banned topic', () => {
    const broken: NewsEdition = structuredClone(NEWS_EDITIONS[0]) as NewsEdition;
    broken.id = 'broken-copy';
    const a2 = broken.levels.a2;
    a2.fake.fr = a2.sentences[a2.fake.sentence].fr;
    a2.interview.questions = a2.interview.questions.map(q => ({ ...q, kind: 'describe' as const }));
    a2.interview.questions[0].fr = 'Tu aimes le miel';
    a2.sentences[3] = { fr: 'La police est venue.', en: 'The police came.' };
    const codes = lintNewsBank([...NEWS_EDITIONS, broken])
      .filter(i => i.editionId === 'broken-copy' && i.severity === 'error')
      .map(i => i.code);
    expect(codes).toEqual(expect.arrayContaining(['fake-unchanged', 'interview-tenses', 'interview-question-mark', 'banned-topic']));
  });

  it('a story without segments is reported', () => {
    const issues = lintSegmentCoverage([...NEWS_STORIES, { ...NEWS_STORIES[0], id: 'lonely-story' }], NEWS_SEGMENTS);
    expect(issues.map(i => `${i.editionId} ${i.code}`)).toEqual(['lonely-story missing-segments']);
  });

  it('lists unreviewed editions as warnings, never errors', () => {
    const issues = lintNewsBank(NEWS_EDITIONS).filter(i => i.code === 'unreviewed');
    expect(issues.every(i => i.severity === 'warning')).toBe(true);
  });
});
