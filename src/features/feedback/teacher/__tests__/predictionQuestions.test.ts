import { describe, it, expect } from 'vitest';
import { claimMentionsMarkOrBand } from '../../../../domain/examFeedback/shared/markClaimFilter';
import type { QuestionDemands } from '../../../../domain/learn/demand/types';
import { LONG_ANSWER_WORDS, calibrationLines, predictionChecks } from '../predictionQuestions';

type Demands = Pick<QuestionDemands, 'cognitiveDemand' | 'timeFrames'>;
const d = (cognitiveDemand: Demands['cognitiveDemand'], timeFrames: Demands['timeFrames']): Demands => ({ cognitiveDemand, timeFrames });
const ids = (demands: Demands | undefined) => predictionChecks(demands).map((c) => c.id);

describe('predictionChecks — derived from the question’s own demands', () => {
  it('asks for a reason when the question explains or justifies', () => {
    expect(ids(d('explain', ['present']))).toEqual(['reason', 'length']);
    expect(ids(d('justify', ['present']))).toEqual(['reason', 'length']);
    expect(predictionChecks(d('justify', ['present']))[0].prompt).toBe('Did you give a reason?');
  });

  it('asks about the tense only when the question looks at the past or future', () => {
    expect(ids(d('describe', ['past']))).toEqual(['tense', 'length']);
    expect(ids(d('describe', ['future']))).toEqual(['tense', 'length']);
    expect(ids(d('describe', ['present']))).toEqual(['length']);
    expect(ids(d('describe', ['conditional']))).toEqual(['length']);
  });

  it('names the frames the question asks about', () => {
    expect(predictionChecks(d('describe', ['past']))[0]).toMatchObject({ prompt: 'Did you talk about the past?', frames: ['past'] });
    expect(predictionChecks(d('describe', ['future']))[0].prompt).toBe('Did you talk about the future?');
    expect(predictionChecks(d('describe', ['past', 'future']))[0]).toMatchObject({
      prompt: 'Did you talk about the past or the future?',
      frames: ['past', 'future'],
    });
  });

  it('offers at most two, the more specific first; length is only the fallback', () => {
    expect(ids(d('explain', ['past']))).toEqual(['reason', 'tense']);
    expect(ids(d('hypothesize', ['present', 'future']))).toEqual(['tense', 'length']);
  });

  it('falls back to the length check for a question with no demands', () => {
    expect(ids(undefined)).toEqual(['length']);
    expect(predictionChecks(null)[0].prompt).toBe('Did you say more than 2 sentences?');
  });
});

describe('calibrationLines — only what was actually found', () => {
  const reasonChecks = predictionChecks(d('justify', ['present']));
  const tenseChecks = predictionChecks(d('describe', ['past', 'future']));
  const lengthChecks = predictionChecks(d('describe', ['present']));

  it('says no, but a reason is there → names the reason it found, quoted', () => {
    const [line] = calibrationLines(reasonChecks, { reason: 'no' }, "J'aime le foot parce que c'est drôle, et je joue souvent.");
    expect(line.text).toBe("You thought you didn't give a reason, but you did: « parce que c'est drôle ».");
    expect(line.quote).toBe("parce que c'est drôle");
  });

  it('says yes and a reason is there → a short confirmation with the quote', () => {
    const [line] = calibrationLines(reasonChecks, { reason: 'yes' }, 'Je mange des pommes car elles sont bonnes.');
    expect(line.text).toBe('You gave a reason: « car elles sont bonnes ».');
  });

  it('nothing found → no line, whichever way the learner answered (not detected ≠ absent)', () => {
    const transcript = "J'aime le foot. Je joue souvent avec mes amis.";
    expect(calibrationLines(reasonChecks, { reason: 'yes' }, transcript)).toEqual([]);
    expect(calibrationLines(reasonChecks, { reason: 'no' }, transcript)).toEqual([]);
    expect(calibrationLines(tenseChecks, { tense: 'yes' }, transcript)).toEqual([]);
    expect(calibrationLines(tenseChecks, { tense: 'no' }, transcript)).toEqual([]);
  });

  it('an unanswered check earns no line', () => {
    expect(calibrationLines(reasonChecks, {}, "parce que c'est drôle")).toEqual([]);
  });

  it('the tense check quotes the past or future it found', () => {
    const [past] = calibrationLines(tenseChecks, { tense: 'no' }, "Hier, j'ai mangé une pizza.");
    expect(past.text).toBe("You thought you didn't use the past, but you did: « j'ai mangé ».");
    const [future] = calibrationLines(tenseChecks, { tense: 'yes' }, 'Demain je vais aller au parc.');
    expect(future.text).toBe('You used the future: « je vais aller ».');
  });

  it('only looks for the frames the question asked about', () => {
    const pastOnly = predictionChecks(d('describe', ['past']));
    expect(calibrationLines(pastOnly, { tense: 'no' }, 'Demain je vais aller au parc.')).toEqual([]);
  });

  it('every marker line carries a quote that is verbatim in the answer', () => {
    const transcript = "Hier, j'ai mangé une pizza parce que c'était bon. Demain je vais aller au parc.";
    const checks = [...predictionChecks(d('explain', ['past']))];
    const lines = calibrationLines(checks, { reason: 'no', tense: 'no' }, transcript);
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line.quote).toBeTruthy();
      expect(transcript.includes(line.quote!)).toBe(true);
      expect(line.text).toContain(`« ${line.quote} »`);
    }
  });

  it('gives at most one line per check', () => {
    const lines = calibrationLines(reasonChecks, { reason: 'yes' }, 'parce que a, parce que b, car c');
    expect(lines).toHaveLength(1);
  });

  it('the length check speaks only for a clearly long answer, and states the word count', () => {
    const long = Array.from({ length: LONG_ANSWER_WORDS }, () => 'mot').join(' ');
    const [no] = calibrationLines(lengthChecks, { length: 'no' }, long);
    expect(no.text).toBe(`You thought it was two sentences or fewer, but you said ${LONG_ANSWER_WORDS} words.`);
    expect(no.quote).toBeUndefined();
    const [yes] = calibrationLines(lengthChecks, { length: 'yes' }, long);
    expect(yes.text).toBe(`You said ${LONG_ANSWER_WORDS} words.`);
    const short = Array.from({ length: LONG_ANSWER_WORDS - 1 }, () => 'mot').join(' ');
    expect(calibrationLines(lengthChecks, { length: 'yes' }, short)).toEqual([]);
    expect(calibrationLines(lengthChecks, { length: 'no' }, short)).toEqual([]);
  });

  it('never reads as a mark, band or grade', () => {
    const transcript = `Hier, j'ai mangé une pizza parce que c'était bon. ${Array.from({ length: 40 }, () => 'mot').join(' ')}`;
    const lines = calibrationLines(
      [...predictionChecks(d('explain', ['past'])), ...lengthChecks],
      { reason: 'no', tense: 'yes', length: 'no' },
      transcript,
    );
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(claimMentionsMarkOrBand(line.text), line.text).toBe(false);
    for (const check of [...reasonChecks, ...tenseChecks, ...lengthChecks]) expect(claimMentionsMarkOrBand(check.prompt)).toBe(false);
  });
});
