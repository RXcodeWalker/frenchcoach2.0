import { describe, expect, it } from 'vitest';
import { classifyAnswer } from '../answerType';

describe('classifyAnswer', () => {
  it('maps authored answers onto their type and leaves unknowns empty', () => {
    expect(classifyAnswer('demain')).toBe('time');
    expect(classifyAnswer('à Paris')).toBe('place');
    expect(classifyAnswer('a paris')).toBe('place');
    expect(classifyAnswer('mon ami')).toBe('person');
    expect(classifyAnswer('deux')).toBe('number');
    expect(classifyAnswer('en bus')).toBe('manner');
    expect(classifyAnswer('il pleut')).toBe('reason');
    expect(classifyAnswer('le bleu')).toBe('choice');
    expect(classifyAnswer('un sandwich')).toBe('thing');
    expect(classifyAnswer('zzzz')).toBeNull();
  });
});
