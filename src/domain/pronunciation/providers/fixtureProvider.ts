/**
 * Canned-result test double. Mirrors
 * src/domain/igcse/stt/providers/fixtureProvider.ts.
 */

import type { PronunciationAssessor } from '../ports';
import type { PronunciationAssessment } from '../types';

export function createFixturePronunciationProvider(result: PronunciationAssessment): PronunciationAssessor {
  return async () => result;
}
