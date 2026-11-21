import { describe, expect, it } from 'vitest';
import { PATH_STEPS, buildSteps, daysToGoLabel, daysUntil, goalName } from '../planSummary';

const TODAY = '2026-11-21';

describe('planSummary', () => {
  it('counts whole local days to the exam', () => {
    expect(daysUntil('2026-11-21', TODAY)).toBe(0);
    expect(daysUntil('2026-11-22', TODAY)).toBe(1);
    expect(daysUntil('2027-02-23', TODAY)).toBe(94);
    expect(daysUntil('2026-11-20', TODAY)).toBe(-1);
    expect(daysUntil(undefined, TODAY)).toBeNull();
    expect(daysUntil('not a date', TODAY)).toBeNull();
  });

  it('words the countdown plainly', () => {
    expect(daysToGoLabel(0)).toBe('Your exam is today');
    expect(daysToGoLabel(1)).toBe('1 day to go');
    expect(daysToGoLabel(94)).toBe('94 days to go');
  });

  it('names every goal type the survey can save', () => {
    expect(goalName('igcse')).toBe('IGCSE French speaking');
    expect(goalName('gcse')).toBe('GCSE French speaking');
    expect(goalName('delf')).toBe('DELF / DALF preparation');
    expect(goalName('conversation_fluency')).toBe('Conversational fluency');
    expect(goalName('general_speaking')).toBe('Everyday French speaking');
    expect(goalName(undefined)).toBe('Everyday French speaking');
  });

  it('builds the four steps from the learner\'s own answers', () => {
    const steps = buildSteps({ goalType: 'igcse', examDate: '2027-02-23', today: TODAY });
    expect(steps.map(s => s.id)).toEqual(['goal', 'rhythm', 'coach', 'mission']);
    expect(steps[0].done).toBe('Goal set: IGCSE French speaking');
    expect(steps[1].working).toBe('Counting down to your exam');
    expect(steps[1].done).toBe('94 days to go');
  });

  it('with no exam date, claims no deadline', () => {
    const steps = buildSteps({ goalType: 'general_speaking', examDate: undefined, today: TODAY });
    expect(steps[1].working).toBe('Choosing a steady rhythm');
    expect(steps[1].done).not.toMatch(/\d/);
  });

  it('a date already past is treated as no date (never "-3 days to go")', () => {
    const steps = buildSteps({ goalType: 'igcse', examDate: '2026-11-01', today: TODAY });
    expect(steps[1].done).not.toMatch(/-?\d+ days? to go/);
  });

  it('promises no mark, grade or level', () => {
    const text = [
      ...buildSteps({ goalType: 'igcse', examDate: '2027-02-23', today: TODAY }).flatMap(s => [s.working, s.done]),
      ...PATH_STEPS.flatMap(p => [p.title, p.detail]),
    ].join(' ');
    expect(text).not.toMatch(/\b(grade|band|predict|guarantee|score)\b/i);
  });

  it('the road ahead is three numbered steps starting with the level check', () => {
    expect(PATH_STEPS.map(p => p.n)).toEqual([1, 2, 3]);
    expect(PATH_STEPS[0].title).toBe('Find your level');
  });
});
