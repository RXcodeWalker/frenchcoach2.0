import { describe, expect, it } from 'vitest';
import { summaryHeadline, type SummaryFacts } from '../sessionRecapCopy';
import { FIRST_ANSWER_ID, firstAnswerCopy, provesFirstAnswer } from '../firstAnswer';

const base: SummaryFacts = { topicLabel: 'School', answered: 3, avgScore: 7.4, words: 84, minutes: 6, mastered: false, topSkill: null };

describe('summaryHeadline', () => {
  it("follows the learner's own session, not a fixed cheer", () => {
    expect(summaryHeadline(base).title).toBe('A strong session');
    expect(summaryHeadline({ ...base, avgScore: 5.5 }).title).toBe('Solid practice');
    expect(summaryHeadline({ ...base, avgScore: 3 }).title).toBe('You showed up and spoke');
    expect(summaryHeadline({ ...base, avgScore: null }).title).toBe('Answers saved');
    expect(summaryHeadline({ ...base, answered: 0 }).title).toBe('Session ended early');
    expect(summaryHeadline({ ...base, mastered: true }).title).toBe('School mastered');
  });

  it('states only facts, and says so plainly when nothing was graded', () => {
    expect(summaryHeadline(base).line).toBe('School: 3 answers, 84 words spoken, 6 min.');
    expect(summaryHeadline({ ...base, answered: 1, words: 1, minutes: 0, topSkill: 'Fluency' }).line).toBe(
      'School: 1 answer, 1 word spoken, under a minute. Fluency moved up the most.',
    );
    expect(summaryHeadline({ ...base, avgScore: null }).line).toMatch(/Not graded this time/);
  });

  it('never uses the old generic cheer or emoji', () => {
    for (const s of [7.4, 5.5, 3, null]) {
      const { title, line } = summaryHeadline({ ...base, avgScore: s });
      expect(`${title} ${line}`).not.toMatch(/crush|\p{Extended_Pictographic}/iu);
    }
  });
});

describe('first answer', () => {
  it('is proven only by an empty history, a real marking and no earlier telling', () => {
    expect(provesFirstAnswer({ priorSessions: 0, firstsSeen: [], marked: true })).toBe(true);
    expect(provesFirstAnswer({ priorSessions: 1, firstsSeen: [], marked: true })).toBe(false);
    expect(provesFirstAnswer({ priorSessions: 0, firstsSeen: [], marked: false })).toBe(false);
    expect(provesFirstAnswer({ priorSessions: 0, firstsSeen: [FIRST_ANSWER_ID], marked: true })).toBe(false);
  });

  it('praises the act: no score, grade or level', () => {
    const c = firstAnswerCopy('Léa');
    expect(c.title).toBe('You did it, Léa!');
    expect(firstAnswerCopy(undefined).title).toBe('You did it!');
    expect(`${c.eyebrow} ${c.title} ${c.line}`).not.toMatch(/\b(score|grade|band|level)\b|\d/i);
  });
});
