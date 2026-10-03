import { describe, it, expect } from 'vitest';
import { claimMentionsMarkOrBand } from '../markClaimFilter';

const DROP: [string, string][] = [
  ['band word', 'This answer sits in a higher band.'],
  ['bands', 'Between the two bands the gap is accuracy.'],
  ['grade', 'A solid grade for this answer.'],
  ['grades', 'Both grades depend on tense control.'],
  ['mark', 'This would earn a good mark.'],
  ['marks', 'You are losing marks on agreement.'],
  ['score', 'Your score is held back by tense errors.'],
  ['scores', 'These scores rise with accuracy.'],
  ['Satisfactory', 'Satisfactory use of vocabulary.'],
  ['Core-Secure', 'Core-Secure control of the present tense.'],
  ['Core — Secure', 'Core — Secure control of the present tense.'],
  ['Extended-High', 'Extended-High range of structures.'],
  ['Extended band', 'You are working at the Extended band.'],
  ['Foundation tier', 'A Foundation tier answer.'],
  ['Higher tier', 'This reads like a Higher tier answer.'],
  ['N/N', 'About 12/15 for this.'],
  ['out of N', 'That is 3 out of 5 for accuracy.'],
  ['French sur N', 'Un 8 sur 10 pour cette réponse.'],
  ['band range', 'This sits at 10–12 for range.'],
  ['band range hyphen', 'Aim for 13-15 next time.'],
  ['digit then mark', 'You would get 2 marks here.'],
  ['mark then digit', 'Mark 2 is available for this task.'],
  ['French note beside a number', 'Une note de 12 pour cette réponse.'],
  ['note then digit', 'Note: 14 for fluency.'],
  ['A*', 'This is an A* answer.'],
  ['grade letter', 'Grade B territory.'],
];

const KEEP: [string, string][] = [
  ['good in prose', 'Good use of the perfect tense here.'],
  ['very good in prose', 'A very good attempt at giving a reason.'],
  ['weak in prose', 'The connective is a little weak; try "parce que".'],
  ['poor in prose', 'Poor timing on the verb ending here.'],
  ['level (FP removed)', 'At this level of detail you could add a reason.'],
  ['sentence-level', 'Work on sentence-level accuracy.'],
  ['Extended at sentence start', 'Extended answers are easier with a reason.'],
  ['Core at sentence start', 'Core vocabulary is secure here.'],
  ['question mark', 'Raise your voice at the question mark.'],
  ['plain count', 'Try adding 2-3 sentences with a reason.'],
  ['minutes range', 'Practise for 5-10 minutes a day.'],
  ['words range', 'Aim for 20-30 words.'],
  ['big numbers', 'You used the year 2019-2020 correctly.'],
  ['marking verb', 'You are marking the plural correctly.'],
  ['no digits', 'Giving a reason with "parce que" makes the answer fuller.'],
];

describe('claimMentionsMarkOrBand — drop table', () => {
  it.each(DROP)('drops: %s', (_label, claim) => {
    expect(claimMentionsMarkOrBand(claim)).toBe(true);
  });
});

describe('claimMentionsMarkOrBand — keep table', () => {
  it.each(KEEP)('keeps: %s', (_label, claim) => {
    expect(claimMentionsMarkOrBand(claim)).toBe(false);
  });
});
