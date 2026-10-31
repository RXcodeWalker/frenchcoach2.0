import { describe, expect, it } from 'vitest';
import { findSelfCorrection } from '../selfCorrection';
import { filterCoachFeedback } from '../filterCoachFeedback';
import type { CoachingIssue, FeedbackV2 } from '../../../../types';

// The owner's answer, 2026-10-31.
const ANSWER =
  "selon moi il y a beaucoup d'avantages d'avoir une bibliothèque dans ton école désolé dans mon école le 1er avantage c'est qu'on peut lire facilement en toute tranquillité il y a aussi une imprimante pour imprimer des feuilles ou des autres choses finalement on peut faire beaucoup de recherches";

describe('findSelfCorrection', () => {
  it('finds a slip repaired straight after « désolé »', () => {
    expect(findSelfCorrection('dans ton école', 'dans mon école', ANSWER)).toEqual({
      quote: 'dans ton école',
      correction: 'dans mon école',
      repair: 'dans mon école',
    });
  });

  it('accepts a restart from the changed word, with no repair word or several', () => {
    expect(findSelfCorrection('ton école', 'mon école', 'dans ton école mon école')?.repair).toBe('mon école');
    expect(findSelfCorrection("j'ai allé", 'je suis allé', "hier j'ai allé, non, je veux dire, je suis allé au parc")?.repair).toBe(
      'je suis allé',
    );
  });

  it('finds the slip and its repair quoted together', () => {
    expect(findSelfCorrection('dans ton école désolé dans mon école', 'dans mon école', ANSWER)?.repair).toBe('dans mon école');
  });

  it('is not fooled by an error that was never repaired', () => {
    expect(findSelfCorrection('des autres choses', "d'autres choses", ANSWER)).toBeNull();
  });

  it('needs the repair right after the slip, not later in the answer', () => {
    expect(findSelfCorrection('mon mère', 'ma mère', "mon mère est grande et j'aime le sport. ma mère aussi")).toBeNull();
    expect(findSelfCorrection('mon mère', 'ma mère', 'mon mère est sympa désolé ma mère')).toBeNull();
  });

  it('ignores an identical or empty correction', () => {
    expect(findSelfCorrection('dans mon école', 'dans mon école', ANSWER)).toBeNull();
    expect(findSelfCorrection('dans ton école', '', ANSWER)).toBeNull();
  });
});

function issue(id: string, quote: string, correction: string): CoachingIssue {
  return { id, category: 'grammar', severity: 'major', quote, diagnostic: 'why', correction, marksImpact: 2 };
}

describe('filterCoachFeedback — self-corrections', () => {
  const feedback = {
    scores: { overall: 7, communication: 7, language: 7, fluency: 7 },
    grammar: {
      critical: [{ id: 'g1', msg: 'm', diagnostic: 'd', correction: 'dans mon école', quote: 'dans ton école' }],
      polish: [{ id: 'g2', msg: 'm', diagnostic: 'd', correction: "d'autres choses", quote: 'des autres choses' }],
    },
    issues: [issue('c1', 'dans ton école', 'dans mon école'), issue('c2', 'des autres choses', "d'autres choses")],
    transcriptAnnotations: [
      { start: 0, end: 5, severity: 'major', category: 'grammar', issueId: 'c1' },
      { start: 10, end: 15, severity: 'minor', category: 'grammar', issueId: 'c2' },
    ],
    topPriorityIssueId: 'c1',
    biggest_opportunity: 'You switched to « dans ton école » after saying « selon moi ».',
    vocabulary: [],
    style: [],
    fillers: [],
    wordCount: 40,
    cefrLevel: 'A2',
    pronunciation: { score: null, issues: [] },
  } as unknown as FeedbackV2;

  it('drops the repaired slip everywhere and keeps it once for the credit note', () => {
    const { feedback: out, dropped } = filterCoachFeedback(feedback, ANSWER, 'speech');
    expect(out.issues?.map((i) => i.id)).toEqual(['c2']);
    expect(out.grammar.critical).toEqual([]);
    expect(out.grammar.polish).toHaveLength(1);
    expect(out.transcriptAnnotations?.map((s) => s.issueId)).toEqual(['c2']);
    expect(out.topPriorityIssueId).toBeUndefined();
    expect(out.selfCorrections).toEqual([{ quote: 'dans ton école', correction: 'dans mon école', repair: 'dans mon école' }]);
    expect(out.biggest_opportunity).toBeUndefined();
    expect(dropped).toEqual(['self-corrected', 'self-corrected', 'focus']);
  });

  it('keeps a one-focus line about something else', () => {
    const { feedback: out } = filterCoachFeedback(
      { ...feedback, biggest_opportunity: 'Link « des autres choses » to a reason.' },
      ANSWER,
      'speech',
    );
    expect(out.biggest_opportunity).toBe('Link « des autres choses » to a reason.');
  });
});
