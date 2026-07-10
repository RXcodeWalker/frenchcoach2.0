/**
 * S4 TeacherMark / TeacherMarkSet — kept fully separate from ScoringEnvelope.
 * Never embedded in the same store. Persisted as a sibling JSON file:
 * data/sessions/<id>/teacher-marks.json, or <scenario>.teacher-marks.json
 * next to fixture goldens.
 */

import { z } from 'zod';

export type Criterion = 'rolePlayTask' | 'communication' | 'qualityOfLanguage';

export interface TeacherMark {
  criterion: Criterion;
  taskId?: string;
  mark: number;
  comment?: string;
}

export interface TeacherMarkSet {
  sessionId: string;
  markedBy: string;
  markedAt: string;
  marks: TeacherMark[];
  pronunciationMovedQol?: { moved: boolean; note?: string };
}

export class TeacherMarkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TeacherMarkValidationError';
  }
}

const TeacherMarkSchema = z.object({
  criterion: z.enum(['rolePlayTask', 'communication', 'qualityOfLanguage']),
  taskId: z.string().optional(),
  mark: z.number(),
  comment: z.string().optional(),
});

const TeacherMarkSetSchema = z.object({
  sessionId: z.string(),
  markedBy: z.string(),
  markedAt: z.string(),
  marks: z.array(TeacherMarkSchema),
  pronunciationMovedQol: z.object({ moved: z.boolean(), note: z.string().optional() }).optional(),
});

export function parseTeacherMarkSet(raw: unknown): TeacherMarkSet {
  const result = TeacherMarkSetSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new TeacherMarkValidationError(`TeacherMarkSet failed schema validation: ${issues}`);
  }
  return result.data;
}
