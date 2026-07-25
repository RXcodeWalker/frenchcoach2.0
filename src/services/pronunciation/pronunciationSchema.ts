/**
 * .strict() Zod schema for PronunciationAssessment, matching the TS type
 * field-for-field. Deliberately fixes the class of bug in
 * src/services/api/feedbackSchema.ts's PronunciationIssueSchema (which
 * silently drops ipaExpected/ipaHeard/drill and allows a looser severity
 * enum than its TS type declares) — but only for this new schema.
 * feedbackSchema.ts itself is untouched; it belongs to the separate,
 * out-of-scope general feedback panel.
 */

import { z } from 'zod';

const DrillHintSchema = z.object({
  hint: z.string(),
  repeatPhrase: z.string(),
}).strict();

const IssueSchema = z.object({
  word: z.string(),
  ipaExpected: z.string(),
  ipaHeard: z.string(),
  problem: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  drill: DrillHintSchema,
  expected: z.string().optional(),
  heard: z.string().optional(),
}).strict();

const WordResultSchema = z.object({
  word: z.string(),
  accuracyScore: z.number().min(0).max(100).nullable(),
  errorType: z.enum(['correct', 'mispronounced', 'skipped', 'extra']).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
}).strict();

const SubScoresSchema = z.object({
  accuracy: z.number().min(0).max(100),
  fluency: z.number().min(0).max(100),
  completeness: z.number().min(0).max(100),
}).strict();

export const PronunciationAssessmentSchema = z.object({
  score: z.number().min(0).max(100),
  transcript: z.string(),
  issues: z.array(IssueSchema),
  words: z.array(WordResultSchema),
  provider: z.enum(['azure', 'whisper-heuristic']),
  subScores: SubScoresSchema.nullable(),
}).strict();

export type ParsedPronunciationAssessment = z.infer<typeof PronunciationAssessmentSchema>;
