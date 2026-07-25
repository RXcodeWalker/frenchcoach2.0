/**
 * Injected pronunciation-assessment seam — a bare async function, matching
 * `Judge` in src/domain/igcse/judgement/types.ts exactly. This is what makes
 * "if S7 later adopts this, add one ScoreAttemptDeps.pronunciationAssessor
 * dependency" literally true rather than aspirational.
 */

import type { PronunciationAssessment, PronunciationAssessmentRequest } from './types';

export type PronunciationAssessor = (
  req: PronunciationAssessmentRequest,
) => Promise<PronunciationAssessment>;
