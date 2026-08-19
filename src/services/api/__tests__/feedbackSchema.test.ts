// Stage 8 (docs §9.2/§15): backend responses gain four optional fields
// (answered_the_question, demands_met, demands_missed, difficulty_fit) when
// demands were resolved server-side. BackendFeedbackSchema must accept
// responses both with and without them — an old backend or an unresolved-
// demands request must not fail validation.

import { describe, it, expect } from 'vitest';
import { validateBackendFeedback } from '../feedbackSchema';

const BASE_RESPONSE = {
  scores: { comm: 7, know: 6, acc: 8 },
  cefrLevel: 'B1',
};

describe('BackendFeedbackSchema: Learn demand response fields', () => {
  it('validates a response with none of the four new fields (legacy/unresolved-demands case)', () => {
    const result = validateBackendFeedback(BASE_RESPONSE, 'test');
    expect(result.scores).toEqual(BASE_RESPONSE.scores);
  });

  it('validates a response with all four new fields present', () => {
    const raw = {
      ...BASE_RESPONSE,
      answered_the_question: true,
      demands_met: ['justification'],
      demands_missed: ['comparison'],
      difficulty_fit: 'right level',
    };
    const result = validateBackendFeedback(raw, 'test');
    expect(result.answered_the_question).toBe(true);
    expect(result.demands_met).toEqual(['justification']);
    expect(result.demands_missed).toEqual(['comparison']);
    expect(result.difficulty_fit).toBe('right level');
  });

  it('rejects an invalid difficulty_fit value rather than silently accepting it', () => {
    const raw = { ...BASE_RESPONSE, difficulty_fit: 'impossible' };
    expect(() => validateBackendFeedback(raw, 'test')).toThrow();
  });
});
