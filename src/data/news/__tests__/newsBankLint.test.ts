import { describe, expect, it } from 'vitest';
import { NEWS_EDITIONS } from '..';
import { lintNewsBank } from '../newsBankLint';
import type { NewsEdition } from '../types';

describe('news bank lint', () => {
  it('the shipped bank has no lint errors', () => {
    const errors = lintNewsBank(NEWS_EDITIONS).filter(i => i.severity === 'error');
    expect(errors.map(e => `${e.editionId}/${e.level ?? '-'} ${e.code}: ${e.message}`)).toEqual([]);
  });

  it('flags a one-keyword fact, a cue missing from the story and a banned topic', () => {
    const base = NEWS_EDITIONS[0];
    const broken: NewsEdition = structuredClone(base) as NewsEdition;
    broken.id = 'broken-copy';
    broken.levels.a2.facts[0] = { id: 'x', en: 'x', sentence: 0, cues: [['abeille*']] };
    broken.levels.a2.facts[1] = { id: 'y', en: 'y', sentence: 1, cues: [['hotel*'], ['dinosaure']] };
    broken.levels.a2.sentences[3] = { fr: 'La police est venue.', en: 'The police came.' };
    const codes = lintNewsBank([...NEWS_EDITIONS, broken])
      .filter(i => i.editionId === 'broken-copy' && i.severity === 'error')
      .map(i => i.code);
    expect(codes).toContain('fact-cues');
    expect(codes).toContain('fact-cue-not-in-text');
    expect(codes).toContain('banned-topic');
  });

  it('lists unreviewed editions as warnings, never errors', () => {
    const issues = lintNewsBank(NEWS_EDITIONS).filter(i => i.code === 'unreviewed');
    expect(issues.every(i => i.severity === 'warning')).toBe(true);
  });
});
