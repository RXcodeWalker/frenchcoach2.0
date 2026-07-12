/**
 * ReviewStatus — kept fully separate from ScoringEnvelope, mirrors
 * teacherMark.ts's exact pattern. Never embedded in the same store. Persisted
 * as a sibling JSON file: data/envelopes/<attemptId>/review.json (review
 * targets one scoring attempt, not a whole session — a session can be scored
 * more than once via regrades, and each attempt gets its own review).
 */

import { z } from 'zod';

export interface ReviewStatus {
  attemptId: string;
  reviewed: boolean;
  reviewer?: string;
  reviewedAt?: string;
  disagreementResolved?: boolean;
  notes?: string;
}

export class ReviewStatusValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewStatusValidationError';
  }
}

const ReviewStatusSchema = z.object({
  attemptId: z.string(),
  reviewed: z.boolean(),
  reviewer: z.string().optional(),
  reviewedAt: z.string().optional(),
  disagreementResolved: z.boolean().optional(),
  notes: z.string().optional(),
});

export function parseReviewStatus(raw: unknown): ReviewStatus {
  const result = ReviewStatusSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ReviewStatusValidationError(`ReviewStatus failed schema validation: ${issues}`);
  }
  return result.data;
}
