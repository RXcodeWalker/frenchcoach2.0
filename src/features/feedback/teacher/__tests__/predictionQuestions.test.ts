import { describe, it, expect } from 'vitest';
import { claimMentionsMarkOrBand } from '../../../../domain/examFeedback/shared/markClaimFilter';
import type { QuestionDemands } from '../../../../domain/learn/demand/types';
import { calibrationLines, fixesFromGroups, predictionChecks, type PredictionCheck } from '../predictionQuestions';

type Demands = Pick<QuestionDemands, 'cognitiveDemand' | 'timeFrames' | 'structures'>;
const d = (
  cognitiveDemand: Demands['cognitiveDemand'],
  timeFrames: Demands['timeFrames'],
  structures: Demands['structures'] = [],
): Demands => ({ cognitiveDemand, timeFrames, structures });
const ids = (demands: Demands | undefined) => predictionChecks(demands).map((c) => c.id);
const NO_FIXES = { quotes: [] };

// The owner's answer to sch_22 (« Quels sont les avantages d'avoir une bibliothèque… »), 2026-10-31.
const LIBRARY_ANSWER =
  "selon moi il y a beaucoup d'avantages d'avoir une bibliothèque dans mon école le premier avantage c'est qu'on peut lire facilement il y a aussi une imprimante finalement on peut faire beaucoup de recherches";

describe('predictionChecks — drawn from the question, then mistakes', () => {
  it('no longer offers the vague length check; a present-tense describe question gets a reason and linking', () => {
    // sch_22's real demands: describe, present, no structures.
    expect(ids(d('describe', ['present']))).toEqual(['reason', 'linking', 'mistakes']);
    for (const check of predictionChecks(d('describe', ['present']))) expect(check.prompt).not.toMatch(/sentences/);
  });

  it('asks about the time frame the question asks about, first', () => {
    expect(ids(d('describe', ['past']))).toEqual(['tense', 'reason', 'mistakes']);
    expect(predictionChecks(d('describe', ['past']))[0]).toMatchObject({ prompt: 'Did you talk about the past?', frames: ['past'] });
    expect(predictionChecks(d('describe', ['past', 'future']))[0].prompt).toBe('Did you talk about the past or the future?');
    expect(ids(d('hypothesize', ['conditional']))).toEqual(['conditional', 'reason', 'mistakes']);
  });

  it('asks for a reason, a comparison or an opinion when the question does', () => {
    expect(ids(d('justify', ['present']))).toEqual(['reason', 'linking', 'mistakes']);
    expect(ids(d('compare', ['present']))).toEqual(['comparison', 'reason', 'mistakes']);
    expect(ids(d('describe', ['present'], ['opinion']))).toEqual(['opinion', 'reason', 'mistakes']);
    expect(ids(d('explain', ['past'], ['opinion']))).toEqual(['tense', 'reason', 'mistakes']);
  });

  it('always ends with the mistakes check, and works with no demands', () => {
    expect(ids(undefined)).toEqual(['reason', 'linking', 'mistakes']);
  });

  it('never phrases a check as a mark or band', () => {
    for (const demands of [d('describe', ['present']), d('compare', ['past']), d('hypothesize', ['conditional'], ['opinion'])]) {
      for (const check of predictionChecks(demands)) expect(claimMentionsMarkOrBand(check.prompt), check.prompt).toBe(false);
    }
  });
});

describe('calibrationLines — every answered check gets a verdict', () => {
  const checks = predictionChecks(d('describe', ['present']));

  it('confirms with the words found, quoted verbatim', () => {
    const lines = calibrationLines(checks, { linking: 'yes' }, LIBRARY_ANSWER, NO_FIXES);
    expect(lines).toEqual([{ id: 'linking', answer: 'yes', verdict: 'right', quote: 'aussi', text: 'Right, here it is: « aussi ».' }]);
  });

  it('tells a learner who said no that they did it', () => {
    const [line] = calibrationLines(checks, { reason: 'no' }, "J'aime le foot parce que c'est drôle.", NO_FIXES);
    expect(line.verdict).toBe('wrong');
    expect(line.text).toBe("You did better than you thought, here it is: « parce que c'est drôle ».");
  });

  it('says "couldn\'t spot" (never "you didn\'t") when nothing was found, with what to try', () => {
    const [yes] = calibrationLines(checks, { reason: 'yes' }, LIBRARY_ANSWER, NO_FIXES);
    expect(yes.verdict).toBe('unsure');
    expect(yes.text).toContain("I couldn't spot a reason");
    expect(yes.text).toContain('parce que');
    const [no] = calibrationLines(checks, { reason: 'no' }, LIBRARY_ANSWER, NO_FIXES);
    expect(no.verdict).toBe('right');
    expect(no.text).toMatch(/^Agreed, I couldn't spot a reason either/);
  });

  it('judges the mistakes check against the fixes the feedback lists', () => {
    const fixes = { quotes: ['des autres choses', 'mon mère'] };
    expect(calibrationLines(checks, { mistakes: 'yes' }, LIBRARY_ANSWER, fixes)[0]).toMatchObject({
      verdict: 'right',
      text: "Good ear: there's 2 things to fix, starting with « des autres choses ».",
    });
    expect(calibrationLines(checks, { mistakes: 'no' }, LIBRARY_ANSWER, fixes)[0].verdict).toBe('wrong');
    expect(calibrationLines(checks, { mistakes: 'no' }, LIBRARY_ANSWER, NO_FIXES)[0]).toMatchObject({ verdict: 'right' });
    expect(calibrationLines(checks, { mistakes: 'yes' }, LIBRARY_ANSWER, NO_FIXES)[0].verdict).toBe('wrong');
  });

  it('finds the time frame the question asked about', () => {
    const tense = predictionChecks(d('describe', ['past', 'future']));
    const [line] = calibrationLines(tense, { tense: 'yes' }, 'Demain je vais aller au parc.', NO_FIXES);
    expect(line.text).toBe('Right, you talked about the future: « je vais aller ».');
    const pastOnly: PredictionCheck[] = predictionChecks(d('describe', ['past']));
    expect(calibrationLines(pastOnly, { tense: 'yes' }, 'Demain je vais aller au parc.', NO_FIXES)[0].verdict).toBe('unsure');
  });

  it('finds a comparison', () => {
    const compare = predictionChecks(d('compare', ['present']));
    const [line] = calibrationLines(compare, { comparison: 'yes' }, 'La ville est plus bruyante que la campagne.', NO_FIXES);
    expect(line.quote).toBe('plus bruyante que');
  });

  it('keeps the order the checks were offered and skips unanswered ones', () => {
    const lines = calibrationLines(checks, { mistakes: 'no', reason: 'yes' }, LIBRARY_ANSWER, NO_FIXES);
    expect(lines.map((l) => l.id)).toEqual(['reason', 'mistakes']);
    expect(calibrationLines(checks, {}, LIBRARY_ANSWER, NO_FIXES)).toEqual([]);
  });

  it('never phrases a verdict as a mark or band', () => {
    const all = { reason: 'yes', linking: 'no', mistakes: 'no' } as const;
    for (const line of calibrationLines(checks, all, LIBRARY_ANSWER, { quotes: ['x'] })) {
      expect(claimMentionsMarkOrBand(line.text), line.text).toBe(false);
    }
  });
});

describe('fixesFromGroups', () => {
  it('collects the fix quotes in display order', () => {
    expect(
      fixesFromGroups([
        { heading: 'What you did well', tone: 'good', points: [{ kind: 'claim', text: 'good' }] },
        { heading: 'Fix these first', tone: 'bad', points: [{ kind: 'fix', quote: 'mon mère', correction: 'ma mère' }] },
      ] as never),
    ).toEqual({ quotes: ['mon mère'] });
  });
});
