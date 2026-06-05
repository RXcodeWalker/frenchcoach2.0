import { describe, it, expect } from 'vitest';
import { getQuestionsPracticingSkill, getSkillLabel } from '../skillGraph';

describe('getQuestionsPracticingSkill', () => {
  it('returns questions whose grammarFocus includes the skill', () => {
    const questions = getQuestionsPracticingSkill('subjunctive');
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.modelAnswer.toLowerCase()).toMatch(/il faut que|bien que|pour que|avant que|à moins que/);
    }
  });

  it('returns empty array for unknown skill', () => {
    expect(getQuestionsPracticingSkill('not_a_real_skill')).toEqual([]);
  });
});

describe('getSkillLabel', () => {
  it('resolves diagnostic skill names', () => {
    expect(getSkillLabel('subjunctive')).toBe('Subjunctive');
  });
});
