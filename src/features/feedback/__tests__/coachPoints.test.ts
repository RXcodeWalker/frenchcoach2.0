import { describe, it, expect } from 'vitest';
import { coachPointGroups, selectCoachFixes, MAX_COACH_FIXES } from '../coachPoints';
import type { CoachingIssue, FeedbackV2 } from '../../../types';

function issue(id: string, severity: CoachingIssue['severity'], marksImpact: CoachingIssue['marksImpact']): CoachingIssue {
  return { id, category: 'grammar', severity, quote: `q-${id}`, diagnostic: `why-${id}`, correction: `c-${id}`, marksImpact, themeLabel: `T-${id}` };
}

function fb(over: Partial<FeedbackV2>): FeedbackV2 {
  return {
    scores: { overall: 6, communication: 6, language: 6, fluency: 6 },
    grammar: { critical: [], polish: [] },
    vocabulary: [], style: [], fillers: [], wordCount: 20, cefrLevel: 'A2',
    pronunciation: { score: null, issues: [] },
    ...over,
  } as FeedbackV2;
}

describe('selectCoachFixes', () => {
  it('shows at most two, top priority first, then severity and impact', () => {
    const fixes = selectCoachFixes(fb({
      issues: [issue('polish', 'polish', 3), issue('minor', 'minor', 1), issue('major', 'major', 2), issue('top', 'minor', 0)],
      topPriorityIssueId: 'top',
    }));
    expect(MAX_COACH_FIXES).toBe(2);
    expect(fixes).toEqual([
      { kind: 'fix', quote: 'q-top', correction: 'c-top', why: 'why-top', tag: 'T-top' },
      { kind: 'fix', quote: 'q-major', correction: 'c-major', why: 'why-major', tag: 'T-major' },
    ]);
  });

  it('skips an issue with no quote or no correction', () => {
    const noQuote = { ...issue('a', 'major', 3), quote: '' };
    expect(selectCoachFixes(fb({ issues: [noQuote, issue('b', 'minor', 1)] })).map((f) => f.kind === 'fix' && f.quote)).toEqual(['q-b']);
  });

  it('falls back to quoted grammar items when there is no corrections list', () => {
    const grammar = {
      critical: [{ theme: 'Gender', severity: 'major', msg: 'm', diagnostic: 'Mère is feminine.', correction: 'ma mère', quote: 'mon mère' }],
      polish: [{ theme: 'Style', severity: 'minor', msg: 'm', diagnostic: 'd', correction: 'x' }],
    } as unknown as FeedbackV2['grammar'];
    expect(selectCoachFixes(fb({ grammar }))).toEqual([
      { kind: 'fix', quote: 'mon mère', correction: 'ma mère', why: 'Mère is feminine.', tag: 'Gender' },
    ]);
  });
});

describe('coachPointGroups', () => {
  it('is What worked then Fix these', () => {
    const groups = coachPointGroups(fb({ best_moment: 'Your « avec mes amis » adds company.' }));
    expect(groups.map((g) => [g.heading, g.tone, g.points.length])).toEqual([
      ['What worked', 'good', 1],
      ['Fix these', 'bad', 0],
    ]);
  });
});
