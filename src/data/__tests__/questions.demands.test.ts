import { describe, it, expect } from 'vitest';
import { QUESTIONS, getQuestionById } from '../questions';
import { byQuestionId } from '../learn/demandsManifest';

describe('Question.demands hydration', () => {
  it('hydrates exactly the manifest-covered questions', () => {
    expect(QUESTIONS.filter(q => q.demands).length).toBe(428);
  });

  it('hydrated demands deep-equal the manifest entry for every question', () => {
    for (const q of QUESTIONS) {
      const expected = byQuestionId[q.id];
      if (expected) {
        expect(q.demands).toEqual(expected);
      } else {
        expect(q.demands).toBeUndefined();
      }
    }
  });

  it('every manifest key resolves to a real question', () => {
    for (const id of Object.keys(byQuestionId)) {
      expect(getQuestionById(id)).toBeDefined();
    }
  });
});
