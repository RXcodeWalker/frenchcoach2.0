/**
 * .passthrough() Zod schema for PronunciationAssessment, matching the TS type
 * field-for-field (plus tolerance for additive fields a newer backend may
 * send). Deliberately fixes the class of bug in
 * src/services/api/feedbackSchema.ts's PronunciationIssueSchema (which
 * silently drops ipaExpected/ipaHeard/drill and allows a looser severity
 * enum than its TS type declares) — but only for this new schema.
 * feedbackSchema.ts itself is untouched; it belongs to the separate,
 * out-of-scope general feedback panel.
 *
 * .passthrough(), not .strict(): frontend (Vercel) and backend (Render)
 * deploy independently. A .strict() schema hard-fails every pronunciation
 * call for users on an old bundle the moment the backend ships a new
 * response field. This file must deploy with .passthrough() BEFORE any
 * backend field addition — see accent-analyzer plan §Context, "Mandatory
 * sequencing".
 */

import { z } from 'zod';

const DrillHintSchema = z.object({
  hint: z.string(),
  repeatPhrase: z.string(),
}).passthrough();

const IssueSchema = z.object({
  word: z.string(),
  ipaExpected: z.string(),
  ipaHeard: z.string(),
  problem: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  drill: DrillHintSchema,
  expected: z.string().optional(),
  heard: z.string().nullable().optional(),
}).passthrough();

const PhonemeSchema = z.object({
  phoneme: z.string(),
  accuracyScore: z.number().min(0).max(100).nullable(),
}).passthrough();

const WordResultSchema = z.object({
  word: z.string(),
  accuracyScore: z.number().min(0).max(100).nullable(),
  errorType: z.enum(['correct', 'mispronounced', 'skipped', 'extra']).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  phonemes: z.array(PhonemeSchema).nullable().optional(),
  offsetMs: z.number().nullable().optional(),
  durationMs: z.number().nullable().optional(),
  nearChunkBoundary: z.boolean().nullable().optional(),
}).passthrough();

const SubScoresSchema = z.object({
  accuracy: z.number().min(0).max(100),
  fluency: z.number().min(0).max(100),
  completeness: z.number().min(0).max(100).nullable(),
  prosody: z.number().min(0).max(100).nullable(),
}).passthrough();

const RhythmMetricsSchema = z.object({
  speechRateWpm: z.number().nullable(),
  articulationRateSyllPerSec: z.number().nullable(),
  pauseCount: z.number().nullable(),
  longestPauseMs: z.number().nullable(),
  pauseRatio: z.number().nullable(),
  rhythmRegularity: z.number().nullable(),
  finalSyllableLengthening: z.boolean().nullable(),
}).passthrough();

const PhonologicalFindingSchema = z.object({
  category: z.enum(['liaison', 'nasalVowel', 'frenchR', 'silentLetter', 'elision', 'vowelQuality']),
  word: z.string(),
  explanation: z.string(),
  confidence: z.number().min(0).max(1),
  provenance: z.enum(['authoritative', 'derived', 'inferred']),
}).passthrough();

const AudioQualitySchema = z.object({
  snrDb: z.number().nullable(),
  durationMs: z.number().nullable(),
  recognitionStatus: z.string().nullable(),
  clipped: z.boolean(),
}).passthrough();

const ConfidenceSchema = z.object({
  overall: z.number().min(0).max(1),
  basis: z.array(z.string()),
  transcriptAgreement: z.number().min(0).max(1).nullable(),
}).passthrough();

const CoachingSchema = z.object({
  summary: z.string(),
  topPriority: z.string(),
  tips: z.array(z.string()),
  grounded: z.boolean(),
}).passthrough();

export const PronunciationAssessmentSchema = z.object({
  score: z.number().min(0).max(100).nullable(),
  transcript: z.string(),
  issues: z.array(IssueSchema),
  words: z.array(WordResultSchema),
  provider: z.enum(['azure', 'whisper-heuristic']),
  subScores: SubScoresSchema.nullable(),
  couldNotAssess: z.boolean().default(false),
  couldNotAssessReason: z.string().nullable().default(null),
  // ── Phase 1 additions — all optional, so a v3-initial-shape cached
  // response (pre-Phase-1) still parses (forward compatibility, §Context).
  mode: z.enum(['scripted', 'freeform']).optional(),
  locale: z.string().optional(),
  assessorVersion: z.string().optional(),
  chunkCount: z.number().optional(),
  chunksFailed: z.number().optional(),
  prosodyMetrics: RhythmMetricsSchema.nullable().optional(),
  phonologicalFindings: z.array(PhonologicalFindingSchema).optional(),
  audioQuality: AudioQualitySchema.nullable().optional(),
  confidence: ConfidenceSchema.nullable().optional(),
  coaching: CoachingSchema.nullable().optional(),
}).passthrough();

export type ParsedPronunciationAssessment = z.infer<typeof PronunciationAssessmentSchema>;
