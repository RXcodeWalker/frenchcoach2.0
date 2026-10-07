import { describe, it, expect } from 'vitest';
import { coachErrorDropRule, filterCoachFeedback, strengthQuotes } from '../filterCoachFeedback';
import type { CoachingIssue, FeedbackV2 } from '../../../../types';

const TRANSCRIPT = "Hier je suis allé au cinéma avec mes amis et j'ai mangé des chose. Mon mère aime le film.";

function issue(id: string, quote: string, correction: string): CoachingIssue {
  return { id, category: 'grammar', severity: 'major', quote, diagnostic: 'why', correction, marksImpact: 2 };
}

function feedback(over: Partial<FeedbackV2> = {}): FeedbackV2 {
  return {
    scores: { overall: 6, communication: 6, language: 6, fluency: 6 },
    grammar: { critical: [], polish: [] },
    vocabulary: [],
    style: [],
    fillers: [],
    wordCount: 18,
    cefrLevel: 'A2',
    pronunciation: { score: null, issues: [] },
    ...over,
  } as FeedbackV2;
}

describe('coachErrorDropRule', () => {
  it('keeps a real one-word correction (the examiner quote minimum is not applied)', () => {
    expect(coachErrorDropRule('Mon', 'Ma', TRANSCRIPT, 'speech')).toBeNull();
    expect(coachErrorDropRule('allé', 'je suis allé', TRANSCRIPT, 'speech')).toBeNull();
  });

  it('drops a quote that is not in the transcript', () => {
    expect(coachErrorDropRule('je suis allée', 'je suis allé', TRANSCRIPT, 'speech')).toBe('grounding');
  });

  it('drops a correction identical to the quote, on any input mode', () => {
    expect(coachErrorDropRule('Mon mère', 'mon mère.', TRANSCRIPT, 'text')).toBe('identical');
    expect(coachErrorDropRule('Mon mère', 'mon mère', TRANSCRIPT, undefined)).toBe('identical');
  });

  it('drops a spelling-only error on speech, keeps it when typed or unknown', () => {
    expect(coachErrorDropRule('des chose', 'des choses', TRANSCRIPT, 'speech')).toBe('sound-alike');
    expect(coachErrorDropRule('des chose', 'des choses', TRANSCRIPT, 'text')).toBeNull();
    expect(coachErrorDropRule('des chose', 'des choses', TRANSCRIPT, undefined)).toBeNull();
  });

  it('keeps a quote-less error for the backend evidence gate to judge', () => {
    expect(coachErrorDropRule('', 'Ma mère', TRANSCRIPT, 'speech')).toBeNull();
  });
});

describe('strengthQuotes', () => {
  it('reads « » and the prompt’s << >> spelling', () => {
    expect(strengthQuotes('Your « avec mes amis » and << au cinéma >> work.')).toEqual(['avec mes amis', 'au cinéma']);
  });
});

describe('filterCoachFeedback', () => {
  it('returns the same object when nothing is dropped', () => {
    const fb = feedback({ issues: [issue('a', 'Mon mère', 'Ma mère')], best_moment: 'Your « avec mes amis » adds company.' });
    const out = filterCoachFeedback(fb, TRANSCRIPT, 'speech');
    expect(out.dropped).toEqual([]);
    expect(out.feedback).toBe(fb);
  });

  it('drops issues and grammar items by the same rules, and prunes their spans and top priority', () => {
    const fb = feedback({
      issues: [issue('keep', 'Mon mère', 'Ma mère'), issue('gone', 'des chose', 'des choses')],
      transcriptAnnotations: [
        { start: 0, end: 3, severity: 'major', category: 'grammar', issueId: 'keep' },
        { start: 5, end: 9, severity: 'major', category: 'grammar', issueId: 'gone' },
      ],
      topPriorityIssueId: 'gone',
      grammar: {
        critical: [{ theme: 'Gender', severity: 'major', msg: 'm', diagnostic: 'd', correction: 'Ma mère', quote: 'Mon mère' } as never],
        polish: [{ theme: 'Plural', severity: 'minor', msg: 'm', diagnostic: 'd', correction: 'des choses', quote: 'des chose' } as never],
      },
    });
    const out = filterCoachFeedback(fb, TRANSCRIPT, 'speech');
    expect(out.dropped).toEqual(['sound-alike', 'sound-alike']);
    expect(out.feedback.issues!.map((i) => i.id)).toEqual(['keep']);
    expect(out.feedback.transcriptAnnotations!.map((s) => s.issueId)).toEqual(['keep']);
    expect(out.feedback.topPriorityIssueId).toBeUndefined();
    expect(out.feedback.grammar.critical).toHaveLength(1);
    expect(out.feedback.grammar.polish).toHaveLength(0);
  });

  it('drops a strength that praises a reported error', () => {
    const fb = feedback({ issues: [issue('a', 'Mon mère', 'Ma mère')], best_moment: 'Your « Mon mère aime le film » is a full sentence.' });
    const out = filterCoachFeedback(fb, TRANSCRIPT, 'speech');
    expect(out.dropped).toEqual(['strength']);
    expect(out.feedback.best_moment).toBeUndefined();
    expect(out.feedback.issues).toHaveLength(1);
  });

  it('drops a strength whose quote is not in the transcript', () => {
    const fb = feedback({ best_moment: 'Your « parce que j’adore » gives a reason.' });
    expect(filterCoachFeedback(fb, TRANSCRIPT, 'speech').feedback.best_moment).toBeUndefined();
  });

  it('a strength with no quote is left to the backend gate', () => {
    const fb = feedback({ best_moment: 'You linked two ideas.' });
    expect(filterCoachFeedback(fb, TRANSCRIPT, 'speech').dropped).toEqual([]);
  });
});
