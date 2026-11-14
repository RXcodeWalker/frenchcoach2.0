import { describe, expect, it } from 'vitest';
import { NEWS_EDITIONS } from '../../../data/news';
import { featuredSegment, practiceSegments, showScore, weekdayOf } from '../show/showPlan';
import { segmentTurns } from '../show/segmentPrompts';
import { segmentQuestion } from '../show/segmentFeedback';
import { wordsUsed } from '../show/wordsUsed';

describe('showPlan', () => {
  it('features a segment by weekday, with unbuilt segments standing in for a built one', () => {
    // 2026-11-16 is a Monday.
    expect(weekdayOf('2026-11-16')).toBe(1);
    expect(featuredSegment('2026-11-16')).toBe('interview'); // Mon
    expect(featuredSegment('2026-11-17')).toBe('debate'); // Tue
    expect(featuredSegment('2026-11-18')).toBe('interview'); // Wed: journalist, not built yet
    expect(featuredSegment('2026-11-19')).toBe('interview'); // Thu
    expect(featuredSegment('2026-11-20')).toBe('debate'); // Fri: predict, not built yet
    expect(featuredSegment('2026-11-21')).toBe('debate'); // Sat
    expect(featuredSegment('2026-11-22')).toBe('interview'); // Sun
  });

  it('offers the other segment as practice', () => {
    expect(practiceSegments('interview')).toEqual(['debate']);
    expect(practiceSegments('debate')).toEqual(['interview']);
  });

  it('scores taking part, never the French', () => {
    expect(showScore(true, 3, 3)).toBe(10);
    expect(showScore(false, 3, 3)).toBe(7);
    expect(showScore(true, 0, 3)).toBe(3);
    expect(showScore(false, 1, 2)).toBe(3.5);
  });
});

describe('segment turns and feedback question', () => {
  const lvl = NEWS_EDITIONS[0].levels.b1;

  it('builds three interview turns and two debate turns, each with its model answer', () => {
    const interview = segmentTurns(lvl, 'interview');
    expect(interview.map(t => t.fr)).toEqual(lvl.interview.questions.map(q => q.fr));
    expect(interview.every(t => t.model.length > 0 && t.speak)).toBe(true);
    const debate = segmentTurns(lvl, 'debate');
    expect(debate.map(t => t.model)).toEqual([lvl.debate.for.model, lvl.debate.against.model]);
  });

  it('puts the scenario and prompts in the question text, within the backend limit', () => {
    for (const e of NEWS_EDITIONS) {
      for (const level of ['a2', 'b1', 'b2'] as const) {
        const q = segmentQuestion(e, level, 'interview');
        expect(q.text).toContain(e.levels[level].interview.role.fr);
        expect(q.text.length).toBeLessThanOrEqual(2000);
        expect(segmentQuestion(e, level, 'debate').text).toContain(e.levels[level].debate.motion.fr);
      }
    }
  });
});

describe('wordsUsed', () => {
  it('marks the glossary words the learner reused', () => {
    const words = wordsUsed([{ fr: 'ruches', en: 'hives' }, { fr: 'miel', en: 'honey' }], ['Il y a une ruche sur le toit.']);
    expect(words.map(w => w.used)).toEqual([true, false]);
  });
});
