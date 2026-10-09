import { describe, it, expect } from 'vitest';
import { coachPointGroups, selectCoachFixes, FIRST_FIXES } from '../coachPoints';
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
  it('returns every fix, top priority first, then severity and impact', () => {
    const fixes = selectCoachFixes(fb({
      issues: [issue('polish', 'polish', 3), issue('minor', 'minor', 1), issue('major', 'major', 2), issue('top', 'minor', 0)],
      topPriorityIssueId: 'top',
    }));
    expect(fixes.map((f) => f.kind === 'fix' && f.quote)).toEqual(['q-top', 'q-major', 'q-minor', 'q-polish']);
    expect(fixes[0]).toEqual({ kind: 'fix', quote: 'q-top', correction: 'c-top', why: 'why-top', tag: 'T-top' });
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

  it('deduplicates by quote across issues[] and the grammar items, keeping grammar-only errors', () => {
    const grammar = {
      critical: [
        // The same error corrections[] already reports, in another case and with edge punctuation.
        { theme: 'Gender', severity: 'major', msg: 'm', diagnostic: 'd', correction: 'Ma mère', quote: 'mon mère,' },
        { theme: 'Agreement', severity: 'major', msg: 'm', diagnostic: 'Plural.', correction: 'des pizzas', quote: 'des pizza' },
      ],
      polish: [{ theme: 'Agreement', severity: 'minor', msg: 'm', diagnostic: 'again', correction: 'des pizzas', quote: 'Des pizza' }],
    } as unknown as FeedbackV2['grammar'];
    const fixes = selectCoachFixes(fb({ issues: [{ ...issue('g', 'major', 3), quote: 'Mon mère', correction: 'Ma mère' }], grammar }));
    expect(fixes.map((f) => f.kind === 'fix' && f.quote)).toEqual(['Mon mère', 'des pizza']);
  });
});

describe('coachPointGroups', () => {
  it('is What you did well, Fix these first, then Also worth fixing', () => {
    const groups = coachPointGroups(fb({ best_moment: 'Your « avec mes amis » adds company.' }));
    expect(groups.map((g) => [g.heading, g.tone, g.points.length])).toEqual([
      ['What you did well', 'good', 1],
      ['Fix these first', 'bad', 0],
      ['Also worth fixing', 'bad', 0],
    ]);
  });

  it('puts the first two fixes first and every other fix, visible, under Also worth fixing', () => {
    expect(FIRST_FIXES).toBe(2);
    const groups = coachPointGroups(fb({
      issues: ['a', 'b', 'c', 'd', 'e'].map((id, i) => issue(id, 'major', (3 - Math.min(i, 3)) as CoachingIssue['marksImpact'])),
    }));
    const quotes = (i: number) => groups[i].points.map((p) => p.kind === 'fix' && p.quote);
    expect(quotes(1)).toEqual(['q-a', 'q-b']);
    expect(quotes(2)).toEqual(['q-c', 'q-d', 'q-e']);
  });

  it('shows every strength with its quote, and best_moment only as the fallback', () => {
    const strengths = [
      { quote: 'avec mes amis', why: 'You said who you were with.' },
      { quote: 'parce que c’est drôle', why: 'You gave a reason.' },
      { quote: 'je suis allé', why: 'You used être with aller.' },
    ];
    const [well] = coachPointGroups(fb({ strengths, best_moment: 'Your « avec mes amis » adds company.' }));
    expect(well.points).toEqual(strengths.map((s) => ({ kind: 'claim', claim: s.why, quote: s.quote })));

    const [fallback] = coachPointGroups(fb({ strengths: [], best_moment: 'Your « avec mes amis » adds company.' }));
    expect(fallback.points).toEqual([{ kind: 'claim', claim: 'Your « avec mes amis » adds company.' }]);
  });
});
