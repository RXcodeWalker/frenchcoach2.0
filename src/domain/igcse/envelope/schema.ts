/**
 * S4 ScoringEnvelope zod validation. Dispatches on versions.envelopeSchemaVersion
 * first (mirrors stt/schema.ts's schemaVersion dispatch) — an unknown version is
 * a hard error, never silently coerced; future bumps add a new arm + upcaster.
 */

import { z } from 'zod';
import { ENVELOPE_SCHEMA_VERSION } from './types';
import type { ScoringEnvelope } from './types';

export class ScoringEnvelopeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoringEnvelopeValidationError';
  }
}

const EvidenceSpanSchema = z.object({
  source: z.enum(['rolePlay', 'topic1', 'topic2']),
  quote: z.string(),
});

const ConfidenceSchema = z.literal('unassessed');

const VersionStackSchema = z.object({
  envelopeSchemaVersion: z.string(),
  rubricVersion: z.string(),
  scoringEngineVersion: z.string(),
  evidenceDetectorVersion: z.string(),
  scoringPromptVersion: z.string(),
  guardrailsVersion: z.literal('none'),
  calibrationVersion: z.literal('none'),
  gradeBoundarySeries: z.literal('none'),
});

const LlmProvenanceSchema = z.object({
  provider: z.enum(['gemini', 'groq']),
  model: z.string(),
  effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).optional(),
  thinking: z.object({ type: z.literal('adaptive') }).optional(),
  selfConsistencyRuns: z.literal(1),
  responseId: z.string().optional(),
});

const CriterionSchema = z.enum(['rolePlayTask', 'communication', 'qualityOfLanguage']);

const RolePlayTaskSchema = z.object({
  taskId: z.string(),
  mark: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  confidence: ConfidenceSchema,
  justification: z.string(),
  evidenceSpans: z.array(EvidenceSpanSchema),
});

const BandCriterionSchema = z.object({
  mark: z.number(),
  band: z.object({ min: z.number(), max: z.number(), label: z.string().nullable() }),
  confidence: ConfidenceSchema,
  justification: z.string(),
  evidenceSpans: z.array(EvidenceSpanSchema),
});

// Loosely validated — these are audit snapshots (evidenceProfileSnapshot,
// transcriptSnapshot) and stt, not re-derived contracts; ScoringEnvelope's own
// TypeScript types are the source of truth for their exact shape.
const ScoringEnvelopeSchema = z.object({
  attemptId: z.string(),
  sessionId: z.string(),
  scoredAt: z.string(),
  contentProvenance: z.enum(['original-practice', 'confidential-internal']),
  versions: VersionStackSchema,
  llm: LlmProvenanceSchema,
  stt: z.record(z.string(), z.unknown()),
  transcriptVersion: z.object({ schemaVersion: z.string(), assemblerVersion: z.string() }),
  transcriptConfidence: z.object({
    meanWordConfidence: z.number(),
    lowConfidenceSpanRatio: z.number(),
    lowConfidenceSpanCount: z.number(),
    userCorrected: z.boolean(),
  }),
  anchorsUsedByCriterion: z.record(CriterionSchema, z.array(z.string())),
  questionSetId: z.string().optional(),
  questionSetHash: z.string().optional(),
  rolePlayTasks: z.array(RolePlayTaskSchema),
  communication: BandCriterionSchema,
  qualityOfLanguage: BandCriterionSchema,
  total: z.number(),
  guardrailTriggers: z.array(z.string()),
  selfConsistencyOutcomes: z.object({
    agreement: z.literal('single_run'),
    rerunsRequested: z.literal(0),
  }),
  evidenceProfileSnapshot: z.record(z.string(), z.unknown()),
  transcriptSnapshot: z.record(z.string(), z.unknown()),
  regradedFrom: z.string().optional(),
});

/**
 * Parse and validate a raw value as a ScoringEnvelope. Throws
 * ScoringEnvelopeValidationError on an unknown envelopeSchemaVersion or on any
 * zod validation failure.
 */
export function parseScoringEnvelope(raw: unknown): ScoringEnvelope {
  if (typeof raw !== 'object' || raw === null || !('versions' in raw)) {
    throw new ScoringEnvelopeValidationError('Envelope is missing a versions block');
  }
  const versions = (raw as { versions: unknown }).versions;
  const envelopeSchemaVersion =
    typeof versions === 'object' && versions !== null && 'envelopeSchemaVersion' in versions
      ? (versions as { envelopeSchemaVersion: unknown }).envelopeSchemaVersion
      : undefined;
  if (envelopeSchemaVersion !== ENVELOPE_SCHEMA_VERSION) {
    throw new ScoringEnvelopeValidationError(
      `Unknown envelopeSchemaVersion "${String(envelopeSchemaVersion)}"; expected "${ENVELOPE_SCHEMA_VERSION}"`,
    );
  }

  const result = ScoringEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ScoringEnvelopeValidationError(`ScoringEnvelope failed schema validation: ${issues}`);
  }

  return result.data as unknown as ScoringEnvelope;
}
