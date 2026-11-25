import { describe, expect, it } from 'vitest';
import { buildingNote, placementBravo, placementNote, surveyNote, thanksNote } from '../coachVoice';

const allLines = (name?: string) => [
  surveyNote('exam_board'),
  surveyNote('exam_date'),
  surveyNote('goal_intent'),
  buildingNote(name),
  thanksNote(name),
  ...[0, 1, 2, 3, 4].map(i => placementNote(i, 5)),
  placementBravo(name, 5, 5),
];

describe('coachVoice', () => {
  it('says thank you for choosing the coach, by name when there is one', () => {
    expect(thanksNote('Léa')).toMatch(/^Thank you for choosing me, Léa\./);
    expect(thanksNote(undefined)).toMatch(/^Thank you for choosing me\./);
    expect(thanksNote('  ')).toMatch(/^Thank you for choosing me\./);
    expect(buildingNote('Léa')).toMatch(/^Merci, Léa\./);
    expect(buildingNote(null)).toMatch(/^Merci\./);
    expect(placementBravo('Léa', 5, 5)).toMatch(/^Bravo, Léa!/);
    expect(placementBravo(undefined, 5, 5)).toMatch(/^Bravo!/);
  });

  it('promises no mark, grade, band, level or result, and never predicts or guarantees', () => {
    for (const line of allLines('Léa')) {
      expect(line).not.toMatch(/\b(grade|band|predict|guarantee|score|pass|fluent|ace|top)\b/i);
      expect(line).not.toMatch(/\byou('| wi)ll (get|reach|pass|be fluent)\b/i);
    }
  });

  it('uses no emoji and no digits beyond the counts it was given', () => {
    for (const line of allLines('Léa')) {
      expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(line.replace(/5 of 5/, '')).not.toMatch(/\d/);
    }
  });

  it('praises effort, never how well the learner spoke', () => {
    for (const line of allLines()) {
      expect(line).not.toMatch(/\b(perfect|excellent|brilliant|correct|well done|great (french|accent|answer))\b/i);
    }
  });

  it('the placement note reassures first, then counts down honestly', () => {
    expect(placementNote(0, 5)).toMatch(/no marks, no pressure/i);
    const notes = [0, 1, 2, 3, 4].map(i => placementNote(i, 5));
    expect(new Set(notes).size).toBe(5); // a different line each time, so it never feels canned
    expect(placementNote(3, 5)).toMatch(/this one and one more/i);
    expect(placementNote(4, 5)).toMatch(/last one/i);
    expect(placementNote(0, 3)).toMatch(/A few/); // a shorter check still reads right
  });

  it('every line is a short, plain sentence set (no wall of text on a phone)', () => {
    for (const line of allLines('Léa')) expect(line.length).toBeLessThanOrEqual(220);
  });
});
